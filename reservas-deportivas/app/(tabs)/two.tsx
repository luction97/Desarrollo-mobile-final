import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Linking, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSinRed } from '../../src/hooks/useSinRed';
import { useHorarioActual } from '../../src/hooks/useHorarioActual';
import { Badge, Button, Chip, Screen, StateView, Surface, Text, uiLayout } from '../../src/components/ui';
import { CodigoQr } from '../../src/components/CodigoQr';
import { DialogoAviso } from '../../src/components/DialogoAviso';
import { borders, spacing, useTheme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { cancelarReserva, esErrorSesion, reservasGuardadas, sincronizarReservas } from '../../src/services/reservas';
import type { ReservaGuardada } from '../../src/modelos/reservas';
import { precioLegible } from '../../src/utils/dinero';
import { fechaLegible, instanteTurno } from '../../src/utils/fechas';
import { permisosDe } from '../../src/utils/permisos';
import { etiquetasReserva } from '../../src/utils/etiquetas';
import { fechaRecordatorio } from '../../src/utils/recordatorios';
import { notificacionesService } from '../../src/services/notificaciones';
import { enlacesDestino, puntosDeEspacios } from '../../src/mapa/modelo';
import type { Espacio } from '../../src/tipos';

export default function MisReservasScreen() {
  const { colors } = useTheme();
  const { usuario, cargando: cargandoSesion } = useAuth();
  const { puedeReservar } = permisosDe(usuario);
  const router = useRouter();
  const { reservaId } = useLocalSearchParams<{ reservaId?: string }>();
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
  const [qrElegido, setQrElegido] = useState<string | null>(null);
  const [programando, setProgramando] = useState(false);
  const [estadoRecordatorio, setEstadoRecordatorio] = useState<{ id: string; mensaje: string } | null>(null);
  const generacion = useRef(0);
  const ocupado = useRef(false);

  const cargar = useCallback(async () => {
    const version = ++generacion.current;
    setConfirmacion(null);
    setMensaje(null);
    if (!usuario || !puedeReservar) { setDatos([]); setCargando(false); return; }
    setError(null);
    setCargando(true);
    const guardadas = await reservasGuardadas(usuario.id).catch(() => null);
    if (version !== generacion.current) return;
    // Se pintan las reservas guardadas para no dejar la pantalla vacía, pero el aviso
    // de "sin conexión" aparece sólo si de verdad no se pudo actualizar con el servidor.
    setDatos(guardadas ?? []); setCargando(false);
    if (!guardadas) { setLocal(true); setError('No pudimos mostrar las reservas guardadas en el teléfono.'); }
    try {
      if (sinRed) { setLocal(true); return; }
      const vigentes = () => version === generacion.current;
      const actuales = await sincronizarReservas(usuario.id, vigentes);
      if (!vigentes()) return;
      setDatos(actuales.datos);
      setLocal(!actuales.actualizada);
      setError(actuales.guardadas ? null : 'No pudimos actualizar las reservas guardadas en el teléfono.');
      if (actuales.cambios.length) {
        setMensaje(actuales.cambios.map(d => [
          d.espacio?.nombre ?? 'Cancha',
          d.turno && fechaLegible(d.turno.fecha) + ' · ' + d.turno.inicio,
          'Cancelada',
        ].filter(Boolean).join(' · ')).join('\n'));
      }
    } catch (e) {
      if (version === generacion.current && !esErrorSesion(e)) {
        setLocal(true);
        setError(e instanceof Error ? e.message : 'No se pudieron actualizar las reservas.');
      }
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
    if (!puedeReservar || !confirmacion || confirmacion.reserva.usuarioId !== usuario?.id || ocupado.current) return;
    if (local || sinRed) {
      setConfirmacion(null);
      setMensaje('Conectate para cancelar la reserva.');
      return;
    }
    if (Date.now() > Date.parse(confirmacion.reserva.cancelableHasta)) {
      setConfirmacion(null);
      setMensaje('El plazo para cancelar terminó. Contactá al encargado.');
      return;
    }
    ocupado.current = true; setCancelando(true);
    const version = generacion.current;
    try {
      const resultado = await cancelarReserva(confirmacion);
      if (version !== generacion.current) return;
      setDatos(prev => prev.map(d => d.reserva.id === resultado.reserva.id ? { ...d, reserva: resultado.reserva } : d));
      setConfirmacion(null);
      setMensaje(resultado.guardadaLocalmente ? 'La reserva fue cancelada.' : 'Reserva cancelada. No pudimos actualizar las reservas guardadas en el teléfono.');
    } catch (e) {
      if (version === generacion.current) {
        setConfirmacion(null);
        setMensaje(e instanceof Error ? e.message : 'No se pudo cancelar la reserva.');
      }
    }
    finally { ocupado.current = false; setCancelando(false); }
  };

  if (cargandoSesion || (cargando && !datos.some(d => d.reserva.usuarioId === usuario?.id))) {
    return <Screen topInset><StateView><ActivityIndicator color={colors.primary} /><Text tone="muted">Cargando reservas...</Text></StateView></Screen>;
  }
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
  const qr = datos.find(d => d.reserva.usuarioId === usuario.id && d.reserva.id === (qrElegido ?? reservaId) && esProxima(d));
  const inicioQr = qr?.turno ? instanteTurno(qr.turno.fecha, qr.turno.inicio) : null;
  const cerrarQr = () => {
    setQrElegido(null);
    if (reservaId) router.setParams({ reservaId: '' });
  };

  const activarRecordatorio = async () => {
    if (!qr || !inicioQr || programando || !fechaRecordatorio(inicioQr, new Date())) return;
    setProgramando(true);
    try {
      const programado = await notificacionesService.programarRecordatorio(qr.espacio?.nombre ?? 'Tu cancha', inicioQr, qr.reserva.id);
      setEstadoRecordatorio({ id: qr.reserva.id, mensaje: programado
        ? 'Recordatorio programado para dos horas antes del turno.'
        : 'No se programó el recordatorio. Revisá los permisos de notificaciones en Ajustes.' });
    } catch {
      setEstadoRecordatorio({ id: qr.reserva.id, mensaje: 'No pudimos programar el recordatorio. Volvé a intentar.' });
    } finally {
      setProgramando(false);
    }
  };

  const comoLlegar = async (espacio: Espacio) => {
    const destino = puntosDeEspacios([espacio])[0];
    if (destino) {
      for (const enlace of enlacesDestino(destino, Platform.OS)) {
        try { await Linking.openURL(enlace); return; } catch { /* Intenta la opción web. */ }
      }
    }
    setMensaje('No pudimos abrir las indicaciones para esta cancha.');
  };

  return <Screen topInset>
    <View style={[uiLayout.inset, styles.encabezado]}>
      <View style={uiLayout.row}>
        <Text variant="display" accessibilityRole="header" style={uiLayout.grow}>Mis reservas</Text>
        <Button size="sm" variant="ghost" title="Actualizar" onPress={cargar} disabled={cargando} />
      </View>
      <View style={styles.segmentos}>
        <Chip style={uiLayout.grow} selected={!pasadas} onPress={() => setPasadas(false)}>Próximas</Chip>
        <Chip style={uiLayout.grow} selected={pasadas} onPress={() => setPasadas(true)}>Pasadas</Chip>
      </View>
      {!pasadas && futuras > 0 && <Text variant="label" tone="muted">
        {futuras} {futuras === 1 ? 'reserva futura confirmada' : 'reservas futuras confirmadas'}
      </Text>}
      {local && <Text variant="label" tone="warning" accessibilityLiveRegion="polite">Estás sin conexión: mostramos las reservas guardadas en el teléfono.</Text>}
      {error && <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>}
    </View>
    <FlatList data={visibles} keyExtractor={d => d.reserva.id} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={uiLayout.listContent}
      refreshing={cargando && visibles.length > 0} onRefresh={() => void cargar()}
      ListEmptyComponent={<StateView><Text tone="muted">{local ? 'No hay reservas guardadas en el teléfono.' : pasadas ? 'No tenés reservas pasadas.' : 'No tenés reservas próximas.'}</Text>
        <Button title="Ver disponibilidad" variant="secondary" onPress={() => router.push('/(tabs)')} /></StateView>}
      renderItem={({ item }) => <Surface style={styles.reserva}>
        <View style={uiLayout.row}>
          {item.turno && <Text numeric variant="label" tone="primary" style={uiLayout.grow}>
            {fechaLegible(item.turno.fecha)} · {item.turno.inicio}–{item.turno.fin}
          </Text>}
          <Badge size="sm" variant={item.reserva.estado === 'confirmada' ? 'success' : 'neutral'}>{etiquetasReserva[item.reserva.estado]}</Badge>
        </View>
        <View>
          <View style={uiLayout.grow}>
            <Text variant="subtitle">{item.espacio?.nombre ?? 'Espacio no disponible'}</Text>
            <Text tone="muted">{item.espacio?.complejo}</Text>
          </View>
        </View>
        <Text variant="label" tone="muted">{item.reserva.cantidadPersonas} {item.reserva.cantidadPersonas === 1 ? 'persona' : 'personas'}
          {item.turno?.precio != null ? ' · ' + precioLegible(item.turno.precio) + ' en el lugar' : ''}</Text>
        <View style={[uiLayout.row, styles.acciones, { borderColor: colors.border }]}>
        {esProxima(item) && <Button size="sm" title="Mostrar QR" onPress={() => setQrElegido(item.reserva.id)} />}
        {item.espacio && puntosDeEspacios([item.espacio]).length > 0 && <Button title="Cómo llegar" size="sm" variant="ghost"
          onPress={() => { if (item.espacio) void comoLlegar(item.espacio); }} />}
        {esProxima(item) && (ahora <= new Date(item.reserva.cancelableHasta)
          ? <Button title="Cancelar reserva" size="sm" variant="ghost" disabled={cargando || local || sinRed || cancelando} onPress={() => setConfirmacion(item)} />
          : <Text tone="muted">Contactá al encargado para cancelar.</Text>)}
        </View>
      </Surface>} />
    {qr && <Modal visible animationType="fade" onRequestClose={cerrarQr}>
      <Screen topInset>
        <ScrollView contentContainerStyle={uiLayout.scrollContent}>
            <Text variant="title" accessibilityRole="header">QR de ingreso</Text>
            <Text variant="subtitle">{qr.espacio?.nombre ?? 'Reserva confirmada'}</Text>
            {qr.turno && <Text>{fechaLegible(qr.turno.fecha)} · {qr.turno.inicio}–{qr.turno.fin}</Text>}
            {local && <Text variant="label" tone="warning">QR guardado en el teléfono</Text>}
            <CodigoQr value={qr.reserva.codigoQr} />
            <Text selectable variant="label">Código: {qr.reserva.codigoQr}</Text>
            {!local && !sinRed && inicioQr && fechaRecordatorio(inicioQr, ahora) && <Button
              variant="secondary" title="Programar recordatorio" loading={programando} onPress={activarRecordatorio} />}
            {estadoRecordatorio?.id === qr.reserva.id && <Text accessibilityLiveRegion="polite">{estadoRecordatorio.mensaje}</Text>}
            <Button variant="ghost" title="Volver a mis reservas" onPress={cerrarQr} />
        </ScrollView>
      </Screen>
    </Modal>}
    {confirmacion && !cancelando && <DialogoAviso titulo="Cancelar reserva" mensaje="¿Querés cancelar este turno?" accionPrincipal="Cancelar reserva" accionSecundaria="Volver"
      destructivo onCerrar={() => setConfirmacion(null)} onConfirmar={cancelar} />}
    {cancelando && <StateView><ActivityIndicator color={colors.primary} /></StateView>}
    {mensaje && <DialogoAviso titulo="Mis reservas" mensaje={mensaje} accionPrincipal="Entendido" onCerrar={() => setMensaje(null)} onConfirmar={() => setMensaje(null)} />}
  </Screen>;
}

const styles = StyleSheet.create({
  encabezado: { gap: spacing.sm },
  segmentos: { flexDirection: 'row', gap: spacing.sm },
  reserva: { gap: spacing.sm },
  acciones: { justifyContent: 'flex-start', borderTopWidth: borders.thin, paddingTop: spacing.sm, gap: spacing.xs },
});
