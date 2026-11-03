import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router'; // <-- Importamos el hook
import { api } from '../../src/services/api';
import { Reserva } from '../../src/tipos';

const mostrarAlerta = (titulo: string, mensaje: string, onConfirm?: () => void) => {
  if (Platform.OS === 'web') {
    if (onConfirm) {
      if (window.confirm(`${titulo}\n\n${mensaje}`)) onConfirm();
    } else {
      window.alert(`${titulo}\n\n${mensaje}`);
    }
  } else {
    if (onConfirm) {
      Alert.alert(titulo, mensaje, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aceptar', style: 'destructive', onPress: onConfirm },
      ]);
    } else {
      Alert.alert(titulo, mensaje);
    }
  }
};

export default function MisReservasScreen() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarReservas = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.get<Reserva[]>('/yo/reservas');
      console.log('Reservas actualizadas desde la API:', data);
      setReservas(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las reservas.');
    } finally {
      setCargando(false);
    }
  };

  // 🔥 ACÁ ESTÁ LA MAGIA: Se ejecuta cada vez que entrás a la pestaña
  useFocusEffect(
    useCallback(() => {
      cargarReservas();
    }, [])
  );

  const handleCancelar = (id: string) => {
    mostrarAlerta(
      'Cancelar Reserva',
      '¿Estás seguro que querés cancelar este turno?',
      async () => {
        try {
          await api.post(`/reservas/${id}/cancelacion`, {});
          mostrarAlerta('Cancelada', 'La reserva fue cancelada correctamente.');
          await cargarReservas(); // Recarga la lista
        } catch (err: any) {
          mostrarAlerta('Error', err.message || 'No se pudo cancelar la reserva.');
        }
      }
    );
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={{ marginTop: 10 }}>Cargando reservas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red', marginBottom: 20, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity onPress={cargarReservas} style={styles.retryButton}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Filtramos solo las activas (confirmadas)
  const futuras = reservas.filter(r => r.estado === 'confirmada');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Reservas Activas</Text>
      
      <FlatList
        data={futuras}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No tenés reservas activas por ahora.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Turno Reservado</Text>
              <Text style={styles.cardStatus}>{item.estado.toUpperCase()}</Text>
            </View>
            <Text style={styles.cardInfo}>Código QR: {item.codigoQr}</Text>
            <Text style={styles.cardInfo}>Personas: {item.cantidadPersonas}</Text>
            
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => handleCancelar(item.id)}
            >
              <Text style={styles.cancelText}>Cancelar Reserva</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 40 },
  emptyText: { color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  cardStatus: { color: '#2E7D32', fontWeight: 'bold' },
  cardInfo: { fontSize: 14, color: '#555', marginBottom: 5 },
  cancelButton: { marginTop: 15, padding: 10, backgroundColor: '#FFCDD2', borderRadius: 5, alignItems: 'center' },
  cancelText: { color: '#C62828', fontWeight: 'bold' },
  retryButton: { backgroundColor: '#1976D2', padding: 10, borderRadius: 5 },
});