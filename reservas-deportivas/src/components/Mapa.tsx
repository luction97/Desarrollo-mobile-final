import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useNetworkState } from 'expo-network';
import { crearDocumentoMapa } from '../mapa/documento';
import { CoordenadasMapa, EstadoMapa, PuntoMapa, ATRIBUCION_URL, REPORTE_URL, enlacesDestino, leerMensajeMapa, puntoValido } from '../mapa/modelo';
import { VisorMapa } from './mapa/VisorMapa';

export function Mapa({ puntos }: { puntos: PuntoMapa[] }) {
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

  if (!validos.length) return <Text style={styles.texto}>No hay coordenadas guardadas para mostrar.</Text>;
  return <View style={styles.contenedor}>
    <Text style={styles.texto}>Mapa de complejos. La cartografía en línea es provista por OpenStreetMap; recibe tu IP y el área consultada.</Text>
    <View style={styles.visor}>
      <VisorMapa key={intento} html={html} onMensaje={recibir} onError={() => setEstado('error')} />
    </View>
    <Text accessibilityLiveRegion="polite" style={styles.texto}>
      {sinRed ? 'Sin conexión. Se muestran los datos locales; el fondo cartográfico puede no estar disponible.'
        : estado === 'error' ? 'No se pudo cargar toda la cartografía. Los datos y coordenadas siguen disponibles.'
        : estado === 'cargando' ? 'Cargando cartografía…' : 'Cartografía disponible.'}
    </Text>
    {(estado === 'error' || sinRed) && <Accion titulo="Reintentar mapa" onPress={() => setIntento(n => n + 1)} />}
    <Text accessibilityLiveRegion="polite" style={styles.texto}>{mensaje}</Text>
    <Accion titulo={buscando ? 'Obteniendo ubicación…' : 'Mostrar mi ubicación'} onPress={() => void localizar()} disabled={buscando} />
    {ajustes && <Accion titulo="Abrir ajustes de ubicación" onPress={() => { void Linking.openSettings().catch(() => setMensaje('Abrí los permisos desde los ajustes del dispositivo.')); }} />}
    {ubicacion && <Accion titulo="Ocultar mi ubicación" onPress={() => { setUbicacion(null); setMensaje('Tu ubicación está oculta.'); }} />}
    {validos.map(p => <View key={p.id} style={[styles.punto, seleccion === p.id && styles.seleccionado]}>
      <Text style={styles.nombre}>{p.nombre}</Text>
      <Text selectable style={styles.texto}>{p.latitud.toFixed(6)}, {p.longitud.toFixed(6)}</Text>
      <Accion titulo={`Cómo llegar a ${p.nombre}`} onPress={() => void llegar(p)} />
    </View>)}
    <Accion titulo="© OpenStreetMap contributors · Licencia" onPress={() => void abrirEnlace(ATRIBUCION_URL)} />
    <Accion titulo="Informar un problema del mapa" onPress={() => void abrirEnlace(REPORTE_URL)} />
  </View>;
}

function Accion({ titulo, onPress, disabled = false }: { titulo: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.boton, (pressed || disabled) && styles.atenuado]}>
    <Text style={styles.enlace}>{titulo}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  contenedor: { gap: 8, marginBottom: 16 },
  visor: { height: 280, borderRadius: 10, overflow: 'hidden', backgroundColor: '#edf1eb' },
  texto: { color: '#374151', fontSize: 14, lineHeight: 21 },
  nombre: { color: '#111827', fontSize: 16, fontWeight: '600' },
  punto: { padding: 10, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8 },
  seleccionado: { borderColor: '#2e7d32', borderWidth: 2 },
  boton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#eef4ee', borderRadius: 8 },
  enlace: { color: '#14532d', fontSize: 15, fontWeight: '600' },
  atenuado: { opacity: 0.6 },
});
