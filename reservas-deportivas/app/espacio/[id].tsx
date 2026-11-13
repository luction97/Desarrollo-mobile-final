import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, View } from 'react-native';
import { useEvent } from 'expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { Badge, Button, Screen, ScrollScreen, StateView, Text, uiLayout } from '../../src/components/ui';
import { Mapa } from '../../src/components/Mapa';
import { FavoritoToggle } from '../../src/components/favoritos';
import { layout, radius, spacing, useTheme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useSinRed } from '../../src/hooks/useSinRed';
import { obtenerEspacio, obtenerEspacioLocal } from '../../src/services/espacios';
import { borrarDescarga, borrarFoto, borrarVideoGrabado, guardarDescarga, guardarFoto, guardarVideoGrabado, obtenerDescarga, obtenerFoto, obtenerVideoGrabado } from '../../src/services/medios';
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
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [archivoSubido, setArchivoSubido] = useState<string | null>(null);
  const [fotoDescargada, setFotoDescargada] = useState<string | null>(null);
  const [fotoFallida, setFotoFallida] = useState<string | null>(null);
  const [videoDescargado, setVideoDescargado] = useState<string | null>(null);
  const [videoGrabado, setVideoGrabado] = useState<{ uri: string; url: string } | null>(null);
  const [grabandoVideo, setGrabandoVideo] = useState(false);
  const [intentoVideo, setIntentoVideo] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const operando = useRef(false);
  const galeria = espacio?.imagenes.filter(Boolean) ?? [];
  const portada = espacio ? portadaDeEjemplo(espacio) : null;
  const posicion = portada && indice === -1 ? -1 : Math.min(Math.max(0, indice), Math.max(0, galeria.length - 1));
  const urlFoto = galeria[posicion];
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
    setFotoLocal(null);
    setArchivoSubido(null);
    if (puedeActualizarFoto) void obtenerFoto(id).then(uri => {
      if (activo) setFotoLocal(uri);
    }).catch(() => undefined);
    return () => { activo = false; };
  }, [id, puedeActualizarFoto, usuario?.id]);

  useEffect(() => {
    let activo = true;
    setFotoDescargada(null);
    if (urlFoto) void obtenerDescarga('imagen', id, urlFoto).then(uri => {
      if (activo) setFotoDescargada(uri);
    }).catch(() => undefined);
    return () => { activo = false; };
  }, [id, urlFoto]);

  useEffect(() => {
    let activo = true;
    setVideoDescargado(null);
    if (urlVideo) void obtenerDescarga('video', id, urlVideo).then(uri => {
      if (activo) setVideoDescargado(uri);
    }).catch(() => undefined);
    return () => { activo = false; };
  }, [id, urlVideo]);

  useEffect(() => {
    let activo = true;
    void obtenerVideoGrabado(id).then(video => {
      if (activo) setVideoGrabado(video);
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

  const elegirFoto = () => gestionarMedio(async () => {
    if (!puedeActualizarFoto) return;
    const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible };
    const foto = await conSelectorNativo(() => ImagePicker.launchImageLibraryAsync(opciones));
    if (foto.canceled) return;
    setFotoLocal(await guardarFoto(id, foto.assets[0].uri));
    setArchivoSubido(null);
    setAviso(Platform.OS === 'web' ? 'Foto disponible mientras esta página esté abierta.' : 'Foto guardada en este teléfono.');
  });

  const alternarDescarga = (tipo: 'imagen' | 'video', url: string, descargada: string | null) => gestionarMedio(async () => {
    const cambiar = tipo === 'imagen' ? setFotoDescargada : setVideoDescargado;
    if (descargada) {
      await borrarDescarga(tipo, id, url);
      cambiar(null);
    } else {
      cambiar(await guardarDescarga(tipo, id, url));
    }
  });

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

  return <ScrollScreen contentContainerStyle={styles.scroll}>
    {fuenteFoto
      ? <Image key={puedeMostrarFoto ? uriFoto : 'ilustrativa'} source={fuenteFoto} style={styles.image}
        onError={puedeMostrarFoto ? () => setFotoFallida(uriFoto) : undefined}
        accessibilityLabel={puedeMostrarFoto || portada ? 'Foto de ' + espacio.nombre : 'Imagen ilustrativa'} />
      : null}
    <View style={styles.content}>
      {(galeria.length > 1 || (portada && galeria.length > 0)) && <View style={uiLayout.row}>
        <Button variant="ghost" size="sm" title="‹" accessibilityLabel="Foto anterior"
          disabled={guardando || posicion <= (portada ? -1 : 0)} onPress={() => setIndice(posicion - 1)} />
        <Button variant="ghost" size="sm" title="›" accessibilityLabel="Foto siguiente"
          disabled={guardando || posicion >= galeria.length - 1} onPress={() => setIndice(posicion + 1)} />
      </View>}
      {urlFoto && Platform.OS !== 'web' && <Button variant="ghost" size="sm"
        title={fotoDescargada ? 'Borrar foto descargada' : 'Guardar foto sin conexión'}
        disabled={guardando || (sinRed && !fotoDescargada)}
        onPress={() => alternarDescarga('imagen', urlFoto, fotoDescargada)} />}
      {uriFoto && fotoFallida === uriFoto && <Button variant="ghost" size="sm"
        title="Reintentar foto" disabled={sinRed && !fotoDescargada} onPress={() => setFotoFallida(null)} />}

      {puedeActualizarFoto && <View style={uiLayout.section}>
        <Button variant="secondary" size="sm" title="Agregar foto del estado de la cancha" disabled={guardando}
          onPress={() => elegirFoto()} />
        {fotoLocal && <>
          <Image source={{ uri: fotoLocal }} style={styles.photo} accessibilityLabel={'Foto del estado de ' + espacio.nombre} />
          <Button variant="secondary" size="sm" title="Subir archivo" disabled={guardando || sinRed || !!archivoSubido}
            onPress={() => void gestionarMedio(async () => {
              const archivo = await subirFoto(fotoLocal);
              setArchivoSubido(archivo.url);
              setAviso('Archivo subido. La galería conserva sus fotos publicadas.');
            })} />
          {archivoSubido && <Text selectable variant="label">{archivoSubido}</Text>}
          <Button variant="ghost" size="sm" title="Quitar la foto" disabled={guardando} onPress={() => void gestionarMedio(async () => {
            await borrarFoto(id);
            setFotoLocal(null);
            setArchivoSubido(null);
          })} />
        </>}
      </View>}
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
        <Text variant="subtitle" style={styles.sectionTitle}>Video de la cancha</Text>
        {videoGrabado ? <>
          <Text variant="label" tone="muted">Video grabado por el personal y subido al servidor.</Text>
          <VideoDeCancha key={'grabado:' + videoGrabado.uri} fuente={videoGrabado.uri}
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
          {Platform.OS !== 'web' && <Button variant="secondary"
            title={videoDescargado ? 'Borrar video descargado' : 'Guardar video sin conexión'}
            disabled={guardando || (sinRed && !videoDescargado)}
            onPress={() => alternarDescarga('video', urlVideo, videoDescargado)} />}
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
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md },
  sectionTitle: { marginTop: spacing.xl },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: '100%', aspectRatio: layout.mediaRatio, borderRadius: radius.card },
  videoContainer: { width: '100%', aspectRatio: layout.mediaRatio, borderRadius: radius.card, overflow: 'hidden' },
  video: { flex: 1 },
});
