import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { useEvent } from 'expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import Ionicons from '@react-native-vector-icons/ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Badge, Button, PressableSurface, Screen, ScrollScreen, StateView, Text, uiLayout } from '../../src/components/ui';
import { Mapa } from '../../src/components/Mapa';
import { FavoritoToggle } from '../../src/components/favoritos';
import { layout, radius, spacing, useTheme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useSinRed } from '../../src/hooks/useSinRed';
import { obtenerEspacio, obtenerEspacioLocal } from '../../src/services/espacios';
import { borrarFotoEstado, borrarVideoGrabado, guardarDescarga, guardarFotoEstado, guardarVideoGrabado, obtenerDescarga, obtenerFotoEstado, obtenerVideoGrabado } from '../../src/services/medios';
import { subirFoto, subirVideo } from '../../src/services/archivos';
import { GrabarVideoCancha } from '../../src/components/GrabarVideoCancha';
import { ApiError } from '../../src/services/api';
import { puntosDeEspacios } from '../../src/mapa/modelo';
import { guardarPuntosLocales } from '../../src/services/mapas';
import { fotoDeDeporte, portadaDeEjemplo } from '../../src/canchas/imagenes';
import { nombreCorto } from '../../src/canchas/modelo';
import { precioLegible } from '../../src/utils/dinero';
import { permisosDe } from '../../src/utils/permisos';
import type { Espacio } from '../../src/tipos';

export default function EspacioDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Detalle key={id} id={id} />;
}

