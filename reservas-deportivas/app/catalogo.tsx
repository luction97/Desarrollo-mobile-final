import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';
import { Espacio } from '../src/tipos';
import { Mapa } from '../src/components/Mapa';
import { agruparComplejos, puntosDeEspacios, PuntoMapa } from '../src/mapa/modelo';
import { guardarPuntosLocales, obtenerPuntosLocales } from '../src/services/mapas';

export default function CatalogoScreen() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [filtroDeporte, setFiltroDeporte] = useState<string>('todos');
  const [filtroComplejo, setFiltroComplejo] = useState<string>('todos');
  const [cargando, setCargando] = useState(true);
  const [puntosLocales, setPuntosLocales] = useState<PuntoMapa[]>([]);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      const locales = await obtenerPuntosLocales();
      if (!activo) return;
      setPuntosLocales(locales);
      try {
        const data = await api.get<Espacio[]>('/espacios');
        if (!activo) return;
        setEspacios(data);
        const puntos = puntosDeEspacios(data);
        void guardarPuntosLocales(puntos);
        setPuntosLocales(puntos);
      } catch {
        if (activo) setErrorCarga(true);
      } finally {
        if (activo) setCargando(false);
      }
    };
    void cargar();
    return () => { activo = false; };
  }, []);

  const complejosDisponibles = [
    'todos', 
    ...new Set(
      espacios
        .map(e => e.complejo)
        .filter(c => c && c.trim() !== '' && c !== '—' && c !== '-')
    )
  ];

  const espaciosFiltrados = espacios.filter(e => {
    const cumpleDeporte = filtroDeporte === 'todos' || e.deporteId === filtroDeporte;
    const cumpleComplejo = filtroComplejo === 'todos' || e.complejo === filtroComplejo;
    return cumpleDeporte && cumpleComplejo;
  });

  return (
    <View style={styles.container}>
      
      <Text style={styles.filterTitle}>Filtrar por deporte</Text>
      <View style={{ height: 45, marginBottom: 15 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
          {['todos', 'dep-futbol5', 'dep-basquet', 'dep-voley', 'dep-tenis'].map(dep => (
            <TouchableOpacity 
              key={dep} 
              style={[styles.filterBtn, filtroDeporte === dep && styles.filterBtnActive]}
              onPress={() => setFiltroDeporte(dep)}
            >
              <Text style={[styles.filterText, filtroDeporte === dep && { color: 'white' }]}>
                {dep === 'todos' ? 'Todos' : dep.replace('dep-', '').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.filterTitle}>Filtrar por complejo</Text>
      <View style={{ height: 45, marginBottom: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
          {complejosDisponibles.map(comp => (
            <TouchableOpacity 
              key={comp} 
              style={[styles.filterBtn, filtroComplejo === comp && styles.filterBtnActive]}
              onPress={() => setFiltroComplejo(comp)}
            >
              <Text style={[styles.filterText, filtroComplejo === comp && { color: 'white' }]}>
                {comp === 'todos' ? 'Todos' : comp}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={espaciosFiltrados}
        keyExtractor={item => item.id}
        ListHeaderComponent={<View>
          {cargando && <ActivityIndicator accessibilityLabel="Consultando catálogo" color="#2E7D32" />}
          {errorCarga && <Text style={styles.emptyText}>No se pudo consultar el catálogo. El mapa muestra únicamente coordenadas guardadas anteriormente.</Text>}
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: mostrarMapa }}
            style={styles.mapButton} onPress={() => setMostrarMapa(v => !v)}>
            <Text style={styles.filterText}>{mostrarMapa ? 'Ocultar mapa de complejos' : 'Ver mapa de complejos'}</Text>
          </TouchableOpacity>
          {mostrarMapa && <Mapa puntos={agruparComplejos(errorCarga || cargando ? puntosLocales : puntosDeEspacios(espaciosFiltrados))} />}
        </View>}
        ListEmptyComponent={!cargando ? <Text style={styles.emptyText}>{errorCarga ? 'Catálogo no disponible. Podés consultar las ubicaciones guardadas.' : 'No hay espacios que coincidan con los filtros.'}</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push({ pathname: '/espacio/[id]', params: { id: item.id } })}
          >
            <Image source={{ uri: item.imagenes[0] }} style={styles.image} />
            <View style={styles.info}>
              <Text style={styles.title}>{item.nombre}</Text>
              
              <Text style={styles.subtitle}>
                {item.complejo && item.complejo !== '—' ? `${item.complejo} • ` : ''}
                {item.superficie || 'Superficie no especificada'}
              </Text>

              <Text style={styles.price}>
                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(item.precioPorHora)} / hora
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapButton: { minHeight: 48, justifyContent: 'center', padding: 12, backgroundColor: '#eef4ee', marginBottom: 12, borderRadius: 8 },
  filterTitle: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 8 },
  filterBtn: { 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    backgroundColor: 'white', 
    borderRadius: 20, 
    marginRight: 10, 
    borderWidth: 1, 
    borderColor: '#ddd' 
  },
  filterBtnActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  filterText: { color: '#666', fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 10, marginBottom: 15, overflow: 'hidden', elevation: 2 },
  image: { width: '100%', height: 150 },
  info: { padding: 15 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  price: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginTop: 8 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 20, fontStyle: 'italic' }
});
