import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, LayoutChangeEvent, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Network from 'expo-network';
import { Badge, Button, Chip, PressableSurface, Screen, StateView, Surface, Text, uiLayout } from '../../src/components/ui';
import { DialogoAviso } from '../../src/components/DialogoAviso';
import { ReservaDialog } from '../../src/components/ReservaDialog';
import { borders, interaction, layout, radius, spacing, useTheme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { consultarGrilla } from '../../src/services/turnos';
import { obtenerDeportes, obtenerEspacios, obtenerEspaciosLocales } from '../../src/services/espacios';
import { crearReserva } from '../../src/services/reservas';
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
import { fotoDeCancha } from '../../src/canchas/imagenes';

interface Aviso { titulo: string; mensaje?: string; detalle?: string; verQr?: boolean }

export default function DisponibilidadScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ espacioId?: string; fecha?: string; turnoId?: string; personas?: string }>();
  const { usuario, logout, cargando: cargandoSesion } = useAuth();
  const { puedeReservar } = permisosDe(usuario);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [espacioElegidoId, setEspacioId] = useState('');
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
  const [sinRed, setSinRed] = useState(false);
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
  const [abiertoDeporte, setAbiertoDeporte] = useState(false);
  const [abiertoComplejo, setAbiertoComplejo] = useState(false);
  const operando = useRef(false);
  const generacion = useRef(0);
  const espaciosFavoritos = usuario?.espaciosFavoritos;
  const espaciosFiltrados = useMemo(() => espacios.filter(e =>
    (filtroDeporte === 'todos' || e.deporteId === filtroDeporte) &&
    (filtroComplejo === 'todos' || e.complejo === filtroComplejo) &&
    (!soloFavoritos || !espaciosFavoritos || espaciosFavoritos.includes(e.id))),
  [espacios, filtroDeporte, filtroComplejo, soloFavoritos, espaciosFavoritos]);
  const espacio = espaciosFiltrados.find(e => e.id === espacioElegidoId) ?? espaciosFiltrados[0] ?? null;
  const espacioId = espacio?.id ?? '';

  useEffect(() => { setSoloFavoritos(false); }, [usuario?.id]);

  useEffect(() => {
    let activo = true;
    const aplicar = (datos: Espacio[], favorito: string | null) => {
      if (!activo) return;
      const canchas = catalogoDeEspacios(datos);
      setEspacios(canchas);
      if (canchas.length) setCargandoCatalogo(false);
      setEspacioId(actual => canchas.some(e => e.id === params.espacioId) ? params.espacioId!
        : canchas.some(e => e.id === actual) ? actual : canchas.find(e => e.id === favorito)?.id ?? canchas[0]?.id ?? '');
    };
    const cargar = async () => {
      setCargandoCatalogo(true); setError(null);
      const favorito = await preferencias.getItem('ultimoEspacio').catch(() => null);
      const locales = await obtenerEspaciosLocales().catch(() => []);
      aplicar(locales, favorito);
      try { const resultado = await obtenerEspacios(); aplicar(resultado.datos, favorito); }
      catch (e) { if (activo && !locales.length) setError(e instanceof Error ? e.message : 'No se pudieron cargar las canchas.'); }
      const listaDeportes = await obtenerDeportes();
      if (activo) { setDeportes(listaDeportes); setCargandoCatalogo(false); }
    };
    void cargar();
    return () => { activo = false; };
  }, [params.espacioId, intentoCatalogo]);

  useEffect(() => {
    if (params.fecha && dias.some(d => d.fecha === params.fecha)) setFecha(params.fecha);
  }, [params.fecha, dias]);

  useEffect(() => { setVerAnteriores(false); }, [fecha, espacioId]);

  useEffect(() => {
    let activo = true;
    void Network.getNetworkStateAsync().then(red => { if (activo) setSinRed(red.isConnected === false); }).catch(() => undefined);
    const listener = Network.addNetworkStateListener(red => setSinRed(red.isConnected === false));
    return () => { activo = false; listener.remove(); };
  }, []);

  const cargarGrilla = useCallback(async () => {
    if (!espacioId) { generacion.current++; setTurnos([]); setLocal(false); setCargando(false); return; }
    const version = ++generacion.current;
    setCargando(true); setError(null);
    try {
      const resultado = await consultarGrilla(espacioId, fecha);
      if (version !== generacion.current) return;
      setTurnos(resultado.datos);
      setLocal(resultado.local);
      if (usuario && params.turnoId && params.espacioId === espacioId && params.fecha === fecha
        && borradorRecuperado.current !== params.turnoId && !resultado.local) {
        borradorRecuperado.current = params.turnoId;
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
  }, [espacioId, fecha, usuario?.id, puedeReservar, params.turnoId, params.espacioId, params.fecha, params.personas]);

  useFocusEffect(useCallback(() => {
    void cargarGrilla();
    return () => { generacion.current++; };
  }, [cargarGrilla, sinRed]));

  const refCarrusel = useRef<ScrollView>(null);
  const [anchoCarrusel, setAnchoCarrusel] = useState(0);
  const paddingCarrusel = anchoCarrusel > 0 ? Math.max((anchoCarrusel - layout.courtCardWidth) / 2, 0) : 0;

  const centrarCancha = useCallback((indice: number) => {
    refCarrusel.current?.scrollTo({ x: indice * (layout.courtCardWidth + spacing.md), y: 0, animated: false });
  }, []);

  const centrarSobreSeleccion = useCallback(() => {
    if (!espacio) return;
    const indice = espaciosFiltrados.findIndex(e => e.id === espacioId);
    if (indice < 0) return;
    centrarCancha(indice);
  }, [espacio, espacioId, espaciosFiltrados, centrarCancha]);

  useEffect(() => { centrarSobreSeleccion(); }, [centrarSobreSeleccion]);

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
    if (!seleccionado || !espacio || operando.current || seleccionado.espacioId !== espacioId) return;
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
      setAviso({ titulo: 'Reserva confirmada', mensaje: resultado.guardadaLocalmente ? 'Tu QR está guardado para verlo sin conexión.' : 'No pudimos guardar el QR en este teléfono. Abrí Mis reservas con conexión para guardarlo.', verQr: true });
    } catch (e) { setErrorReserva(e instanceof Error ? e.message : 'No se pudo reservar.'); }
    finally { operando.current = false; setReservando(false); }
  };

  const salir = async () => {
    try { await logout(); }
    catch { setAviso({ titulo: 'No se pudo cerrar sesión', mensaje: 'Volvé a intentar.' }); }
  };

  const grilla = ordenarTurnosParaMostrar(turnos.filter(t => t.espacioId === espacioId && t.fecha === fecha));
  const anteriores = fecha === hoy ? grilla.filter(t => instanteTurno(t.fecha, t.inicio) <= ahora) : [];
  const visibles = [...grilla.slice(anteriores.length), ...(verAnteriores ? anteriores : [])];
  const complejosDisponibles = ['todos', ...new Set(espacios.map(e => e.complejo).filter(c => c && c.trim() !== '' && c !== '—' && c !== '-'))];
  const limpiarFiltros = () => { setSoloFavoritos(false); setFiltroDeporte('todos'); setFiltroComplejo('todos'); };

  const cabecera = <View style={styles.cabecera}>
    <View style={uiLayout.row}>
      <Text variant="title" style={uiLayout.grow}>Hola, {usuario ? usuario.nombre.split(' ')[0] : 'Invitado'}</Text>
      {usuario ? <Button variant="ghost" size="sm" title="Salir" onPress={salir} />
        : <Button size="sm" title="Entrar" onPress={() => router.push('/login')} />}
    </View>
    {(sinRed || local) && <Text accessibilityLiveRegion="polite" variant="label" tone="warning">Sin conexión · Mostramos los horarios guardados</Text>}

    <View style={styles.filtrosRow}>
      <View style={styles.filtroCol}>
        <PressableSurface accessibilityLabel="Filtrar por deporte" accessibilityState={{ expanded: abiertoDeporte }} style={styles.desplegable} onPress={() => { setAbiertoDeporte(v => !v); setAbiertoComplejo(false); }}>
          <Text numberOfLines={1}>{filtroDeporte === 'todos' ? 'Deporte' : deportes.find(d => d.id === filtroDeporte)?.nombre ?? 'Otro deporte'}</Text>
          <Text tone="muted">▼</Text>
        </PressableSurface>
        <Modal visible={abiertoDeporte} transparent animationType="fade" onRequestClose={() => setAbiertoDeporte(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setAbiertoDeporte(false)}>
            <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 110 }]}>
              {['todos', ...new Set(espacios.map(e => e.deporteId))].map(dep => (
                <PressableSurface key={dep} accessibilityLabel={dep === 'todos' ? 'Todos los deportes' : deportes.find(d => d.id === dep)?.nombre ?? 'Otro deporte'} style={styles.opcion} onPress={() => { setFiltroDeporte(dep); setAbiertoDeporte(false); }}>
                  <Text>{dep === 'todos' ? 'Todos los deportes' : deportes.find(d => d.id === dep)?.nombre ?? 'Otro deporte'}</Text>
                </PressableSurface>
              ))}
            </View>
          </Pressable>
        </Modal>
      </View>
      <View style={styles.filtroCol}>
        <PressableSurface accessibilityLabel="Filtrar por complejo" accessibilityState={{ expanded: abiertoComplejo }} style={styles.desplegable} onPress={() => { setAbiertoComplejo(v => !v); setAbiertoDeporte(false); }}>
          <Text numberOfLines={1}>{filtroComplejo === 'todos' ? 'Complejo' : filtroComplejo}</Text>
          <Text tone="muted">▼</Text>
        </PressableSurface>
        <Modal visible={abiertoComplejo} transparent animationType="fade" onRequestClose={() => setAbiertoComplejo(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setAbiertoComplejo(false)}>
            <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 110 }]}>
              {complejosDisponibles.map(comp => (
                <PressableSurface key={comp} accessibilityLabel={comp === 'todos' ? 'Todos los complejos' : comp} style={styles.opcion} onPress={() => { setFiltroComplejo(comp); setAbiertoComplejo(false); }}>
                  <Text>{comp === 'todos' ? 'Todos los complejos' : comp}</Text>
                </PressableSurface>
              ))}
            </View>
          </Pressable>
        </Modal>
      </View>
    </View>

    <View style={uiLayout.row}>
      <Text variant="label" tone="muted">Elegí una cancha</Text>
      {usuario && <Chip selected={soloFavoritos} accessibilityLabel="Solo favoritos" onPress={() => setSoloFavoritos(v => !v)}>Solo favoritos</Chip>}
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.cardsRow, { paddingHorizontal: paddingCarrusel }]} accessibilityLabel="Canchas disponibles" onLayout={(evento: LayoutChangeEvent) => setAnchoCarrusel(evento.nativeEvent.layout.width)} onContentSizeChange={() => centrarSobreSeleccion()} ref={refCarrusel}>
      {espaciosFiltrados.map(e => {
        const foto = fotoDeCancha(e);
        const elegida = e.id === espacioId;
        return (
          <Surface key={e.id} variant="outlined" padding="none" style={[styles.card, {
            borderColor: elegida ? colors.primary : colors.border,
            backgroundColor: elegida ? colors.primaryContainer : colors.surface,
          }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Ver horarios de ${e.nombre}`} accessibilityState={{ selected: elegida }}
              style={({ pressed }) => ({ opacity: pressed ? interaction.pressedOpacity : 1 })}
              onPress={() => { setEspacioId(e.id); void preferencias.setItem('ultimoEspacio', e.id).catch(() => undefined); const indice = espaciosFiltrados.findIndex(c => c.id === e.id); centrarCancha(indice >= 0 ? indice : 0); }}>
              {foto && <Image source={foto} style={styles.cardImage} accessibilityLabel={`Foto de ${e.nombre}`} />}
              <View style={styles.cardInfo}>
                <Text variant="subtitle" numberOfLines={2}>{e.nombre.split(/[—-]/)[0].trim()}</Text>
                <Text variant="label" tone="muted" numberOfLines={1}>{deportes.find(d => d.id === e.deporteId)?.nombre ?? 'Cancha deportiva'}</Text>
                <Text numeric variant="action" tone="primary">{precioLegible(e.precioPorHora)} / hora</Text>
                <Text variant="label" tone={elegida ? 'primary' : 'muted'}>{elegida ? 'Seleccionada' : 'Ver horarios'}</Text>
              </View>
            </Pressable>
            <View style={styles.cardAcciones}>
              <Button size="sm" variant="ghost" title="Ver detalles" onPress={() => router.push({ pathname: '/espacio/[id]', params: { id: e.id } })} />
              <FavoritoToggle espacioId={e.id} nombre={e.nombre} />
            </View>
          </Surface>
        );
      })}
    </ScrollView>

    {espacio && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
      {dias.map(d => <PressableSurface key={d.fecha} selected={d.fecha === fecha} accessibilityLabel={`${d.nombre} ${fechaLegible(d.fecha)}`}
        onPress={() => setFecha(d.fecha)} style={styles.dia}>
        <Text variant="label" tone={d.fecha === fecha ? 'primary' : 'muted'}>{d.nombre}</Text>
        <Text numeric variant="title">{d.fecha.slice(-2)}</Text>
      </PressableSurface>)}
    </ScrollView>}
    {espacio && <Text variant="subtitle" accessibilityRole="header" accessibilityLiveRegion="polite">Horarios de {espacio.nombre}</Text>}
  </View>;

  return <Screen topInset>
    <FlatList data={!espacio || cargando || error ? [] : visibles} keyExtractor={t => t.id}
      contentInsetAdjustmentBehavior="automatic" contentContainerStyle={uiLayout.listContent}
      ListHeaderComponent={cabecera} ListEmptyComponent={cargandoCatalogo || cargando ? <StateView><ActivityIndicator color={colors.primary} /><Text tone="muted">Cargando horarios...</Text></StateView>
        : error && (espacio || !espacios.length) ? <StateView><Text selectable accessibilityRole="alert" tone="danger">{error}</Text><Button title="Reintentar" onPress={() => espacios.length ? cargarGrilla() : setIntentoCatalogo(v => v + 1)} /></StateView>
        : !espacio ? <StateView><Text tone="muted">{soloFavoritos && !usuario?.espaciosFavoritos.length
          ? 'Todavía no tenés favoritas. Tocá el corazón de una cancha para guardarla.'
          : 'No hay canchas con estos filtros.'}</Text><Button title="Ver todas las canchas" variant="secondary" onPress={limpiarFiltros} /></StateView>
        : <StateView><Text tone="muted">{local ? 'No hay horarios guardados para esta fecha.' : 'No quedan horarios para mostrar en esta fecha.'}</Text></StateView>}
      ListFooterComponent={espacio && !cargando && !error && anteriores.length > 0
        ? <Button variant="ghost" title={verAnteriores ? 'Ocultar anteriores' : 'Ver anteriores'}
          onPress={() => setVerAnteriores(v => !v)} /> : null}
      renderItem={({ item }) => {
        const pasado = instanteTurno(item.fecha, item.inicio) <= ahora;
        const deshabilitado = pasado || item.estado !== 'libre' || reservando || cargandoSesion || (!!usuario && !puedeReservar);
        const precio = precioLegible(item.precio);
        return <PressableSurface onPress={() => elegir(item)} disabled={deshabilitado} accessibilityState={{ disabled: deshabilitado }}
          accessibilityLabel={`${item.inicio} a ${item.fin}. ${pasado ? 'Turno pasado, no reservable' : item.estado === 'libre' ? `Disponible. ${precio}` : etiquetasTurno[item.estado]}`}>
          <View style={uiLayout.row}>
            <View style={uiLayout.grow}>
              <Text numeric variant="action" tone={pasado ? 'muted' : 'text'}>{item.inicio} - {item.fin}</Text>
              {item.motivoBloqueo && <Text variant="label" tone="muted">{item.motivoBloqueo}</Text>}
              {pasado && <Text variant="label" tone="muted">Turno pasado · No reservable</Text>}
              {item.estado === 'libre' && !pasado && <Text numeric variant="label" tone="primary">{precio}</Text>}
            </View>
            <Badge variant={pasado ? 'neutral' : item.estado === 'libre' ? 'success' : item.estado === 'reservado' ? 'danger' : 'warning'}>{etiquetasTurno[item.estado]}</Badge>
          </View>
        </PressableSurface>;
      }} />
    {seleccionado && espacio?.id === seleccionado.espacioId && <ReservaDialog
      key={seleccionado.id} turno={seleccionado} espacio={espacio}
      personasIniciales={personasIniciales} requiereIngreso={!usuario}
      deporte={deportes.find(d => d.id === espacio.deporteId)?.nombre ?? 'Cancha deportiva'}
      cargando={reservando} error={errorReserva} onConfirmar={confirmar} onCerrar={() => setSeleccionado(null)} />}
    {aviso && <DialogoAviso titulo={aviso.titulo} mensaje={aviso.mensaje} detalle={aviso.detalle}
      accionPrincipal={aviso.verQr ? 'Ver QR' : 'Entendido'}
      onCerrar={() => setAviso(null)} onConfirmar={() => {
        setAviso(null);
        if (aviso.verQr) router.push('/(tabs)/two');
      }} />}
  </Screen>;
}

const styles = StyleSheet.create({
  cabecera: { paddingVertical: spacing.lg, gap: spacing.lg },
  filtrosRow: { flexDirection: 'row', gap: spacing.md },
  filtroCol: { flex: 1, gap: spacing.xs, position: 'relative', zIndex: 1 },
  desplegable: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.input, borderWidth: 1 },
  menu: { borderRadius: radius.card, padding: spacing.sm, gap: spacing.xs, borderWidth: 1, elevation: 8, zIndex: 20 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-start', paddingTop: spacing.xl },
  opcion: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.input },
  cardsRow: { gap: spacing.md, paddingVertical: spacing.sm },
  card: { width: layout.courtCardWidth, overflow: 'hidden', borderWidth: borders.focus },
  cardAcciones: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
  cardImage: { width: '100%', height: 120, resizeMode: 'cover' },
  cardInfo: { padding: spacing.md, gap: spacing.xs },
  horizontal: { gap: spacing.sm },
  dia: { minWidth: layout.dayWidth, alignItems: 'center', borderRadius: radius.input, borderCurve: borders.curve },
});