function Detalle({ id }: { id: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { usuario, conSelectorNativo } = useAuth();
  const { puedeActualizarFoto } = permisosDe(usuario);
  const sinRed = useSinRed();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [local, setLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [indice, setIndice] = useState(-1);
  const [fotoGuardada, setFotoGuardada] = useState<{ url: string; uri: string } | null>(null);
  const [fotoFallida, setFotoFallida] = useState<string | null>(null);
  const [videoDescargado, setVideoDescargado] = useState<string | null>(null);
  const [videoGrabado, setVideoGrabado] = useState<{ uri: string; url: string } | null>(null);
  const [fotoEstado, setFotoEstado] = useState<{ uri: string; url: string; fecha: string } | null>(null);
  const [grabandoVideo, setGrabandoVideo] = useState(false);
  const [intentoVideo, setIntentoVideo] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const operando = useRef(false);
  const galeria = espacio?.imagenes.filter(Boolean) ?? [];
  const portada = espacio ? portadaDeEjemplo(espacio) : null;
  const posicion = portada && indice === -1 ? -1 : Math.min(Math.max(0, indice), Math.max(0, galeria.length - 1));
  const urlFoto = galeria[posicion];
  const fotoDescargada = fotoGuardada && fotoGuardada.url === urlFoto ? fotoGuardada.uri : null;
  const urlVideo = espacio?.videoUrl;

  useFocusEffect(useCallback(() => {
    let activo = true;
    setError(null);
    async function cargar() {
      const cache = await obtenerEspacioLocal(id).catch(() => null);
      if (!activo) return;
      if (cache) { setEspacio(cache); setLocal(true); }
      if (sinRed && cache) return;
      try {
        const respuesta = await obtenerEspacio(id);
        if (!activo) return;
        setEspacio(respuesta.datos);
        setLocal(respuesta.local);
        if (!respuesta.local) void guardarPuntosLocales(puntosDeEspacios([respuesta.datos]));
      } catch (e) {
        if (activo && e instanceof ApiError && e.codigo === 'ESPACIO_NO_ENCONTRADO') setEspacio(null);
        if (activo) setError(e instanceof Error ? e.message : 'No pudimos cargar la cancha.');
      }
    }
    void cargar();
    return () => { activo = false; };
  }, [id, intento, sinRed]));

  useEffect(() => {
    let activo = true;
    if (urlFoto) void obtenerDescarga('imagen', id, urlFoto).then(uri => {
      if (activo) setFotoGuardada(uri ? { url: urlFoto, uri } : null);
    }).catch(() => undefined);
    return () => { activo = false; };
  }, [id, urlFoto, sinRed]);

  // Las fotos y el video publicados se guardan solos en el telefono: la ficha
  // se puede revisar sin conexion, como en cualquier app de canchas.
  useEffect(() => {
    const publicadas = [...new Set(espacio?.imagenes.filter(Boolean) ?? [])];
    if (!publicadas.length || sinRed) return;
    void Promise.all(publicadas.map(url => guardarDescarga('imagen', id, url).catch(() => undefined)));
  }, [espacio?.imagenes, sinRed, id]);

  useEffect(() => {
    if (!espacio?.videoUrl || sinRed) return;
    void guardarDescarga('video', id, espacio.videoUrl).catch(() => undefined);
  }, [espacio?.videoUrl, sinRed, id]);

  useEffect(() => {
    let activo = true;
    setVideoDescargado(null);
    if (urlVideo) void obtenerDescarga('video', id, urlVideo).then(uri => {
      if (activo) setVideoDescargado(uri);
    }).catch(() => undefined);
    return () => { activo = false; };
  }, [id, urlVideo, sinRed]);

  useEffect(() => {
    let activo = true;
    void obtenerVideoGrabado(id).then(video => {
      if (activo) setVideoGrabado(video);
    }).catch(() => undefined);
    void obtenerFotoEstado(id).then(foto => {
      if (activo) setFotoEstado(foto);
    }).catch(() => undefined);
    return () => { activo = false; };
  }, [id]);

  const gestionarMedio = async (accion: () => Promise<void>) => {
    if (operando.current) return;
    operando.current = true;
    setGuardando(true);
    setAviso(null);
    try { await accion(); }
    catch (e) { setAviso(e instanceof Error ? e.message : 'No pudimos completar la operación.'); }
    finally { operando.current = false; setGuardando(false); }
  };
  if (!espacio) return <Screen><StateView>
    {error ? <>
      <Text tone="danger" accessibilityRole="alert">{error}</Text>
      <Button title="Reintentar" onPress={() => setIntento(n => n + 1)} />
    </> : <>
      <ActivityIndicator color={colors.primary} />
      <Text tone="muted">Cargando cancha…</Text>
    </>}
  </StateView></Screen>;

  const uriFoto = fotoDescargada ?? urlFoto;
  const puedeMostrarFoto = !!uriFoto && fotoFallida !== uriFoto && (!sinRed || !!fotoDescargada);
  const fuenteFoto = puedeMostrarFoto ? { uri: uriFoto } : portada ?? fotoDeDeporte(espacio.deporteId);
  const fuenteVideo = videoDescargado ?? (!sinRed ? urlVideo : null);
  const hayAnterior = posicion > (portada ? -1 : 0);
  const haySiguiente = posicion < galeria.length - 1;

  return <ScrollScreen contentContainerStyle={styles.scroll}>
    {fuenteFoto && <View>
      <Image key={puedeMostrarFoto ? uriFoto : 'ilustrativa'} source={fuenteFoto} style={styles.image}
        onError={puedeMostrarFoto ? () => setFotoFallida(uriFoto) : undefined}
        accessibilityLabel={puedeMostrarFoto || portada ? 'Foto de ' + espacio.nombre : 'Imagen ilustrativa'} />
      {hayAnterior && <PressableSurface style={[styles.flechaFoto, styles.fotoAnterior]}
        accessibilityLabel="Foto anterior" onPress={() => setIndice(posicion - 1)}>
        <Ionicons name="chevron-back" size={spacing.xxl} color={colors.text} />
      </PressableSurface>}
      {haySiguiente && <PressableSurface style={[styles.flechaFoto, styles.fotoSiguiente]}
        accessibilityLabel="Foto siguiente" onPress={() => setIndice(posicion + 1)}>
        <Ionicons name="chevron-forward" size={spacing.xxl} color={colors.text} />
      </PressableSurface>}
    </View>}
    <View style={styles.content}>
      {sinRed && fotoDescargada && <Text variant="caption" tone="muted">Mostramos la copia guardada de esta foto.</Text>}
      {uriFoto && fotoFallida === uriFoto && <Button variant="ghost" size="sm"
        title="Reintentar foto" disabled={sinRed && !fotoDescargada} onPress={() => setFotoFallida(null)} />}

      {local && <Text variant="label" tone="warning">Mostramos la última información guardada en el teléfono. Puede estar desactualizada.</Text>}
      {error && <Button title="Reintentar" variant="secondary" onPress={() => setIntento(n => n + 1)} />}

      <View style={uiLayout.row}>
        <View style={uiLayout.grow}>
          <Text variant="display" accessibilityRole="header">{nombreCorto(espacio)}</Text>
          <Text tone="muted">{espacio.complejo}</Text>
        </View>
        <FavoritoToggle espacioId={id} nombre={espacio.nombre} />
      </View>
      <Text numeric variant="title" tone="primary">{precioLegible(espacio.precioPorHora)} / hora</Text>
      <Text variant="label" tone="muted">Se paga en el lugar</Text>
      <View style={styles.chipsRow}>
        <Badge>{espacio.superficie}</Badge>
        <Badge>{espacio.techado ? 'Techado' : 'Al aire libre'}</Badge>
        <Badge>{espacio.iluminacion ? 'Con iluminación' : 'Sin iluminación'}</Badge>
        <Badge>{'Hasta ' + espacio.capacidad + ' personas'}</Badge>
      </View>
      <Button title="Ver horarios" onPress={() => router.push({ pathname: '/(tabs)', params: { espacioId: id } })} />
      <Text>{espacio.reglas}</Text>

      <Text variant="subtitle" style={styles.sectionTitle}>Ubicación</Text>
      <Mapa puntos={puntosDeEspacios([espacio])} />

      <View style={uiLayout.section}>
        <Text variant="subtitle" style={styles.sectionTitle}>Estado de la cancha</Text>
        <Text variant="label" tone="muted">Foto reportada por el personal del complejo, con la fecha del reporte.</Text>
        {fotoEstado ? <>
          <Image source={{ uri: fotoEstado.uri }} style={styles.photo} accessibilityLabel={'Estado de ' + espacio.nombre} />
          <Text variant="caption" tone="muted">Reportado el {new Date(fotoEstado.fecha).toLocaleString()}.</Text>
          {puedeActualizarFoto && <Button variant="ghost" title="Quitar la foto del estado" disabled={guardando}
            onPress={() => void gestionarMedio(async () => {
              await borrarFotoEstado(id);
              setFotoEstado(null);
            })} />}
        </> : <Text tone="muted">Todavía no hay una foto del estado de la cancha.</Text>}
        {puedeActualizarFoto && <Button variant="secondary" title="Agregar foto del estado de la cancha" disabled={guardando}
          onPress={() => void gestionarMedio(async () => {
            const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7,
              preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible };
            const foto = await conSelectorNativo(() => ImagePicker.launchImageLibraryAsync(opciones));
            if (foto.canceled) return;
            const archivo = await subirFoto(foto.assets[0].uri);
            const localUri = await guardarFotoEstado(id, foto.assets[0].uri, archivo.url);
            setFotoEstado({ uri: localUri, url: archivo.url, fecha: new Date().toISOString() });
            setAviso('Foto subida al servidor y guardada en este dispositivo.');
          })} />}
      </View>

      <View style={uiLayout.section}>
        <Text variant="subtitle" style={styles.sectionTitle}>Video de la cancha</Text>
        {videoGrabado ? <>
          <Text variant="label" tone="muted">Video grabado por el personal y subido al servidor.</Text>
          <VideoDeCancha key={`grabado:${videoGrabado.uri}:${intentoVideo}`} fuente={videoGrabado.uri}
            reintentar={() => setIntentoVideo(n => n + 1)} />
          <Text selectable variant="label">{videoGrabado.url}</Text>
          {puedeActualizarFoto && <Button variant="ghost" title="Quitar el video grabado" disabled={guardando}
            onPress={() => void gestionarMedio(async () => {
              await borrarVideoGrabado(id);
              setVideoGrabado(null);
            })} />}
        </> : urlVideo ? <>
          {fuenteVideo ? <VideoDeCancha key={fuenteVideo + ':' + intentoVideo} fuente={fuenteVideo}
            reintentar={() => setIntentoVideo(n => n + 1)} />
            : <Text tone="muted">El video requiere conexión o una descarga previa.</Text>}
          {sinRed && videoDescargado && <Text variant="caption" tone="muted">Mostramos la copia guardada del video.</Text>}
        </> : <Text tone="muted">Este espacio todavía no tiene video.</Text>}
        {puedeActualizarFoto && <Button variant="secondary" title="Grabar video de la cancha" disabled={guardando}
          onPress={() => setGrabandoVideo(true)} />}
      </View>

      {guardando && <ActivityIndicator color={colors.primary} accessibilityLabel="Procesando archivo" />}
      {aviso && <Text accessibilityLiveRegion="polite">{aviso}</Text>}
      <GrabarVideoCancha visible={grabandoVideo} onCerrar={() => setGrabandoVideo(false)}
        onGrabar={async uri => {
          const archivo = await subirVideo(uri);
          const localUri = await guardarVideoGrabado(id, uri, archivo.url);
          setVideoGrabado({ uri: localUri, url: archivo.url });
          setIntentoVideo(n => n + 1);
          setAviso('Video subido al servidor. La ficha conserva el video publicado: este queda disponible en el teléfono.');
        }} />
    </View>
  </ScrollScreen>;
}

function VideoDeCancha({ fuente, reintentar }: { fuente: string; reintentar: () => void }) {
  const { colors } = useTheme();
  const player = useVideoPlayer(fuente);
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  useFocusEffect(useCallback(() => () => player.pause(), [player]));
  if (status === 'error') return <StateView>
    <Text tone="danger" accessibilityRole="alert">No pudimos reproducir el video.</Text>
    <Button variant="secondary" title="Reintentar video" onPress={reintentar} />
  </StateView>;
  return <View style={[styles.videoContainer, { backgroundColor: colors.media }]}>
    <VideoView style={styles.video} player={player} allowsFullscreen nativeControls />
    {status === 'loading' && <ActivityIndicator accessibilityLabel="Cargando video" color={colors.primary} />}
  </View>;
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.none, gap: spacing.none },
  image: { width: '100%', aspectRatio: layout.mediaRatio },
  flechaFoto: {
    position: 'absolute', bottom: spacing.md, width: spacing.huge, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.none, paddingHorizontal: spacing.none,
  },
  fotoAnterior: { left: spacing.md },
  fotoSiguiente: { right: spacing.md },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md },
  sectionTitle: { marginTop: spacing.xl },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: '100%', aspectRatio: layout.mediaRatio, borderRadius: radius.card },
  videoContainer: { width: '100%', aspectRatio: layout.mediaRatio, borderRadius: radius.card, overflow: 'hidden' },
  video: { flex: 1 },
});
