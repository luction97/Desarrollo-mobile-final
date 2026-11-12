import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, ActivityIndicator, Platform } from 'react-native';
import { Badge, Button, ScrollScreen, Screen, StateView, Text, uiLayout } from '../../src/components/ui';
import { borders, layout, radius, spacing, useTheme } from '../../src/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { obtenerEspacio } from '../../src/services/espacios';
import { obtenerFoto, guardarFoto, obtenerVideo, guardarVideo } from '../../src/services/medios';
import { Espacio } from '../../src/tipos';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Mapa } from '../../src/components/Mapa';
import { PuntoMapa, puntosDeEspacios } from '../../src/mapa/modelo';
import { guardarPuntosLocales, obtenerPuntosLocales } from '../../src/services/mapas';
import { FavoritoToggle } from '../../src/components/favoritos';
import { precioLegible } from '../../src/utils/dinero';
import { fotoDeCancha } from '../../src/canchas/imagenes';
import { useAuth } from '../../src/context/AuthContext';
import { permisosDe } from '../../src/utils/permisos';

export default function EspacioDetalleScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { usuario } = useAuth();
  const { puedeActualizarFoto } = permisosDe(usuario);
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
        const foto = puedeActualizarFoto ? await obtenerFoto(data.id) : null;
        const video = data.videoUrl ? await obtenerVideo(data.id, data.videoUrl) : null;
        if (activo) { setFotoLocal(foto); setVideoLocal(video); }
      } catch {
        if (activo) setErrorCarga(true);
      }
    };
    cargarEspacio();
    return () => { activo = false; };
  }, [id, puedeActualizarFoto]);

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
    if (!puedeActualizarFoto || !espacio || guardando) return;
    setGuardando(true); setAviso(null);
    try {
      if (camara) {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) { setAviso('Permití usar la cámara o elegí una foto de la galería.'); return; }
      }
      const result = await (camara ? ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
        : ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 }));
      if (!result.canceled) {
        setFotoLocal(await guardarFoto(espacio.id, result.assets[0].uri));
        setAviso(Platform.OS === 'web' ? 'Foto guardada hasta que cierres esta página.' : 'Foto guardada en este teléfono.');
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
      <Text variant="subtitle" tone="danger">No pudimos cargar la cancha.</Text>
      <Mapa puntos={puntos} />
    </ScrollScreen>;
    if (puntos.length) return <ScrollScreen>
      <ActivityIndicator accessibilityLabel="Cargando cancha" color={colors.primary} />
      <Mapa puntos={puntos} />
    </ScrollScreen>;
    return (
      <Screen><StateView>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text tone="muted">Cargando cancha...</Text>
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
          </View>
          <FavoritoToggle espacioId={espacio.id} nombre={espacio.nombre} />
        </View>

        <Text numeric variant="title" tone="primary">
          {precioLegible(espacio.precioPorHora)} / hora
        </Text>
        <Text variant="label" tone="muted">Se paga en el lugar</Text>

        <View style={styles.chipsRow}>
          <Badge>{espacio.superficie}</Badge>
          <Badge>{espacio.techado ? 'Techado' : 'Al aire libre'}</Badge>
          <Badge>{espacio.iluminacion ? 'Con iluminación' : 'Sin iluminación'}</Badge>
          <Badge>{`Hasta ${espacio.capacidad} personas`}</Badge>
        </View>

        <Button title="Ver horarios" onPress={() => router.push({ pathname: '/(tabs)', params: { espacioId: espacio.id } })} />

        <Text>{espacio.reglas}</Text>

        <Text variant="subtitle" style={styles.sectionTitle}>Ubicación</Text>
        <Mapa puntos={puntos} />

        {puedeActualizarFoto && <View style={uiLayout.section}>
          <Text variant="subtitle" style={styles.sectionTitle}>Registro del estado de la cancha</Text>
          <Text variant="label" tone="muted">La foto queda solo en este teléfono; no se publica para los jugadores.</Text>
          <Button variant="secondary" title="Tomar foto" disabled={guardando} onPress={() => elegirFoto(true)} />
          <Button variant="ghost" title="Elegir de la galería" disabled={guardando} onPress={() => elegirFoto(false)} />
          {fotoLocal && <Image source={{ uri: fotoLocal }} style={styles.photo} accessibilityLabel={`Foto guardada de ${espacio.nombre}`} />}
        </View>}
        {aviso && <Text accessibilityLiveRegion="polite">{aviso}</Text>}

        {espacio.videoUrl && <>
          <Text variant="subtitle" style={styles.sectionTitle}>Conocé la cancha</Text>
          <View style={uiLayout.section}>
            <View style={[styles.videoContainer, { backgroundColor: colors.media }]}>
              <VideoView style={styles.video} player={player} allowsFullscreen nativeControls />
            </View>
            {videoLocal ? <Text tone="success">Video guardado para ver sin conexión</Text>
              : <Button variant="secondary" title="Guardar video" loading={guardando} onPress={descargarVideo} />}
          </View>
        </>}
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
