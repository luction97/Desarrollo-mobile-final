import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, ScrollView, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSinRed } from '../../src/hooks/useSinRed';
import { Badge, Button, Chip, PressableSurface, Screen, StateView, Surface, Text, uiLayout } from '../../src/components/ui';
import { DialogoAviso } from '../../src/components/DialogoAviso';
import { ReservaDialog } from '../../src/components/ReservaDialog';
import { borders, controlSizes, layout, radius, spacing, useTheme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { consultarGrilla } from '../../src/services/turnos';
import { obtenerDeportes, obtenerDeportesLocales, obtenerEspacios, obtenerEspaciosLocales } from '../../src/services/espacios';
import { crearReserva } from '../../src/services/reservas';
import { ApiError } from '../../src/services/api';
import preferencias from '../../src/services/preferencias';
import { useHorarioActual } from '../../src/hooks/useHorarioActual';
import { diasDeReserva, fechaArgentina, fechaLegible, instanteTurno } from '../../src/utils/fechas';
import { precioLegible } from '../../src/utils/dinero';
import { ordenarTurnosParaMostrar } from '../../src/utils/turnos';
import { permisosDe } from '../../src/utils/permisos';
import { etiquetasTurno } from '../../src/utils/etiquetas';
import type { Deporte, Espacio, Turno } from '../../src/tipos';
import { catalogoDeEspacios } from '../../src/canchas/modelo';
import { FavoritoToggle } from '../../src/components/favoritos';
import { fotoDeCancha, portadaDeEjemplo } from '../../src/canchas/imagenes';

interface Aviso { titulo: string; mensaje?: string; detalle?: string; reservaId?: string }

export default function DisponibilidadScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ espacioId?: string; fecha?: string; turnoId?: string; personas?: string }>();
  const { usuario, cargando: cargandoSesion } = useAuth();
  const { puedeReservar } = permisosDe(usuario);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [espacioElegidoId, setEspacioId] = useState(params.espacioId ?? '');
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [intentoCatalogo, setIntentoCatalogo] = useState(0);
  const ahora = useHorarioActual();
  const hoy = fechaArgentina(ahora);
  const dias = useMemo(() => diasDeReserva(hoy), [hoy]);
  const [fechaElegida, setFecha] = useState(params.fecha ?? hoy);
  const fecha = dias.some(d => d.fecha === fechaElegida) ? fechaElegida : hoy;
  const [verAnteriores, setVerAnteriores] = useState(false);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sinRed = useSinRed();
  const [catalogoLocal, setCatalogoLocal] = useState(false);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);
  const [turnosLiberados, setTurnosLiberados] = useState<string[]>([]);
  const [local, setLocal] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [seleccionado, setSeleccionado] = useState<Turno | null>(null);
  const [personasIniciales, setPersonasIniciales] = useState(1);
  const borradorRecuperado = useRef<string | null>(null);
  const [reservando, setReservando] = useState(false);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);
  const [filtroDeporte, setFiltroDeporte] = useState<string>('todos');
  const [filtroComplejo, setFiltroComplejo] = useState<string>('todos');
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [catalogoAbierto, setCatalogoAbierto] = useState(false);
  const operando = useRef(false);
  const generacion = useRef(0);
  const espaciosFavoritos = usuario?.espaciosFavoritos;
  const espaciosFiltrados = useMemo(() => espacios.filter(e =>
    (filtroDeporte === 'todos' || e.deporteId === filtroDeporte) &&
    (filtroComplejo === 'todos' || e.complejo === filtroComplejo) &&
    (!soloFavoritos || !espaciosFavoritos || espaciosFavoritos.includes(e.id))),
  [espacios, filtroDeporte, filtroComplejo, soloFavoritos, espaciosFavoritos]);
  const espacio = espacios.find(e => e.id === espacioElegidoId) ?? espacios[0] ?? null;
  const espacioId = espacio?.id ?? '';

  useEffect(() => { setSoloFavoritos(false); }, [usuario?.id]);

  useFocusEffect(useCallback(() => {
    let activo = true;
    const aplicar = (datos: Espacio[], favorito: string | null) => {
      if (!activo) return;
      const canchas = catalogoDeEspacios(datos);
      setEspacios(canchas);
      if (canchas.length) setCargandoCatalogo(false);
      setEspacioId(actual => actual || canchas.find(e => e.id === favorito)?.id || '');
    };
    const cargar = async () => {
      setCargandoCatalogo(true); setErrorCatalogo(null);
      const [favorito, locales, deportesLocales] = await Promise.all([
        preferencias.getItem('ultimoEspacio').catch(() => null),
        obtenerEspaciosLocales().catch(() => []),
        obtenerDeportesLocales().catch(() => null),
      ]);
      if (!activo) return;
      aplicar(locales, favorito);
      if (deportesLocales) setDeportes(deportesLocales);
      setCatalogoLocal(locales.length > 0);
      if (sinRed) {
        if (!locales.length) setErrorCatalogo('Conectate para cargar el catálogo de canchas.');
        setCargandoCatalogo(false);
        return;
      }
      try {
        const [resultado, listaDeportes] = await Promise.all([obtenerEspacios(), obtenerDeportes().catch(() => null)]);
        aplicar(resultado.datos, favorito);
        if (activo) {
          setCatalogoLocal(resultado.local);
          if (listaDeportes) setDeportes(listaDeportes);
          else setErrorCatalogo('No pudimos actualizar los deportes.');
        }
      } catch (e) {
        if (activo) setErrorCatalogo(e instanceof Error ? e.message : 'No se pudieron cargar las canchas.');
      } finally {
        if (activo) setCargandoCatalogo(false);
      }
    };
    void cargar();
    return () => { activo = false; };
  }, [intentoCatalogo, sinRed]));

  useEffect(() => {
    if (!params.espacioId) return;
    setEspacioId(params.espacioId);
    setFiltroDeporte('todos');
    setFiltroComplejo('todos');
    setSoloFavoritos(false);
  }, [params.espacioId]);

  useEffect(() => {
    if (params.fecha) setFecha(params.fecha);
  }, [params.fecha]);

  useEffect(() => { setVerAnteriores(false); setTurnosLiberados([]); }, [fecha, espacioId, usuario?.id]);

  useEffect(() => {
    if (!params.turnoId) borradorRecuperado.current = null;
    else if (usuario && params.fecha && !dias.some(dia => dia.fecha === params.fecha)) {
      borradorRecuperado.current = params.turnoId;
      router.setParams({ turnoId: '', personas: '' });
      setAviso({ titulo: 'Elegí otro horario', mensaje: 'El día seleccionado ya no está dentro del período de reservas.' });
    }
  }, [params.turnoId, params.fecha, dias, usuario?.id, router]);

  const cargarGrilla = useCallback(async () => {
    if (!espacioId) { generacion.current++; setTurnos([]); setLocal(false); setCargando(false); return; }
    const version = ++generacion.current;
    setCargando(true); setError(null);
    try {
      const resultado = await consultarGrilla(espacioId, fecha);
      if (version !== generacion.current) return;
      setTurnos(resultado.datos);
      setLocal(resultado.local);
      if (resultado.liberados?.length && usuario?.espaciosFavoritos.includes(espacioId)) {
        setTurnosLiberados(resultado.liberados.map(t => t.inicio));
      }
      if (usuario && params.turnoId && params.espacioId === espacioId && params.fecha === fecha
        && borradorRecuperado.current !== params.turnoId && !resultado.local) {
        borradorRecuperado.current = params.turnoId;
        router.setParams({ turnoId: '', personas: '' });
        const turno = resultado.datos.find(t => t.id === params.turnoId);
        if (puedeReservar && turno?.estado === 'libre' && instanteTurno(turno.fecha, turno.inicio) > new Date()) {
          const cantidad = Number(params.personas);
          setPersonasIniciales(Number.isInteger(cantidad) && cantidad > 0 ? cantidad : 1);
          setErrorReserva(null);
          setSeleccionado(turno);
        } else if (puedeReservar) {
          setAviso({ titulo: 'Elegí otro horario', mensaje: 'El turno que seleccionaste ya no está disponible.' });
        }
      }
    } catch (e) { if (version === generacion.current) setError(e instanceof Error ? e.message : 'No se pudo cargar la disponibilidad.'); }
    finally { if (version === generacion.current) setCargando(false); }
  }, [espacioId, fecha, usuario?.id, puedeReservar, params.turnoId, params.espacioId, params.fecha, params.personas, router]);

  useFocusEffect(useCallback(() => {
    void cargarGrilla();
    return () => { generacion.current++; };
  }, [cargarGrilla, sinRed]));

  const elegir = (turno: Turno) => {
    if (turno.estado !== 'libre' || cargandoSesion || operando.current) return;
    if (instanteTurno(turno.fecha, turno.inicio) <= new Date()) {
      setAviso({ titulo: 'Este turno ya pasó', mensaje: 'Elegí un horario futuro para hacer tu reserva.' }); return;
    }
    if (usuario && !puedeReservar) return;
    if (sinRed || local) { setAviso({ titulo: 'Conectate para reservar', mensaje: 'La disponibilidad guardada puede haber cambiado. Reintentá cuando tengas conexión.' }); return; }
    setPersonasIniciales(1);
    setErrorReserva(null);
    setSeleccionado(turno);
  };

  const confirmar = async (cantidad: number) => {
    if (!seleccionado || !espacio || operando.current || seleccionado.espacioId !== espacioId || seleccionado.fecha !== fecha) return;
    if (sinRed || local) { setErrorReserva('Conectate a internet para reservar.'); return; }
    if (instanteTurno(seleccionado.fecha, seleccionado.inicio) <= new Date()) {
      setErrorReserva('Este turno ya pasó. Elegí otro horario.');
      return;
    }
    if (!usuario) {
      setSeleccionado(null);
      router.push({ pathname: '/login', params: {
        espacioId, fecha: seleccionado.fecha, turnoId: seleccionado.id, personas: String(cantidad),
      } });
      return;
    }
    if (!puedeReservar) return;
    operando.current = true; setReservando(true); setErrorReserva(null);
    try { const resultado = await crearReserva(seleccionado, espacio, cantidad, usuario.id);
      setTurnos(datos => datos.map(t => t.id === seleccionado.id ? { ...t, estado: 'reservado', reservaId: resultado.dato.reserva.id } : t));
      setSeleccionado(null);
      const mensajeQr = resultado.guardadaLocalmente ? 'Tu QR está guardado para verlo sin conexión.'
        : 'No pudimos guardar el QR en este teléfono. Abrí Mis reservas con conexión para guardarlo.';
      setAviso({ titulo: 'Reserva confirmada', mensaje: [
        mensajeQr,
        resultado.recordatorioDisponible ? null : 'Esta reserva no tiene un recordatorio programado.',
      ].filter(Boolean).join(' '), reservaId: resultado.dato.reserva.id });
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo reservar.';
      if (e instanceof ApiError && ['TURNO_OCUPADO', 'TURNO_NO_DISPONIBLE'].includes(e.codigo)) {
        setSeleccionado(null);
        setAviso({ titulo: 'El turno ya no está disponible', mensaje });
        void cargarGrilla();
      } else {
        setErrorReserva(mensaje);
      }
    }
    finally { operando.current = false; setReservando(false); }
  };

  const grilla = ordenarTurnosParaMostrar(turnos.filter(t => t.espacioId === espacioId && t.fecha === fecha));
  const anteriores = fecha === hoy ? grilla.filter(t => instanteTurno(t.fecha, t.inicio) <= ahora) : [];
  const visibles = [...grilla.slice(anteriores.length), ...(verAnteriores ? anteriores : [])];
  const complejosDisponibles = ['todos', ...new Set(espacios.map(e => e.complejo).filter(c => c && c.trim() !== '' && c !== '—' && c !== '-'))];
  const limpiarFiltros = () => { setSoloFavoritos(false); setFiltroDeporte('todos'); setFiltroComplejo('todos'); };

  const deporteDe = (id: string) => deportes.find(d => d.id === id)?.nombre ?? 'Espacio deportivo';
  const fotoSeleccionada = espacio ? fotoDeCancha(espacio) : null;
  const cantidadLibres = grilla.slice(anteriores.length).filter(t => t.estado === 'libre').length;

  const cabecera = <View style={styles.cabecera}>
    <View style={uiLayout.row}>
      <View style={uiLayout.grow}>
        <Text variant="display" accessibilityRole="header">Canchas</Text>
      </View>
      <Button variant="ghost" size="sm" title="Mapa" accessibilityLabel="Mapa de complejos" onPress={() => router.push('/mapa')} />
      {!usuario && <Button size="sm" title="Entrar" onPress={() => router.push('/login')} />}
    </View>
    {(sinRed || local || catalogoLocal) && <Text accessibilityLiveRegion="polite" variant="label" tone="warning">
      {sinRed ? 'Sin conexión · Datos guardados' : 'Datos guardados · Pueden estar desactualizados'}
    </Text>}
    {errorCatalogo && <View style={uiLayout.row}>
      <Text style={uiLayout.grow} tone="danger" accessibilityRole="alert">{errorCatalogo}</Text>
      <Button size="sm" variant="secondary" title="Actualizar canchas" onPress={() => setIntentoCatalogo(v => v + 1)} />
    </View>}

    {espacio && <Surface padding="none" style={styles.seleccion}>
      {fotoSeleccionada && <Image source={fotoSeleccionada} style={styles.fotoPrincipal} resizeMode="cover" accessible={false} />}
      <View style={styles.resumenCancha}>
        <View style={uiLayout.row}>
          <View style={uiLayout.grow}>
            <Text variant="title" accessibilityRole="header">{espacio.nombre}</Text>
            <Text variant="label" tone="muted">{espacio.complejo && espacio.complejo !== '—' ? espacio.complejo + ' · ' : ''}{precioLegible(espacio.precioPorHora)}/h</Text>
          </View>
          <FavoritoToggle espacioId={espacio.id} nombre={espacio.nombre} />
        </View>
        <View style={styles.accionesCancha}>
          <Button style={uiLayout.grow} variant="secondary" title="Ver detalles"
            onPress={() => router.push({ pathname: '/espacio/[id]', params: { id: espacio.id } })} />
          <Button style={uiLayout.grow} variant="ghost" title="Cambiar cancha"
            accessibilityLabel={'Cambiar cancha. Actual: ' + espacio.nombre} onPress={() => setCatalogoAbierto(true)} />
        </View>
      </View>
    </Surface>}
    {espacio && <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal} accessibilityLabel="Días disponibles">
        {dias.map(d => <PressableSurface key={d.fecha} selected={d.fecha === fecha} accessibilityLabel={d.nombre + ' ' + fechaLegible(d.fecha)}
          onPress={() => setFecha(d.fecha)} style={styles.dia}>
          <Text variant="label" tone={d.fecha === fecha ? 'primary' : 'muted'}>{d.nombre}</Text>
          <Text numeric variant="title">{d.fecha.slice(-2)}</Text>
        </PressableSurface>)}
      </ScrollView>
      <View style={uiLayout.row}>
        <Text variant="title" accessibilityRole="header">Horarios</Text>
        {!cargando && !error && <Text variant="label" tone="muted">{cantidadLibres} {cantidadLibres === 1 ? 'libre' : 'libres'}</Text>}
      </View>
    </>}
    {turnosLiberados.length > 0 && <Text variant="label" tone="success" accessibilityLiveRegion="polite">
      Se liberaron horarios en esta cancha favorita: {turnosLiberados.join(', ')}.
    </Text>}
  </View>;

  return <Screen topInset>
    <FlatList data={!espacio || cargando || error ? [] : visibles} keyExtractor={t => t.id}
      contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[uiLayout.listContent, styles.listaTurnos]}
      ListHeaderComponent={cabecera} ListEmptyComponent={cargandoCatalogo || cargando ? <StateView><ActivityIndicator color={colors.primary} /><Text tone="muted">Cargando horarios...</Text></StateView>
        : error && (espacio || !espacios.length) ? <StateView><Text selectable accessibilityRole="alert" tone="danger">{error}</Text><Button title="Reintentar" onPress={() => espacios.length ? cargarGrilla() : setIntentoCatalogo(v => v + 1)} /></StateView>
        : !espacio && errorCatalogo ? null
        : !espacio ? <StateView><Text tone="muted">No hay canchas disponibles en el catálogo.</Text></StateView>
        : <StateView><Text tone="muted">{local ? 'No hay horarios guardados para esta fecha.' : 'No quedan horarios para mostrar en esta fecha.'}</Text></StateView>}
      ListFooterComponent={espacio && !cargando && !error && anteriores.length > 0
        ? <Button variant="ghost" title={verAnteriores ? 'Ocultar anteriores' : 'Ver anteriores'}
          onPress={() => setVerAnteriores(v => !v)} /> : null}
      renderItem={({ item }) => {
        const pasado = instanteTurno(item.fecha, item.inicio) <= ahora;
        const deshabilitado = pasado || item.estado !== 'libre' || sinRed || local || reservando || cargandoSesion || (!!usuario && !puedeReservar);
        const precio = precioLegible(item.precio);
        const estado = pasado ? 'Pasado' : etiquetasTurno[item.estado];
        return <PressableSurface onPress={() => elegir(item)} disabled={deshabilitado}
          accessibilityState={{ disabled: deshabilitado }}
          style={[styles.filaTurno, { borderColor: colors.border, backgroundColor: deshabilitado ? colors.background : colors.surface }]}
          accessibilityLabel={item.inicio + ' a ' + item.fin + '. ' + (pasado ? 'Turno pasado, no reservable' : estado + (item.estado === 'libre' ? '. ' + precio : ''))}>
          <View style={uiLayout.row}>
            <View style={uiLayout.grow}>
              <Text numeric variant="action" tone={pasado ? 'muted' : 'text'}>{item.inicio}–{item.fin}</Text>
              {item.motivoBloqueo && <Text variant="label" tone="muted">{item.motivoBloqueo}</Text>}
              {!pasado && item.estado === 'libre' && <Text numeric variant="label" tone="muted">{precio}</Text>}
            </View>
            <Badge variant={pasado ? 'neutral' : item.estado === 'libre' ? 'success' : item.estado === 'reservado' ? 'danger' : 'warning'}>{estado}</Badge>
            {!deshabilitado && <Ionicons name="chevron-forward" size={spacing.lg} color={colors.primary} />}
          </View>
        </PressableSurface>;
      }} />

    <Modal visible={catalogoAbierto} transparent animationType="slide" onRequestClose={() => setCatalogoAbierto(false)}>
      <View style={[styles.fondoCatalogo, { backgroundColor: colors.scrim }]}>
        <Surface style={styles.catalogo} accessibilityViewIsModal>
          <View style={uiLayout.row}>
            <Text variant="title" accessibilityRole="header" style={uiLayout.grow}>Elegí una cancha</Text>
            <Button size="sm" variant="ghost" title="Cerrar" onPress={() => setCatalogoAbierto(false)} />
          </View>
          <ScrollView contentContainerStyle={styles.opciones}>
            <Text variant="label" tone="muted">Deporte</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
              <Chip selected={filtroDeporte === 'todos'} onPress={() => setFiltroDeporte('todos')}>Todos los deportes</Chip>
              {[...new Set(espacios.map(e => e.deporteId))].map(id =>
                <Chip key={id} accessibilityLabel={deporteDe(id)} selected={id === filtroDeporte}
                  onPress={() => setFiltroDeporte(id)}>{deporteDe(id)}</Chip>)}
            </ScrollView>
            <Text variant="label" tone="muted">Complejo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
              {complejosDisponibles.map(comp => <Chip key={comp} accessibilityLabel={comp === 'todos' ? 'Todos los complejos' : comp} selected={comp === filtroComplejo}
                onPress={() => setFiltroComplejo(comp)}>{comp === 'todos' ? 'Todos los complejos' : comp}</Chip>)}
            </ScrollView>
            {usuario && <Chip accessibilityLabel="Solo favoritos" selected={soloFavoritos}
              onPress={() => setSoloFavoritos(v => !v)}>Solo favoritos</Chip>}
            {!espaciosFiltrados.length && <>
              <Text tone="muted">{soloFavoritos && !usuario?.espaciosFavoritos.length ? 'Todavía no tenés favoritas.' : 'No hay canchas con estos filtros.'}</Text>
              <Button variant="ghost" title="Ver todas las canchas" onPress={limpiarFiltros} />
            </>}
            {espaciosFiltrados.map(e => {
              const foto = fotoDeCancha(e);
              const elegida = e.id === espacioId;
              return <PressableSurface key={e.id} selected={elegida} accessibilityLabel={'Ver horarios de ' + e.nombre}
                style={styles.cambiarCancha} onPress={() => {
                  setEspacioId(e.id);
                  setCatalogoAbierto(false);
                  void preferencias.setItem('ultimoEspacio', e.id).catch(() => undefined);
                }}>
                {foto && <Image source={foto} style={styles.miniatura} accessibilityLabel={portadaDeEjemplo(e) || e.imagenes.length ? 'Foto de cancha' : 'Imagen ilustrativa'} />}
                <View style={uiLayout.grow}>
                  <Text variant="label">{e.nombre}</Text>
                  <Text variant="caption" tone="muted">{deporteDe(e.deporteId)} · {e.superficie} · {e.iluminacion ? 'Con luz' : 'Sin luz'}</Text>
                  <Text variant="caption" tone="primary">{precioLegible(e.precioPorHora)}/h</Text>
                </View>
                <Ionicons name={elegida ? 'checkmark-circle' : 'chevron-forward'} size={spacing.xl} color={colors.primary} />
              </PressableSurface>;
            })}
          </ScrollView>
        </Surface>
      </View>
    </Modal>
    {seleccionado && seleccionado.fecha === fecha && espacio?.id === seleccionado.espacioId && <ReservaDialog
      key={seleccionado.id} turno={seleccionado} espacio={espacio}
      personasIniciales={personasIniciales} requiereIngreso={!usuario}
      deporte={deportes.find(d => d.id === espacio.deporteId)?.nombre ?? 'Cancha deportiva'}
      cargando={reservando} error={errorReserva} onConfirmar={confirmar} onCerrar={() => setSeleccionado(null)} />}
    {aviso && <DialogoAviso titulo={aviso.titulo} mensaje={aviso.mensaje} detalle={aviso.detalle}
      accionPrincipal={aviso.reservaId ? 'Ver QR' : 'Entendido'}
      onCerrar={() => setAviso(null)} onConfirmar={() => {
        setAviso(null);
        if (aviso.reservaId) router.push({ pathname: '/(tabs)/two', params: { reservaId: aviso.reservaId } });
      }} />}
  </Screen>;
}

const styles = StyleSheet.create({
  cabecera: { paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.md },
  seleccion: { overflow: 'hidden' },
  cambiarCancha: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm,
  },
  miniatura: { width: layout.courtThumbnail, height: layout.courtThumbnail, borderRadius: radius.input },
  fotoPrincipal: { width: '100%', aspectRatio: layout.mediaRatio, maxHeight: layout.mapHeight },
  resumenCancha: { padding: spacing.md, gap: spacing.sm },
  accionesCancha: { flexDirection: 'row', gap: spacing.sm },
  horizontal: { gap: spacing.xs },
  dia: {
    ...controlSizes.sm, minWidth: layout.dayWidth, alignItems: 'center',
    borderRadius: radius.input, borderCurve: borders.curve,
  },
  listaTurnos: { gap: spacing.xs },
  filaTurno: { ...controlSizes.sm, opacity: 1, borderRadius: radius.input },
  fondoCatalogo: { flex: 1, justifyContent: 'flex-end', padding: spacing.md },
  catalogo: { width: '100%', maxWidth: layout.formWidth, maxHeight: '88%', alignSelf: 'center', gap: spacing.sm },
  opciones: { gap: spacing.sm, paddingBottom: spacing.md },
});
