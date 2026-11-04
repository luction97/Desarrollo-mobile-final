import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
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

// 👇 FUNCIÓN MÁGICA PARA EXTRAER LA FECHA DEL CÓDIGO QR 👇
const obtenerFechaDelQr = (codigoQr: string) => {
  try {
    // El código tiene el formato: VGY-1104-23-QZMUR8
    const partes = codigoQr.split('-');
    if (partes.length >= 3) {
      const mesDia = partes[1]; // "1104" -> 4 de Noviembre
      const hora = partes[2];   // "23" -> 23:00
      
      const dia = mesDia.substring(2, 4); // "04"
      const mes = mesDia.substring(0, 2); // "11"
      
      // Formateamos a algo lindo: "04/11 a las 23:00 hs"
      return `${dia}/${mes} a las ${hora}:00 hs`;
    }
  } catch (error) {
    return 'Fecha no disponible';
  }
  return 'Fecha no disponible';
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
          await cargarReservas(); 
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
              <View>
                <Text style={styles.cardTitle}>Cancha 2 - Fútbol 5</Text>
                {/* 👇 ACÁ MOSTRAMOS LA FECHA EXTRAÍDA 👇 */}
                <Text style={styles.cardDate}>
                  📅 {obtenerFechaDelQr(item.codigoQr)}
                </Text>
              </View>
              <Text style={styles.cardStatus}>{item.estado.toUpperCase()}</Text>
            </View>
            
            <View style={{ alignItems: 'center', marginVertical: 15, backgroundColor: 'white', padding: 10, borderRadius: 10 }}>
              <QRCode 
                value={item.codigoQr} 
                size={150} 
              />
            </View>

            <Text style={styles.cardInfo}>Código: {item.codigoQr}</Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardDate: { fontSize: 15, color: '#1976D2', fontWeight: 'bold', marginTop: 4 },
  cardStatus: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12, backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  cardInfo: { fontSize: 14, color: '#555', marginBottom: 5, textAlign: 'center' },
  cancelButton: { marginTop: 15, padding: 10, backgroundColor: '#FFCDD2', borderRadius: 5, alignItems: 'center' },
  cancelText: { color: '#C62828', fontWeight: 'bold' },
  retryButton: { backgroundColor: '#1976D2', padding: 10, borderRadius: 5 },
});