import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, ActivityIndicator, Platform, Linking } from 'react-native';
import { Button, Chip, ScrollScreen, Screen, StateView, Text, uiLayout } from '../../src/components/ui';
import { borders, layout, radius, spacing, useTheme } from '../../src/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { obtenerEspacio } from '../../src/services/espacios';
import { obtenerFoto, guardarFoto, obtenerVideo, guardarVideo } from '../../src/services/medios';
import { Espacio } from '../../src/tipos';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Mapa } from '../../src/components/Mapa';
import { PuntoMapa, enlacesDestino, puntosDeEspacios } from '../../src/mapa/modelo';
import { guardarPuntosLocales, obtenerPuntosLocales } from '../../src/services/mapas';
import { FavoritoToggle } from '../../src/components/favoritos';
import { precioLegible } from '../../src/utils/dinero';
import { fotoDeCancha } from '../../src/canchas/imagenes';

export default function EspacioDetalleScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  
  const [errorCarga, setErrorCarga] = useState(false);
  const [puntos, setPuntos] = useState<PuntoMapa[]>([]);
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [videoLocal, setVideoLocal] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    setPuntos([]);
    setErrorCarga(false);
    setEspacio(null);
    setFotoLocal(null); setVideoLocal(null); setAviso(null);
    let activo = true;
    const cargarEspacio = async () => {
      const locales = await obtenerPuntosLocales();
      if (!activo) return;
      setPuntos(locales.filter(p => p.id === id));
      try {
        const data = await obtenerEspacio(String(id));
        if (!activo) return;
        const ubicaciones = puntosDeEspacios([data]);
        void guardarPuntosLocales(ubicaciones);
        setPuntos(ubicaciones);
        
        setEspacio(data);
        const foto = await obtenerFoto(data.id);
        const video = data.videoUrl ? await obtenerVideo(data.id, data.videoUrl) : null;
        if (activo) { setFotoLocal(foto); setVideoLocal(video); }
      } catch {
        if (activo) setErrorCarga(true);
      }
    };
    cargarEspacio();
    return () => { activo = false; };
  }, [id]);

  const fuenteVideo = videoLocal || espacio?.videoUrl || null;
  const fuenteActual = useRef<string | null>(null);
  const player = useVideoPlayer(null, player => {
    player.loop = false;
    player.muted = true;
  });

  useEffect(() => {
    if (fuenteVideo && fuenteVideo !== fuenteActual.current) {
      player.replace(fuenteVideo);
      fuenteActual.current = fuenteVideo;
    }
  }, [fuenteVideo, player]);

  const elegirFoto = async (camara: boolean) => {
    if (!espacio || guardando) return;
    setGuardando(true); setAviso(null);
    try {
      if (camara) {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) { setAviso('Cámara no autorizada. Podés elegir una foto de la galería.'); return; }
      }
      const result = await (camara ? ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
        : ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 }));
      if (!result.canceled) {
        setFotoLocal(await guardarFoto(espacio.id, result.assets[0].uri));
        setAviso(Platform.OS === 'web' ? 'Foto visible durante esta sesión web.' : 'Foto guardada en el teléfono.');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
    } catch { setAviso('No se pudo guardar la foto. Volvé a intentar.'); }
    finally { setGuardando(false); }
  };

  const descargarVideo = async () => {
    if (!espacio?.videoUrl || guardando) return;
    setGuardando(true); setAviso(null);
    try { setVideoLocal(await guardarVideo(espacio.id, espacio.videoUrl)); setAviso('Video guardado para verlo sin datos.'); }
    catch (e) { setAviso(e instanceof Error ? e.message : 'No se pudo guardar el video.'); }
    finally { setGuardando(false); }
  };

  if (!espacio) {
    if (errorCarga) return <ScrollScreen>
      <Text variant="subtitle" tone="danger">No se pudo cargar la ficha del espacio.</Text>
      <Text tone="muted">Si existen coordenadas guardadas, podés consultarlas sin acceder al servidor.</Text>
      <Mapa puntos={puntos} />
    </ScrollScreen>;
    if (puntos.length) return <ScrollScreen>
      <ActivityIndicator accessibilityLabel="Consultando ficha del espacio" color={colors.primary} />
      <Text>Consultando ficha. Ubicación guardada:</Text>
      <Mapa puntos={puntos} />
    </ScrollScreen>;
    return (
      <Screen><StateView>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text tone="muted">Cargando espacio...</Text>
      </StateView></Screen>
    );
  }

  const fotoRegistrada = fotoDeCancha(espacio);

  return (
    <ScrollScreen contentContainerStyle={styles.scroll}>
      {fotoRegistrada ? <Image source={fotoRegistrada} style={styles.image} accessibilityLabel={`Foto de ${espacio.nombre}`} /> : null}

      <View style={styles.content}>
        <View style={uiLayout.row}>
          <View style={uiLayout.grow}>
            <Text variant="display" accessibilityRole="header">{espacio.nombre}</Text>
            <Text tone="muted">{espacio.complejo}</Text>
            <Text variant="label" tone="muted">{espacio.deporteId.replace('dep-', '').toUpperCase()}</Text>
          </View>
          <FavoritoToggle espacioId={espacio.id} nombre={espacio.nombre} />
        </View>

        <Text numeric variant="title" tone="primary">
          {precioLegible(espacio.precioPorHora)} / hora
        </Text>
        <Text variant="label" tone="muted">Se paga en el lugar</Text>

        <View style={styles.chipsRow}>
          <Chip selected={false}>{espacio.superficie}</Chip>
          <Chip selected={false}>{espacio.techado ? 'Techado' : 'Al aire libre'}</Chip>
          <Chip selected={false}>{espacio.iluminacion ? 'Con iluminación' : 'Sin iluminación'}</Chip>
          <Chip selected={false}>{`Capacidad ${espacio.capacidad}`}</Chip>
        </View>

        <View style={uiLayout.row}>
          <Button title="Ver disponibilidad" onPress={() => router.push({ pathname: '/(tabs)', params: { espacioId: espacio.id } })} />
          <Button variant="secondary" title="Cómo llegar" onPress={() => {
            // La lógica de enlaces por plataforma vive en el módulo de mapa (única fuente).
            const punto = { id: espacio.id, nombre: espacio.nombre, latitud: espacio.coordenadas?.latitud, longitud: espacio.coordenadas?.longitud };
            const [destino] = enlacesDestino(punto, Platform.OS);
            if (destino) void Linking.openURL(destino);
          }} />
        </View>

        <Text>{espacio.reglas}</Text>

        <Text variant="subtitle" style={styles.sectionTitle}>Ubicación</Text>
        <Mapa puntos={puntos} />

        <Text variant="subtitle" style={styles.sectionTitle}>Estado actual de la cancha</Text>
        <Button variant="secondary" title="Tomar foto del estado" disabled={guardando} onPress={() => elegirFoto(true)} />
        <Button variant="ghost" title="Elegir foto de la galería" disabled={guardando} onPress={() => elegirFoto(false)} />
        {aviso && <Text accessibilityLiveRegion="polite">{aviso}</Text>}

        {fotoLocal && (
          <View style={uiLayout.section}>
            <Text tone="muted">Foto guardada en el dispositivo:</Text>
            <Image source={{ uri: fotoLocal }} style={styles.photo} />
          </View>
        )}

        <Text variant="subtitle" style={styles.sectionTitle}>Recorrido en video</Text>
        {espacio.videoUrl ? (
          <View style={uiLayout.section}>
            <View style={[styles.videoContainer, { backgroundColor: colors.media }]}>
              <VideoView style={styles.video} player={player} allowsFullscreen nativeControls />
            </View>
            {videoLocal ? <Text tone="success">Video disponible sin datos</Text>
              : <Button variant="secondary" title="Guardar video sin datos" loading={guardando} onPress={descargarVideo} />}
          </View>
        ) : (
          <Text tone="muted">Sin video.</Text>
        )}
      </View>
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.none, gap: spacing.none },
  image: { width: '100%', aspectRatio: layout.mediaRatio },
  content: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md },
  sectionTitle: { marginTop: spacing.xl },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: '100%', aspectRatio: layout.mediaRatio, borderRadius: radius.card, borderCurve: borders.curve },
  videoContainer: { width: '100%', aspectRatio: layout.mediaRatio, borderRadius: radius.card, borderCurve: borders.curve, overflow: 'hidden' },
  video: { flex: 1 },
});
