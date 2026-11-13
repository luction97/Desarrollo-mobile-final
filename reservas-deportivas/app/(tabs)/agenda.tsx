import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, Button, Chip, Screen, StateView, Surface, Text, uiLayout } from '../../src/components/ui';
import { spacing, useTheme } from '../../src/theme';
import { DialogoAviso } from '../../src/components/DialogoAviso';
import { useAuth } from '../../src/context/AuthContext';
import { useHorarioActual } from '../../src/hooks/useHorarioActual';
import { operacionesService } from '../../src/services/operaciones';
import { obtenerEspacios } from '../../src/services/espacios';
import { diasDeReserva, fechaArgentina, fechaLegible, instanteTurno } from '../../src/utils/fechas';
import { permisosDe } from '../../src/utils/permisos';
import { etiquetasReserva, etiquetasTurno } from '../../src/utils/etiquetas';
import type { Espacio, Reserva, Turno, Usuario } from '../../src/tipos';

interface Agenda {
  clave: string;
  turnos: Turno[];
  espacios: Espacio[];
  reservas: Record<string, Reserva>;
  titulares: Record<string, Usuario>;
}

export default function AgendaScreen() {
  const { colors } = useTheme();
  const { usuario } = useAuth();
  const router = useRouter();
  const { puedeGestionar } = permisosDe(usuario);
  const ahora = useHorarioActual();
  const hoy = fechaArgentina(ahora);
  const dias = useMemo(() => diasDeReserva(hoy), [hoy]);
  const [diaElegido, setDia] = useState(hoy);
  const fecha = dias.some(d => d.fecha === diaElegido) ? diaElegido : hoy;
  const [filtro, setFiltro] = useState('');
  const [datos, setDatos] = useState<Agenda | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<{ id: string; accion: 'ausencia' | 'cancelación' } | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const operando = useRef(false);
  const generacion = useRef(0);
  const clave = [usuario?.id, fecha].join(':');
  /** La agenda anterior se mantiene visible mientras se actualiza: no parpadea al volver a la pestaña. */
  const agenda = datos?.clave === clave && !error ? datos : null;

  const cargar = useCallback(async () => {
    const version = ++generacion.current;
    if (!puedeGestionar) { setDatos(null); return; }
    setCargando(true);
    setError(null);
    setConfirmacion(null);
    try {
      const [turnos, reservas, catalogo] = await Promise.all([
        operacionesService.listarAgenda(fecha),
        operacionesService.listarReservasDelDia(fecha),
        obtenerEspacios(),
      ]);
      if (version !== generacion.current) return;
      const ids = new Set(turnos.map(turno => turno.reservaId));
      const vinculadas = reservas.filter(reserva => ids.has(reserva.id));
      const usuarios = [...new Set(vinculadas.map(reserva => reserva.usuarioId))];
      const titulares = await Promise.all(usuarios.map(id => operacionesService.obtenerUsuario(id).catch(() => null)));
      if (version !== generacion.current) return;
      setDatos({
        clave, turnos, espacios: catalogo.datos,
        reservas: Object.fromEntries(vinculadas.map(reserva => [reserva.id, reserva])),
        titulares: Object.fromEntries(titulares.flatMap(titular => titular ? [[titular.id, titular]] : [])),
      });
    } catch (e) {
      if (version === generacion.current) setError(e instanceof Error ? e.message : 'No se pudo cargar la agenda.');
    } finally {
      if (version === generacion.current) setCargando(false);
    }
  }, [fecha, clave, puedeGestionar]);

  useFocusEffect(useCallback(() => {
    void cargar();
    return () => { generacion.current++; };
  }, [cargar]));

  const actualizarReserva = async () => {
    if (!puedeGestionar || !confirmacion || !agenda?.reservas[confirmacion.id] || operando.current) return;
    const { id, accion } = confirmacion;
    const version = generacion.current;
    operando.current = true;
    setOcupado(true);
    setConfirmacion(null);
    try {
      if (accion === 'ausencia') await operacionesService.marcarAusente(id);
      else await operacionesService.cancelarReserva(id);
      if (version !== generacion.current) return;
      setMensaje(accion === 'ausencia' ? 'Ausencia registrada.' : 'Reserva cancelada.');
      await cargar();
    } catch (e) {
      if (version === generacion.current) setMensaje(e instanceof Error ? e.message : 'No se pudo actualizar la reserva.');
    } finally {
      setOcupado(false);
      operando.current = false;
    }
  };

  if (!puedeGestionar) return <Screen><StateView>
    <Text>Esta sección es para el personal del complejo.</Text>
    <Button title={usuario ? 'Volver a las canchas' : 'Iniciar sesión'} onPress={() => router.push(usuario ? '/(tabs)' : '/login')} />
  </StateView></Screen>;

  return <Screen topInset>
    <View style={[uiLayout.inset, { gap: spacing.sm }]}>
      <View style={uiLayout.row}>
        <View style={uiLayout.grow}>
          <Text variant="display" accessibilityRole="header">Agenda</Text>
          <Text variant="label" tone="muted">{fechaLegible(fecha)}</Text>
        </View>
        <Button size="sm" title="Escanear QR" onPress={() => router.push('/scanner')} />
      </View>
      <Button variant="ghost" size="sm" title="Gestionar canchas" onPress={() => router.push('/admin')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {dias.map(d => <Chip key={d.fecha} selected={d.fecha === fecha} disabled={ocupado}
          accessibilityLabel={fechaLegible(d.fecha)} onPress={() => setDia(d.fecha)}>
          {`${d.nombre} ${d.fecha.slice(-2)}`}
        </Chip>)}
      </ScrollView>
      {agenda && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip selected={!filtro} onPress={() => setFiltro('')}>Todas las canchas</Chip>
        {agenda.espacios.map(e => <Chip key={e.id} selected={filtro === e.id} onPress={() => setFiltro(e.id)}>{e.nombre}</Chip>)}
      </ScrollView>}
    </View>
    {error ? <StateView>
      <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>
      <Button title="Reintentar" variant="secondary" onPress={cargar} />
    </StateView> : !agenda ? <StateView>
      <ActivityIndicator color={colors.primary} /><Text tone="muted">Cargando agenda…</Text>
    </StateView> : <FlatList
      data={agenda.turnos.filter(t => !filtro || t.espacioId === filtro)}
      refreshing={cargando}
      onRefresh={cargar}
      keyExtractor={item => item.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={uiLayout.listContent}
      ListEmptyComponent={<StateView><Text tone="muted">No hay turnos para esta selección.</Text></StateView>}
      renderItem={({ item }) => {
        const reserva = item.reservaId ? agenda.reservas[item.reservaId] : undefined;
        const titular = reserva && agenda.titulares[reserva.usuarioId];
        const inicio = instanteTurno(item.fecha, item.inicio).getTime();
        const esConfirmada = reserva?.estado === 'confirmada';
        const diferencia = ahora.getTime() - inicio;
        return <Surface padding="sm" style={{ gap: spacing.sm }}>
          <View style={uiLayout.row}>
            <View style={uiLayout.grow}>
              <Text numeric variant="action">{item.inicio}–{item.fin}</Text>
              {!filtro && <Text variant="label" tone="muted">{agenda.espacios.find(e => e.id === item.espacioId)?.nombre ?? item.espacioId}</Text>}
            </View>
            <Badge size="sm" variant={item.estado === 'libre' ? 'success' : item.estado === 'mantenimiento' ? 'warning' : 'neutral'}>
              {reserva && item.estado === 'reservado' ? etiquetasReserva[reserva.estado] : etiquetasTurno[item.estado]}
            </Badge>
          </View>
          {item.motivoBloqueo && <Text tone="muted">{item.motivoBloqueo}</Text>}
          {reserva && <>
            <Text variant="label">{titular ? titular.nombre + ' · ' + titular.telefono : 'Datos del titular no disponibles'} · {reserva.cantidadPersonas} personas</Text>
            {titular && <Text variant="label" tone="muted">Ausencias: {titular.ausencias} · Cancelaciones tardías: {titular.cancelacionesTardias}</Text>}
          </>}
          {esConfirmada && diferencia >= -30 * 60_000 && diferencia < 60 * 60_000 && <Button size="sm" title="Escanear QR"
            onPress={() => router.push({ pathname: '/scanner', params: { espacioId: item.espacioId } })} />}
          {esConfirmada && diferencia >= 15 * 60_000 && <Button size="sm" variant="secondary" title="Marcar ausente"
            disabled={ocupado} onPress={() => setConfirmacion({ id: reserva.id, accion: 'ausencia' })} />}
          {esConfirmada && diferencia < 0 && <Button size="sm" variant="ghost" title="Cancelar reserva"
            disabled={ocupado} onPress={() => setConfirmacion({ id: reserva.id, accion: 'cancelación' })} />}
        </Surface>;
      }} />}
    {confirmacion && agenda && <DialogoAviso
      titulo={confirmacion.accion === 'ausencia' ? 'Marcar ausente' : 'Cancelar reserva'}
      mensaje={confirmacion.accion === 'ausencia' ? 'Se registrará que el titular no asistió.' : 'Se liberará el horario de esta reserva.'}
      destructivo accionPrincipal="Confirmar" accionSecundaria="Volver" onConfirmar={actualizarReserva} onCerrar={() => setConfirmacion(null)} />}
    {mensaje && <DialogoAviso titulo="Agenda" mensaje={mensaje} accionPrincipal="Entendido"
      onConfirmar={() => setMensaje(null)} onCerrar={() => setMensaje(null)} />}
  </Screen>;
}

const styles = StyleSheet.create({
  /** Las tiras de chips no se estiran en vertical: mantienen su alto natural. */
  chips: { gap: spacing.sm, alignItems: 'flex-start' },
});
