import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Network from 'expo-network';
import { Badge, Button, Chip, Screen, StateView, Surface, Text, uiLayout } from '../../src/components/ui';
import { CodigoQr } from '../../src/components/CodigoQr';
import { DialogoAviso } from '../../src/components/DialogoAviso';
import { useTheme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { cancelarReserva, esErrorSesion, reservasGuardadas, sincronizarReservas } from '../../src/services/reservas';
import type { ReservaGuardada } from '../../src/modelos/reservas';
import { precioLegible } from '../../src/utils/dinero';
import { fechaLegible, instanteTurno } from '../../src/utils/fechas';

export default function MisReservasScreen() {
  const { colors } = useTheme();
  const { usuario, cargando: cargandoSesion } = useAuth();
  const router = useRouter();
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
    if (!usuario) { setDatos([]); setCargando(false); return; }
    const version = ++generacion.current;
    setError(null);
    setCargando(true);
    const guardadas = await reservasGuardadas(usuario.id).catch(() => []);
    if (version !== generacion.current) return;
    setDatos(guardadas); setLocal(true); setCargando(false);
    try {
      const red = await Network.getNetworkStateAsync();
      if (red.isConnected === false) return;
      const actuales = await sincronizarReservas(usuario.id);
      if (version === generacion.current) { setDatos(actuales); setLocal(false); }
    } catch (e) {
      if (version === generacion.current && !esErrorSesion(e)) setError(e instanceof Error ? e.message : 'No se pudieron actualizar las reservas.');
    }
  }, [usuario?.id]);

  useFocusEffect(useCallback(() => {
    void cargar();
    return () => { generacion.current++; };
  }, [cargar]));

  const cancelar = async () => {
    if (!confirmacion || ocupado.current) return;
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

  const ahora = new Date();
  const esProxima = (d: ReservaGuardada) => d.reserva.estado === 'confirmada' &&
    (!d.turno || new Date(instanteTurno(d.turno.fecha, d.turno.inicio).getTime() + 60 * 60 * 1000) > ahora);
  const visibles = datos.filter(d => d.reserva.usuarioId === usuario.id && (pasadas ? !esProxima(d) : esProxima(d))).sort((a, b) =>
    (pasadas ? -1 : 1) * a.reserva.cancelableHasta.localeCompare(b.reserva.cancelableHasta));

  return <Screen topInset>
    <View style={uiLayout.inset}>
      <Text variant="title" accessibilityRole="header">Mis Reservas</Text>
      <View style={uiLayout.row}>
        <Chip selected={!pasadas} onPress={() => setPasadas(false)}>Próximas</Chip>
        <Chip selected={pasadas} onPress={() => setPasadas(true)}>Pasadas</Chip>
        <Button size="sm" variant="ghost" title="Actualizar" onPress={cargar} />
      </View>
      {local && <Text variant="label" tone="warning" accessibilityLiveRegion="polite">Copia del teléfono · El estado puede haber cambiado</Text>}
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
          <Badge variant={item.reserva.estado === 'confirmada' ? 'success' : 'neutral'}>{item.reserva.estado.toUpperCase()}</Badge>
        </View>
        {item.turno && <>
          <Text numeric variant="action">{fechaLegible(item.turno.fecha)} · {item.turno.inicio}–{item.turno.fin}</Text>
          {item.turno.precio !== null && <Text numeric variant="action" tone="primary">{precioLegible(item.turno.precio)} · Se paga en el lugar</Text>}
        </>}
        {esProxima(item) && <CodigoQr value={item.reserva.codigoQr} />}
        <Text selectable variant="label">Código: {item.reserva.codigoQr}</Text>
        <Text variant="label" tone="muted">Personas: {item.reserva.cantidadPersonas}</Text>
        {esProxima(item) && (ahora <= new Date(item.reserva.cancelableHasta)
          ? <Button title="Cancelar Reserva" variant="destructive" disabled={local || cancelando} onPress={() => setConfirmacion(item)} />
          : <Text tone="muted">Para cancelar, avisá al encargado.</Text>)}
        {item.espacio && <Button title="Cómo llegar" variant="secondary" onPress={() => router.push({ pathname: '/espacio/[id]', params: { id: item.espacio!.id } })} />}
      </Surface>} />
    {confirmacion && !cancelando && <DialogoAviso titulo="Cancelar Reserva" mensaje="¿Querés cancelar este turno?" accionPrincipal="Cancelar reserva" accionSecundaria="Volver"
      destructivo onCerrar={() => setConfirmacion(null)} onConfirmar={cancelar} />}
    {cancelando && <StateView><ActivityIndicator color={colors.primary} /></StateView>}
    {mensaje && <DialogoAviso titulo="Mis Reservas" mensaje={mensaje} accionPrincipal="Entendido" onCerrar={() => setMensaje(null)} onConfirmar={() => setMensaje(null)} />}
  </Screen>;
}
