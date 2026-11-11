import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Network from 'expo-network';
import { Badge, Button, PressableSurface, Screen, StateView, Text, uiLayout } from '../../src/components/ui';
import { DialogoAviso } from '../../src/components/DialogoAviso';
import { ReservaDialog } from '../../src/components/ReservaDialog';
import { borders, layout, radius, spacing, useTheme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { consultarGrilla } from '../../src/services/turnos';
import { obtenerDeportes, obtenerEspacios, obtenerEspaciosLocales } from '../../src/services/espacios';
import { crearReserva } from '../../src/services/reservas';
import preferencias from '../../src/services/preferencias';
import { fechaArgentina, fechaLegible, instanteTurno } from '../../src/utils/fechas';
import { ordenarTurnosParaMostrar } from '../../src/utils/turnos';
import type { Deporte, Espacio, Turno } from '../../src/tipos';
import { seleccionarCanchasDeEjemplo } from '../../src/canchas/modelo';
import { fotoDeCancha } from '../../src/canchas/imagenes';

interface Aviso { titulo: string; mensaje?: string; detalle?: string; ingreso?: boolean; verQr?: boolean }

export default function DisponibilidadScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ espacioId?: string; fecha?: string }>();
  const { usuario, logout, cargando: cargandoSesion } = useAuth();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [fecha, setFecha] = useState(fechaArgentina());
  const [dias] = useState(() => Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(`${fechaArgentina()}T12:00:00-03:00`);
    dia.setUTCDate(dia.getUTCDate() + i);
    return { fecha: fechaArgentina(dia), nombre: i === 0 ? 'Hoy' : new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(dia) };
  }));
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinRed, setSinRed] = useState(false);
  const [local, setLocal] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [seleccionado, setSeleccionado] = useState<Turno | null>(null);
  const [reservando, setReservando] = useState(false);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);
  const [filtroDeporte, setFiltroDeporte] = useState<string>('todos');
  const [filtroComplejo, setFiltroComplejo] = useState<string>('todos');
  const [abiertoDeporte, setAbiertoDeporte] = useState(false);
  const [abiertoComplejo, setAbiertoComplejo] = useState(false);
  const operando = useRef(false);
  const generacion = useRef(0);
  const espacio = espacios.find(e => e.id === espacioId) ?? null;

  useEffect(() => {
    let activo = true;
    const aplicar = (datos: Espacio[], favorito: string | null) => {
      if (!activo) return;
      const canchas = seleccionarCanchasDeEjemplo(datos);
      setEspacios(canchas);
      setEspacioId(actual => canchas.some(e => e.id === params.espacioId) ? params.espacioId!
        : canchas.some(e => e.id === actual) ? actual : canchas.find(e => e.id === favorito)?.id ?? canchas[0]?.id ?? '');
    };
    const cargar = async () => {
      const favorito = await preferencias.getItem('ultimoEspacio').catch(() => null);
      const locales = await obtenerEspaciosLocales().catch(() => []);
      aplicar(locales, favorito);
      try { const resultado = await obtenerEspacios(); aplicar(resultado.datos, favorito); }
      catch (e) { if (activo && !locales.length) { setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo.'); setCargando(false); } }
      const listaDeportes = await obtenerDeportes();
      if (activo) setDeportes(listaDeportes);
    };
    void cargar();
    return () => { activo = false; };
  }, [params.espacioId]);

  useEffect(() => {
    if (params.fecha && dias.some(d => d.fecha === params.fecha)) setFecha(params.fecha);
  }, [params.fecha, dias]);

  useEffect(() => {
    let activo = true;
    void Network.getNetworkStateAsync().then(red => { if (activo) setSinRed(red.isConnected === false); }).catch(() => undefined);
    const listener = Network.addNetworkStateListener(red => setSinRed(red.isConnected === false));
    return () => { activo = false; listener.remove(); };
  }, []);

  const cargarGrilla = useCallback(async () => {
    if (!espacioId) { setCargando(false); return; }
    const version = ++generacion.current;
    setCargando(true); setError(null);
    try {
      const resultado = await consultarGrilla(espacioId, fecha);
      if (version === generacion.current) { setTurnos(resultado.datos); setLocal(resultado.local); }
    } catch (e) { if (version === generacion.current) setError(e instanceof Error ? e.message : 'No se pudo cargar la disponibilidad.'); }
    finally { if (version === generacion.current) setCargando(false); }
  }, [espacioId, fecha]);

  useFocusEffect(useCallback(() => {
    void cargarGrilla();
    return () => { generacion.current++; };
  }, [cargarGrilla, sinRed]));

  const elegir = (turno: Turno) => {
    if (turno.estado !== 'libre' || cargandoSesion || operando.current) return;
    if (instanteTurno(turno.fecha, turno.inicio) <= new Date()) {
      setAviso({ titulo: 'Este turno ya pasó', mensaje: 'Elegí un horario futuro para hacer tu reserva.' }); return;
    }
    if (!usuario) {
      setAviso({ titulo: 'Ingresá para reservar', detalle: `${fechaLegible(turno.fecha)} · ${turno.inicio}–${turno.fin}`, ingreso: true }); return;
    }
    if (usuario.rol !== 'jugador') { setAviso({ titulo: 'Cuenta de personal', mensaje: 'Las reservas se realizan con una cuenta de jugador.' }); return; }
    if (sinRed || local) { setAviso({ titulo: 'Conectate para reservar', mensaje: 'La disponibilidad guardada puede haber cambiado. Reintentá cuando tengas conexión.' }); return; }
    setErrorReserva(null); setSeleccionado(turno);
  };

  const confirmar = async (cantidad: number) => {
    if (!seleccionado || !espacio || !usuario || operando.current) return;
    operando.current = true; setReservando(true); setErrorReserva(null);
    try { const resultado = await crearReserva(seleccionado, espacio, cantidad, usuario.id);
      setTurnos(datos => datos.map(t => t.id === seleccionado.id ? { ...t, estado: 'reservado', reservaId: resultado.dato.reserva.id } : t));
      setSeleccionado(null);
      setAviso({ titulo: 'Reserva confirmada', mensaje: resultado.guardadaLocalmente ? 'Tu QR está guardado para verlo sin conexión.' : 'No pudimos guardar el QR en este teléfono. Abrí Mis Reservas con conexión para guardarlo.', verQr: true });
    } catch (e) { setErrorReserva(e instanceof Error ? e.message : 'No se pudo reservar.'); }
    finally { operando.current = false; setReservando(false); }
  };

  const salir = async () => {
    try { await logout(); }
    catch { setAviso({ titulo: 'No se pudo cerrar sesión', mensaje: 'Volvé a intentar.' }); }
  };

  const ahora = new Date();
  const complejosDisponibles = ['todos', ...new Set(espacios.map(e => e.complejo).filter(c => c && c.trim() !== '' && c !== '—' && c !== '-'))];
  const espaciosFiltrados = espacios.filter(e => {
    const cumpleDeporte = filtroDeporte === 'todos' || e.deporteId === filtroDeporte;
    const cumpleComplejo = filtroComplejo === 'todos' || e.complejo === filtroComplejo;
    return cumpleDeporte && cumpleComplejo;
  });

  const cabecera = <View style={styles.cabecera}>
    <View style={uiLayout.row}>
      <Text variant="title" style={uiLayout.grow}>Hola, {usuario ? usuario.nombre.split(' ')[0] : 'Invitado'}</Text>
      {usuario ? <Button variant="ghost" size="sm" title="Salir" onPress={salir} />
        : <Button size="sm" title="Entrar" onPress={() => router.push('/login')} />}
    </View>
    {(sinRed || local) && <Text accessibilityLiveRegion="polite" variant="label" tone="warning">Sin conexión con el servidor · Datos guardados</Text>}

    <View style={styles.filtrosRow}>
      <View style={styles.filtroCol}>
        <PressableSurface style={[styles.desplegable, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => { setAbiertoDeporte(v => !v); setAbiertoComplejo(false); }}>
          <Text numberOfLines={1}>{filtroDeporte === 'todos' ? 'DEPORTE' : deportes.find(d => d.id === filtroDeporte)?.nombre ?? filtroDeporte}</Text>
          <Text tone="muted">▼</Text>
        </PressableSurface>
        {abiertoDeporte && (
          <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {['todos', ...new Set(espacios.map(e => e.deporteId))].map(dep => (
              <PressableSurface key={dep} style={styles.opcion} onPress={() => { setFiltroDeporte(dep); setAbiertoDeporte(false); }}>
                <Text>{dep === 'todos' ? 'DEPORTE' : deportes.find(d => d.id === dep)?.nombre ?? dep}</Text>
              </PressableSurface>
            ))}
          </View>
        )}
      </View>
      <View style={styles.filtroCol}>
        <PressableSurface style={[styles.desplegable, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => { setAbiertoComplejo(v => !v); setAbiertoDeporte(false); }}>
          <Text numberOfLines={1}>{filtroComplejo === 'todos' ? 'COMPLEJO' : filtroComplejo}</Text>
          <Text tone="muted">▼</Text>
        </PressableSurface>
        {abiertoComplejo && (
          <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {complejosDisponibles.map(comp => (
              <PressableSurface key={comp} style={styles.opcion} onPress={() => { setFiltroComplejo(comp); setAbiertoComplejo(false); }}>
                <Text>{comp === 'todos' ? 'COMPLEJO' : comp}</Text>
              </PressableSurface>
            ))}
          </View>
        )}
      </View>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
      {espaciosFiltrados.map(e => {
        const foto = fotoDeCancha(e);
        return (
          <PressableSurface key={e.id} style={styles.card} onPress={() => { setEspacioId(e.id); void preferencias.setItem('ultimoEspacio', e.id).catch(() => undefined); }}>
            {foto && <Image source={foto} style={styles.cardImage} accessibilityLabel={`Foto de ${e.nombre}`} />}
            <View style={styles.cardInfo}>
              <Text variant="subtitle" numberOfLines={1}>{e.nombre}</Text>
              <Text variant="label" tone="muted" numberOfLines={1}>{deportes.find(d => d.id === e.deporteId)?.nombre ?? e.deporteId}</Text>
              <Text numeric variant="action" tone="primary">
                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(e.precioPorHora)} / hora
              </Text>
              <Button size="sm" variant="ghost" title="Detalle" onPress={() => router.push({ pathname: '/espacio/[id]', params: { id: e.id } })} />
            </View>
          </PressableSurface>
        );
      })}
    </ScrollView>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
      {dias.map(d => <PressableSurface key={d.fecha} selected={d.fecha === fecha} accessibilityLabel={`${d.nombre} ${fechaLegible(d.fecha)}`}
        onPress={() => setFecha(d.fecha)} style={styles.dia}>
        <Text variant="label" tone={d.fecha === fecha ? 'primary' : 'muted'}>{d.nombre}</Text>
        <Text numeric variant="title">{d.fecha.slice(-2)}</Text>
      </PressableSurface>)}
    </ScrollView>
  </View>;

  return <Screen topInset>
    <FlatList data={cargando || error ? [] : ordenarTurnosParaMostrar(turnos, ahora)} keyExtractor={t => t.id}
      key={`${espacioId}:${fecha}`} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={uiLayout.listContent}
      ListHeaderComponent={cabecera} ListEmptyComponent={cargando ? <StateView><ActivityIndicator color={colors.primary} /><Text tone="muted">Cargando disponibilidad...</Text></StateView>
        : error ? <StateView><Text selectable accessibilityRole="alert" tone="danger">{error}</Text><Button title="Reintentar" onPress={cargarGrilla} /></StateView>
        : <StateView><Text tone="muted">{local ? 'No hay horarios guardados para esta fecha.' : 'No hay turnos disponibles para este día.'}</Text></StateView>}
      renderItem={({ item }) => {
        const pasado = instanteTurno(item.fecha, item.inicio) <= ahora;
        const deshabilitado = pasado || item.estado !== 'libre' || reservando || cargandoSesion;
        const precio = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(item.precio);
        return <PressableSurface onPress={() => elegir(item)} disabled={deshabilitado} accessibilityState={{ disabled: deshabilitado }}
          accessibilityLabel={`${item.inicio} a ${item.fin}. ${pasado ? 'Turno pasado, no reservable' : item.estado === 'libre' ? `Disponible. ${precio}` : item.estado}`}>
          <View style={uiLayout.row}>
            <View style={uiLayout.grow}>
              <Text numeric variant="action" tone={pasado ? 'muted' : 'text'}>{item.inicio} - {item.fin}</Text>
              {item.motivoBloqueo && <Text variant="label" tone="muted">{item.motivoBloqueo}</Text>}
              {pasado && <Text variant="label" tone="muted">Turno pasado · No reservable</Text>}
              {item.estado === 'libre' && !pasado && <Text numeric variant="label" tone="primary">{precio}</Text>}
            </View>
            <Badge variant={pasado ? 'neutral' : item.estado === 'libre' ? 'success' : item.estado === 'reservado' ? 'danger' : 'warning'}>{item.estado.toUpperCase()}</Badge>
          </View>
        </PressableSurface>;
      }} />
    {seleccionado && espacio && <ReservaDialog turno={seleccionado} espacio={espacio}
      deporte={deportes.find(d => d.id === espacio.deporteId)?.nombre ?? espacio.deporteId.replace('dep-', '')}
      cargando={reservando} error={errorReserva} onConfirmar={confirmar} onCerrar={() => setSeleccionado(null)} />}
    {aviso && <DialogoAviso titulo={aviso.titulo} mensaje={aviso.mensaje} detalle={aviso.detalle}
      accionPrincipal={aviso.ingreso ? 'Iniciar sesión' : aviso.verQr ? 'Ver QR' : 'Entendido'} accionSecundaria={aviso.ingreso ? 'Ahora no' : undefined}
      onCerrar={() => setAviso(null)} onConfirmar={() => {
        setAviso(null);
        if (aviso.ingreso) router.push({ pathname: '/login', params: { espacioId, fecha } });
        if (aviso.verQr) router.push('/(tabs)/two');
      }} />}
  </Screen>;
}

const styles = StyleSheet.create({
  cabecera: { paddingVertical: spacing.lg, gap: spacing.lg },
  filtrosRow: { flexDirection: 'row', gap: spacing.md },
  filtroCol: { flex: 1, gap: spacing.xs, position: 'relative', zIndex: 1 },
  desplegable: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.input, borderWidth: 1 },
  menu: { position: 'absolute', top: 46, left: 0, right: 0, borderRadius: radius.card, padding: spacing.sm, gap: spacing.xs, borderWidth: 1, elevation: 8, zIndex: 20 },
  opcion: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.input },
  cardsRow: { gap: spacing.md, paddingVertical: spacing.sm },
  card: { width: 220, padding: spacing.none, overflow: 'hidden', borderRadius: radius.card },
  cardImage: { width: '100%', height: 120, resizeMode: 'cover' },
  cardInfo: { padding: spacing.md, gap: spacing.xs },
  horizontal: { gap: spacing.sm },
  dia: { minWidth: layout.dayWidth, alignItems: 'center', borderRadius: radius.input, borderCurve: borders.curve },
});
