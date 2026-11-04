import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Button, Platform, Alert, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { api } from '../../src/services/api'; // <-- Importamos la API
import { Espacio } from '../../src/tipos';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Mapa } from '../../src/components/Mapa';

export default function EspacioDetalleScreen() {
  const { id } = useLocalSearchParams();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);

  // 👇 BUSCAMOS EL ESPACIO EN LA API CON FALLBACK DE VIDEO 👇
  useEffect(() => {
    const cargarEspacio = async () => {
      try {
        const data = await api.get<Espacio>(`/espacios/${id}`);
        
        // Si la API devuelve videoUrl como null, le inyectamos un video de prueba
        if (!data.videoUrl) {
          data.videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
        }

        setEspacio(data);
      } catch (error) {
        console.error("Error al cargar el espacio de la API, usando mock:", error);
        // Fallback por si la API falla
        const { ESPACIOS } = require('../../src/mocks');
        const encontrado = ESPACIOS.find((e: Espacio) => e.id === id);
        if (encontrado) setEspacio(encontrado);
      }
    };
    cargarEspacio();
  }, [id]);

  const solicitarUbicacion = async () => {
    setErrorMsg(null); 
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permiso de ubicación denegado.');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    } catch (error) {
      setErrorMsg('Error al obtener la ubicación.');
    }
  };

  useEffect(() => {
    solicitarUbicacion();
  }, []);

  const player = useVideoPlayer(espacio?.videoUrl || null, player => {
    player.loop = true;
    player.muted = true;
  });

  const abrirMapaNativo = () => {
    if (!espacio) return;
    const { latitud, longitud } = espacio.coordenadas;
    const url = Platform.select({
      ios: `maps:0,0?q=${espacio.nombre}@${latitud},${longitud}`,
      android: `geo:0,0?q=${latitud},${longitud}(${espacio.nombre})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`
    });
    Linking.openURL(url as string);
  };

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
      } catch (error) {
        setFotoLocal(uri);
        Alert.alert('Foto tomada', 'En web no se guarda permanentemente, pero se muestra.');
      }
    }
  };

  if (!espacio) {
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
        
        <View style={styles.mapSection}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={{ color: 'red', textAlign: 'center', marginBottom: 15 }}>
                {errorMsg} Podés seguir usando la app, pero no verás el mapa interactivo.
              </Text>
              <Button title="Reintentar ubicación" onPress={solicitarUbicacion} color="#E65100" />
            </View>
          ) : (
            <View style={styles.mapWrapper}>
              <Mapa 
                latitud={espacio.coordenadas.latitud} 
                longitud={espacio.coordenadas.longitud} 
                nombre={espacio.nombre} 
              />
            </View>
          )}
          
          <View style={{ marginTop: 15 }}>
             <Button title="Cómo llegar (Abrir en Mapas)" onPress={abrirMapaNativo} color="#1976D2" />
          </View>
        </View>

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
  mapSection: { marginBottom: 20 },
  mapWrapper: { height: 250, borderRadius: 10, overflow: 'hidden' },
  errorBox: { 
    backgroundColor: '#FFEBEE', 
    padding: 20, 
    borderRadius: 10, 
    alignItems: 'center',
    justifyContent: 'center'
  },
  videoContainer: { width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', marginBottom: 30 },
  video: { flex: 1 },
});