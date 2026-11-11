import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../src/services/api';
import { Reserva } from '../src/tipos';

const obtenerFechaDelQr = (codigoQr: string) => {
  try {
    const partes = codigoQr.split('-');
    if (partes.length >= 3) {
      const mesDia = partes[1]; 
      const hora = partes[2];   
      const dia = mesDia.substring(2, 4); 
      const mes = mesDia.substring(0, 2); 
      return `${dia}/${mes} a las ${hora}:00 hs`;
    }
  } catch (error) {
    return 'Fecha no disponible';
  }
  return 'Fecha no disponible';
};

export default function AgendaScreen() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await api.get<Reserva[]>('/reservas');
      setReservas(data);
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const marcarAusente = async (id: string) => {
    if (Platform.OS === 'web') {
      if (!window.confirm('¿Marcar como ausente?')) return;
    }
    try {
      await api.post(`/reservas/${id}/ausente`, {});
      alert('Ausencia registrada.');
      cargar();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  if (cargando) return <View style={styles.center}><ActivityIndicator size="large" color="#2E7D32" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agenda y Ausentes</Text>
      <FlatList
        data={reservas}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No hay reservas registradas.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Turno Reservado</Text>
                <Text style={styles.dateText}>📅 {obtenerFechaDelQr(item.codigoQr)}</Text>
              </View>
              <Text style={[styles.status, { color: item.estado === 'confirmada' ? '#2E7D32' : '#C62828' }]}>
                {item.estado.toUpperCase()}
              </Text>
            </View>
            
            <View style={{ alignItems: 'center', marginVertical: 15, backgroundColor: 'white', padding: 10, borderRadius: 10 }}>
              <QRCode value={item.codigoQr} size={120} />
            </View>

            <Text style={styles.info}>Código: {item.codigoQr}</Text>
            <Text style={styles.info}>Personas: {item.cantidadPersonas}</Text>
            
            {item.estado === 'confirmada' && (
              <TouchableOpacity style={styles.btnAusente} onPress={() => marcarAusente(item.id)}>
                <Text style={styles.btnText}>Marcar como Ausente ❌</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 20 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  dateText: { fontSize: 15, color: '#1976D2', fontWeight: 'bold', marginTop: 4 },
  status: { fontWeight: 'bold', fontSize: 12, backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  info: { color: '#666', textAlign: 'center', marginBottom: 3 },
  btnAusente: { backgroundColor: '#FFCDD2', padding: 12, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  btnText: { color: '#C62828', fontWeight: 'bold', fontSize: 16 },
});