import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Button, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { api } from '../../src/services/api';
import { Espacio } from '../../src/tipos';
import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Mapa } from '../../src/components/Mapa';
import { PuntoMapa, puntosDeEspacios } from '../../src/mapa/modelo';
import { guardarPuntosLocales, obtenerPuntosLocales } from '../../src/services/mapas';

export default function EspacioDetalleScreen() {
  const { id } = useLocalSearchParams();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  
  const [errorCarga, setErrorCarga] = useState(false);
  const [puntos, setPuntos] = useState<PuntoMapa[]>([]);
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);

  useEffect(() => {
    setPuntos([]);
    setErrorCarga(false);
    setEspacio(null);
    let activo = true;
    const cargarEspacio = async () => {
      const locales = await obtenerPuntosLocales();
      if (!activo) return;
      setPuntos(locales.filter(p => p.id === id));
      try {
        const data = await api.get<Espacio>(`/espacios/${id}`);
        if (!activo) return;
        const ubicaciones = puntosDeEspacios([data]);
        void guardarPuntosLocales(ubicaciones);
        setPuntos(ubicaciones);
        
        if (!data.videoUrl) {
          data.videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
        }

        setEspacio(data);
      } catch {
        if (activo) setErrorCarga(true);
      }
    };
    cargarEspacio();
    return () => { activo = false; };
  }, [id]);

  const player = useVideoPlayer(espacio?.videoUrl || null, player => {
    player.loop = true;
    player.muted = true;
  });

  const sacarFoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      
      try {
        const dir = new Directory(Paths.document, 'fotos_canchas');
        if (!dir.exists) dir.create();

        const file = new File(uri);
        const newFile = new File(dir, `cancha_${Date.now()}.jpg`);
        file.copy(newFile);

        setFotoLocal(newFile.uri);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('¡Foto guardada!', 'La foto se guardó en la memoria del dispositivo.');
      } catch {
        setFotoLocal(uri);
        Alert.alert('Foto tomada', 'En web no se guarda permanentemente, pero se muestra.');
      }
    }
  };

  if (!espacio) {
    if (errorCarga) return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>No se pudo cargar la ficha del espacio.</Text>
      <Text>Si existen coordenadas guardadas, podés consultarlas sin acceder al servidor.</Text>
      <Mapa puntos={puntos} />
    </ScrollView>;
    if (puntos.length) return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ActivityIndicator accessibilityLabel="Consultando ficha del espacio" color="#2E7D32" />
      <Text>Consultando ficha. Ubicación guardada:</Text>
      <Mapa puntos={puntos} />
    </ScrollView>;
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ marginTop: 10 }}>Cargando espacio...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: espacio.imagenes[0] }} style={styles.image} />

      <View style={styles.content}>
        <Text style={styles.title}>{espacio.nombre}</Text>
        <Text style={styles.subtitle}>{espacio.complejo}</Text>

        <Text style={styles.price}>
          {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(espacio.precioPorHora)} / hora
        </Text>

        <Text style={styles.sectionTitle}>Ubicación</Text>
        
        <Mapa puntos={puntos} />

        <Text style={styles.sectionTitle}>Estado actual de la cancha</Text>
        <Button title="📸 Tomar foto del estado" onPress={sacarFoto} color="#E65100" />
        
        {fotoLocal && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ marginBottom: 5 }}>Foto guardada en el dispositivo:</Text>
            <Image source={{ uri: fotoLocal }} style={{ width: '100%', height: 200, borderRadius: 10 }} />
          </View>
        )}

        <Text style={styles.sectionTitle}>Recorrido en video</Text>
        {espacio.videoUrl ? (
          <View style={styles.videoContainer}>
            <VideoView style={styles.video} player={player} allowsFullscreen nativeControls />
          </View>
        ) : (
          <Text style={{ fontStyle: 'italic', color: '#666' }}>Sin video.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 250 },
  content: { padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold' },
  subtitle: { fontSize: 18, color: '#666', marginBottom: 5 },
  price: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  videoContainer: { width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', marginBottom: 30 },
  video: { flex: 1 },
});
