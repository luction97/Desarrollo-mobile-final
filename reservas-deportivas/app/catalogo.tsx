import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';
import { Espacio } from '../src/tipos';

export default function CatalogoScreen() {
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [filtroDeporte, setFiltroDeporte] = useState<string>('todos');
  const [filtroComplejo, setFiltroComplejo] = useState<string>('todos');
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get<Espacio[]>('/espacios').then(data => {
      setEspacios(data);
      setCargando(false);
    }).catch(err => {
      console.error(err);
      setCargando(false);
    });
  }, []);

  // 👇 FILTRAMOS LOS COMPLEJOS VACÍOS O CON GUIONES 👇
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

  if (cargando) return <View style={styles.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;

  return (
    <View style={styles.container}>
      
      {/* FILTRO POR DEPORTE */}
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

      {/* FILTRO POR COMPLEJO */}
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
        ListEmptyComponent={<Text style={styles.emptyText}>No hay espacios que coincidan con los filtros.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push({ pathname: '/espacio/[id]', params: { id: item.id } })}
          >
            <Image source={{ uri: item.imagenes[0] }} style={styles.image} />
            <View style={styles.info}>
              <Text style={styles.title}>{item.nombre}</Text>
              
              {/* 👇 FORMATEAMOS EL SUBTÍTULO PARA EVITAR EL "— • Arena" 👇 */}
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
