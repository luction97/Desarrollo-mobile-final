import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSinRed } from '../../src/hooks/useSinRed';
import { useHorarioActual } from '../../src/hooks/useHorarioActual';
import { Badge, Button, Chip, Screen, StateView, Surface, Text, uiLayout } from '../../src/components/ui';
import { CodigoQr } from '../../src/components/CodigoQr';
import { DialogoAviso } from '../../src/components/DialogoAviso';
import { useTheme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { cancelarReserva, esErrorSesion, reservasGuardadas, sincronizarReservas } from '../../src/services/reservas';
import type { ReservaGuardada } from '../../src/modelos/reservas';
import { precioLegible } from '../../src/utils/dinero';
import { fechaLegible, instanteTurno } from '../../src/utils/fechas';
import { permisosDe } from '../../src/utils/permisos';
import { etiquetasReserva } from '../../src/utils/etiquetas';

export default function MisReservasScreen() {
  const { colors } = useTheme();
  const { usuario, cargando: cargandoSesion } = useAuth();
  const { puedeReservar } = permisosDe(usuario);
  const router = useRouter();
  const sinRed = useSinRed();
  const ahora = useHorarioActual();
  const [datos, setDatos] = useState<ReservaGuardada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [local, setLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasadas, setPasadas] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [confirmacion, setConfirmacion] = useState<ReservaGuardada | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const generacion = useRef(0);
  const ocupado = useRef(false);

  const cargar = useCallback(async () => {
    if (!usuario || !puedeReservar) { setDatos([]); setCargando(false); return; }
    const version = ++generacion.current;
    setError(null);
    setCargando(true);
    const guardadas = await reservasGuardadas(usuario.id).catch(() => []);
    if (version !== generacion.current) return;
    setDatos(guardadas); setLocal(true); setCargando(false);
    try {
      if (sinRed) return;
      const vigentes = () => version === generacion.current;
      const actuales = await sincronizarReservas(usuario.id, vigentes);
      if (!vigentes()) return;
      setDatos(actuales.datos);
      setLocal(!actuales.actualizada);
      if (!actuales.guardadas) setError('No pudimos actualizar la copia sin conexión.');
      if (actuales.cambios.length) {
        setMensaje(actuales.cambios.map(d => [
          d.espacio?.nombre ?? 'Cancha',
          d.turno && fechaLegible(d.turno.fecha) + ' · ' + d.turno.inicio,
          'Cancelada',
        ].filter(Boolean).join(' · ')).join('\n'));
      }
    } catch (e) {
      if (version === generacion.current && !esErrorSesion(e)) setError(e instanceof Error ? e.message : 'No se pudieron actualizar las reservas.');
    }
  }, [usuario?.id, puedeReservar, sinRed]);

  useFocusEffect(useCallback(() => {
    void cargar();
    const listener = AppState.addEventListener('change', estado => {
      if (estado === 'active') void cargar();
    });
    return () => { generacion.current++; listener.remove(); };
  }, [cargar]));

  const cancelar = async () => {
    if (!puedeReservar || !confirmacion || ocupado.current || local || sinRed) return;
    if (Date.now() > Date.parse(confirmacion.reserva.cancelableHasta)) {
      setConfirmacion(null);
      setMensaje('El plazo para cancelar terminó. Contactá al encargado.');
      return;
    }
    ocupado.current = true; setCancelando(true);
    try {
      const resultado = await cancelarReserva(confirmacion);
      setDatos(prev => prev.map(d => d.reserva.id === resultado.reserva.id ? { ...d, reserva: resultado.reserva } : d));
      setConfirmacion(null);
      setMensaje(resultado.guardadaLocalmente ? 'La reserva fue cancelada.' : 'Reserva cancelada. No pudimos actualizar la copia del teléfono.');
    } catch (e) { setConfirmacion(null); setMensaje(e instanceof Error ? e.message : 'No se pudo cancelar la reserva.'); }
    finally { ocupado.current = false; setCancelando(false); }
  };

  if (cargandoSesion || cargando) return <Screen topInset><StateView><ActivityIndicator color={colors.primary} /><Text tone="muted">Cargando reservas...</Text></StateView></Screen>;
  if (!usuario) return <Screen topInset><StateView>
    <Text variant="title">Tus reservas y códigos QR</Text>
    <Button title="Iniciar sesión" onPress={() => router.push({ pathname: '/login', params: { volverA: 'reservas' } })} />
  </StateView></Screen>;
  if (!puedeReservar) return <Screen topInset><StateView>
    <Text>Consultá las reservas del complejo en la agenda.</Text>
    <Button title="Ver agenda" onPress={() => router.replace('/agenda')} />
  </StateView></Screen>;

  const esProxima = (d: ReservaGuardada) => d.reserva.estado === 'confirmada' &&
    (!d.turno || new Date(instanteTurno(d.turno.fecha, d.turno.inicio).getTime() + 60 * 60 * 1000) > ahora);
  const futuras = datos.filter(d => d.reserva.usuarioId === usuario.id && d.reserva.estado === 'confirmada' &&
    d.turno && instanteTurno(d.turno.fecha, d.turno.inicio) > ahora).length;
  const visibles = datos.filter(d => d.reserva.usuarioId === usuario.id && (pasadas ? !esProxima(d) : esProxima(d))).sort((a, b) =>
    (pasadas ? -1 : 1) * a.reserva.cancelableHasta.localeCompare(b.reserva.cancelableHasta));

  return <Screen topInset>
    <View style={uiLayout.inset}>
      <Text variant="title" accessibilityRole="header">Mis reservas</Text>
      <View style={uiLayout.row}>
        <Chip selected={!pasadas} onPress={() => setPasadas(false)}>Próximas</Chip>
        <Chip selected={pasadas} onPress={() => setPasadas(true)}>Pasadas</Chip>
        <Button size="sm" variant="ghost" title="Actualizar" onPress={cargar} />
      </View>
      {!pasadas && futuras > 0 && <Text variant="label" tone="muted">
        {futuras} {futuras === 1 ? 'reserva futura confirmada' : 'reservas futuras confirmadas'}
      </Text>}
      {local && <Text variant="label" tone="warning" accessibilityLiveRegion="polite">Reservas guardadas · Conectate para actualizarlas</Text>}
      {error && <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>}
    </View>
    <FlatList data={visibles} keyExtractor={d => d.reserva.id} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={uiLayout.listContent}
      ListEmptyComponent={<StateView><Text tone="muted">{local ? 'No hay reservas guardadas en este teléfono.' : pasadas ? 'No tenés reservas pasadas.' : 'No tenés reservas próximas.'}</Text>
        <Button title="Ver disponibilidad" variant="secondary" onPress={() => router.push('/(tabs)')} /></StateView>}
      renderItem={({ item }) => <Surface style={uiLayout.section}>
        <View style={uiLayout.row}>
          <View style={uiLayout.grow}>
            <Text variant="subtitle">{item.espacio?.nombre ?? 'Espacio no disponible'}</Text>
            <Text tone="muted">{item.espacio?.complejo}</Text>
          </View>
          <Badge variant={item.reserva.estado === 'confirmada' ? 'success' : 'neutral'}>{etiquetasReserva[item.reserva.estado]}</Badge>
        </View>
        {item.turno && <>
          <Text numeric variant="action">{fechaLegible(item.turno.fecha)} · {item.turno.inicio}–{item.turno.fin}</Text>
          {item.turno.precio !== null && <Text numeric variant="action" tone="primary">Tarifa consultada: {precioLegible(item.turno.precio)} · Se paga en el lugar</Text>}
        </>}
        {esProxima(item) && <CodigoQr value={item.reserva.codigoQr} />}
        {esProxima(item) && <Text selectable variant="label">Código: {item.reserva.codigoQr}</Text>}
        <Text variant="label" tone="muted">Personas: {item.reserva.cantidadPersonas}</Text>
        {esProxima(item) && (ahora <= new Date(item.reserva.cancelableHasta)
          ? <Button title="Cancelar reserva" variant="destructive" disabled={local || cancelando} onPress={() => setConfirmacion(item)} />
          : <Text tone="muted">Contactá al encargado para cancelar.</Text>)}
        {item.espacio && <Button title="Cómo llegar" variant="secondary" onPress={() => router.push({ pathname: '/espacio/[id]', params: { id: item.espacio!.id } })} />}
      </Surface>} />
    {confirmacion && !cancelando && <DialogoAviso titulo="Cancelar reserva" mensaje="¿Querés cancelar este turno?" accionPrincipal="Cancelar reserva" accionSecundaria="Volver"
      destructivo onCerrar={() => setConfirmacion(null)} onConfirmar={cancelar} />}
    {cancelando && <StateView><ActivityIndicator color={colors.primary} /></StateView>}
    {mensaje && <DialogoAviso titulo="Mis reservas" mensaje={mensaje} accionPrincipal="Entendido" onCerrar={() => setMensaje(null)} onConfirmar={() => setMensaje(null)} />}
  </Screen>;
}
