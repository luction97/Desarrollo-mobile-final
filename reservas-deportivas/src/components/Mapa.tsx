import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Badge, Button, Surface, Text } from './ui';
import { borders, layout, radius, spacing, useTheme } from '../theme';
import { distanciaLegible, distanciaMetros } from '../utils/distancias';
import * as Location from 'expo-location';
import { useNetworkState } from 'expo-network';
import { crearDocumentoMapa } from '../mapa/documento';
import { CoordenadasMapa, EstadoMapa, PuntoMapa, ATRIBUCION_URL, REPORTE_URL, enlacesDestino, leerMensajeMapa, puntoValido } from '../mapa/modelo';
import { VisorMapa } from './mapa/VisorMapa';

export function Mapa({ puntos }: { puntos: PuntoMapa[] }) {
  const { colors } = useTheme();
  const validos = useMemo(() => puntos.filter(puntoValido), [puntos]);
  const [ubicacion, setUbicacion] = useState<CoordenadasMapa | null>(null);
  const [mensaje, setMensaje] = useState('Tu ubicación es opcional y solo se usa mientras consultás esta pantalla.');
  const [buscando, setBuscando] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoMapa>('cargando');
  const [intento, setIntento] = useState(0);
  const activo = useRef(true);
  const red = useNetworkState();
  const sinRed = red.isConnected === false || red.isInternetReachable === false;
  const html = useMemo(() => crearDocumentoMapa(validos, ubicacion, sinRed), [validos, ubicacion, sinRed]);
  useEffect(() => { activo.current = true; return () => { activo.current = false; }; }, []);
  useEffect(() => {
    setEstado('cargando');
    const plazo = setTimeout(() => setEstado(actual => actual === 'cargando' ? 'error' : actual), 15000);
    return () => clearTimeout(plazo);
  }, [html, intento]);

  const abrirEnlace = useCallback(async (url: string) => {
    try { await Linking.openURL(url); } catch { setMensaje('No se pudo abrir el enlace.'); }
  }, []);
  const recibir = useCallback((datos: string) => {
    const m = leerMensajeMapa(datos, validos);
    if (m?.tipo === 'estado') setEstado(m.estado);
    if (m?.tipo === 'seleccion') setSeleccion(m.id);
    if (m?.tipo === 'enlace') void abrirEnlace(m.url);
  }, [validos, abrirEnlace]);

  const localizar = async () => {
    if (buscando) return;
    setBuscando(true);
    setAjustes(false);
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!activo.current) return;
      if (permiso.status !== 'granted') {
        setAjustes(!permiso.canAskAgain && Platform.OS !== 'web');
        setMensaje('Ubicación no autorizada. Los complejos y Cómo llegar siguen disponibles.');
        return;
      }
      if (!await Location.hasServicesEnabledAsync()) throw new Error('servicio');
      const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => { temporizador = setTimeout(() => reject(new Error('tiempo')), 12000); }),
      ]);
      if (!activo.current) return;
      setUbicacion({ latitud: loc.coords.latitude, longitud: loc.coords.longitude });
      setMensaje('Tu ubicación se muestra en azul. No se guarda ni se envía al servidor de reservas.');
    } catch {
      if (activo.current) setMensaje('No se pudo obtener tu ubicación. Podés consultar los complejos y abrir Cómo llegar.');
    } finally {
      clearTimeout(temporizador);
      if (activo.current) setBuscando(false);
    }
  };

  const llegar = async (p: PuntoMapa) => {
    for (const url of enlacesDestino(p, Platform.OS)) {
      try { await Linking.openURL(url); return; } catch { /* Prueba el enlace web si no hay app de mapas. */ }
    }
    setMensaje('No se pudo abrir una aplicación de mapas. Usá las coordenadas indicadas.');
  };

  const ordenados = ubicacion ? [...validos].sort((a, b) => distanciaMetros(ubicacion, a) - distanciaMetros(ubicacion, b) || a.id.localeCompare(b.id)) : validos;

  if (!validos.length) return <Text tone="muted" variant="label">No hay coordenadas guardadas para mostrar.</Text>;
  return <View style={styles.contenedor}>
    <Text tone="muted" variant="caption">Mapa de complejos. La cartografía en línea es provista por OpenStreetMap; recibe tu IP y el área consultada.</Text>
    <View style={[styles.visor, { backgroundColor: colors.primaryContainer }]}>
      <VisorMapa key={intento} html={html} onMensaje={recibir} onError={() => setEstado('error')} />
    </View>
    <Text tone="muted" variant="label" accessibilityLiveRegion="polite">
      {sinRed ? 'Sin conexión. Se muestran los datos locales; el fondo cartográfico puede no estar disponible.'
        : estado === 'error' ? 'No se pudo cargar toda la cartografía. Los datos y coordenadas siguen disponibles.'
        : estado === 'cargando' ? 'Cargando cartografía…' : 'Cartografía disponible.'}
    </Text>
    {(estado === 'error' || sinRed) && <Accion titulo="Reintentar mapa" onPress={() => setIntento(n => n + 1)} />}
    <Text tone="muted" variant="label" accessibilityLiveRegion="polite">{mensaje}</Text>
    <Accion titulo={buscando ? 'Obteniendo ubicación…' : 'Mostrar mi ubicación'} onPress={() => void localizar()} disabled={buscando} />
    {ajustes && <Accion titulo="Abrir ajustes de ubicación" onPress={() => { void Linking.openSettings().catch(() => setMensaje('Abrí los permisos desde los ajustes del dispositivo.')); }} />}
    {ubicacion && <Accion titulo="Ocultar mi ubicación" onPress={() => { setUbicacion(null); setMensaje('Tu ubicación está oculta.'); }} />}
    {ordenados.map((p, indice) => <Surface variant="outlined" key={p.id} style={[styles.punto, seleccion === p.id && { borderColor: colors.primary, borderWidth: borders.focus }]}>
      <Text variant="action">{p.nombre}</Text>
      {ubicacion && <>
        {indice === 0 && <Badge variant="success">Más cercano de los mostrados</Badge>}
        <Text variant="label">A {distanciaLegible(distanciaMetros(ubicacion, p))} en línea recta</Text>
      </>}
      <Text selectable numeric variant="label" tone="muted">{p.latitud.toFixed(6)}, {p.longitud.toFixed(6)}</Text>
      <Accion titulo={`Cómo llegar a ${p.nombre}`} onPress={() => void llegar(p)} />
    </Surface>)}
    <Accion titulo="© OpenStreetMap contributors · Licencia" onPress={() => void abrirEnlace(ATRIBUCION_URL)} />
    <Accion titulo="Informar un problema del mapa" onPress={() => void abrirEnlace(REPORTE_URL)} />
  </View>;
}

function Accion({ titulo, onPress, disabled = false }: { titulo: string; onPress: () => void; disabled?: boolean }) {
  return <Button variant="secondary" size="sm" title={titulo} disabled={disabled} onPress={onPress} />;
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.md, marginBottom: spacing.lg },
  visor: { height: layout.mapHeight, borderRadius: radius.card, borderCurve: borders.curve, overflow: 'hidden' },
  punto: { gap: spacing.sm },
});
