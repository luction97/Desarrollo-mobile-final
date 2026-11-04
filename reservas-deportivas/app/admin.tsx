import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';

const mostrarAlerta = (titulo: string, mensaje: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensaje}`);
  } else {
    Alert.alert(titulo, mensaje);
  }
};

export default function AdminScreen() {
  const [motivo, setMotivo] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [cargando, setCargando] = useState(false);
  const { usuario } = useAuth();
  const router = useRouter();

  // La API pide la fecha como string "AAAA-MM-DD"
  const hoy = new Date().toISOString().split('T')[0];

  const handleBloquearDia = async () => {
    if (!motivo) {
      mostrarAlerta('Atención', 'Escribí un motivo para el bloqueo.');
      return;
    }
    setCargando(true);
    try {
      // Si Swagger te pide otro campo (ej. turnoId en lugar de fecha), cambialo acá
      await api.post('/bloqueos', {
        espacioId: 'esp-02',
        fecha: hoy,
        motivo: motivo,
      });
      mostrarAlerta('Bloqueo exitoso', `La cancha fue bloqueada para el día ${hoy}.`);
      setMotivo('');
    } catch (error: any) {
      mostrarAlerta('Error al bloquear', error.message || 'No se pudo crear el bloqueo.');
    } finally {
      setCargando(false);
    }
  };

  const handleCambiarPrecio = async () => {
    if (!nuevoPrecio || isNaN(Number(nuevoPrecio))) {
      mostrarAlerta('Atención', 'Ingresá un número válido para el precio.');
      return;
    }
    setCargando(true);
    try {
      // 👇 Ahora sí, usamos PATCH que es lo que pide NestJS 👇
      await api.patch('/espacios/esp-02', {
        precioPorHora: Number(nuevoPrecio),
      });
      mostrarAlerta('Precio actualizado', 'El nuevo precio se guardó correctamente.');
      setNuevoPrecio('');
    } catch (error: any) {
      mostrarAlerta('Error al cambiar precio', error.message || 'No se pudo cambiar el precio.');
    } finally {
      setCargando(false);
    }
  };

  if (usuario?.rol !== 'administrador' && usuario?.rol !== 'encargado') {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red', fontWeight: 'bold' }}>Acceso denegado. Solo para administradores.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#1976D2' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Panel de Administración</Text>
      <Text style={styles.subtitle}>Hola {usuario?.nombre}, gestioná los espacios desde acá.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚫 Bloquear Cancha (Lluvia / Mantenimiento)</Text>
        <Text style={styles.cardDesc}>Bloquea la Cancha 2 (esp-02) para el día de hoy ({hoy}).</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Motivo (ej: Cancha anegada)"
          value={motivo}
          onChangeText={setMotivo}
        />
        
        <TouchableOpacity 
          style={styles.buttonRojo} 
          onPress={handleBloquearDia} 
          disabled={cargando}
        >
          <Text style={styles.buttonText}>Bloquear Día</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💰 Cambiar Precio por Hora</Text>
        <Text style={styles.cardDesc}>Modifica el valor de la Cancha 2.</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Nuevo precio (ej: 15000)"
          keyboardType="numeric"
          value={nuevoPrecio}
          onChangeText={setNuevoPrecio}
        />
        
        <TouchableOpacity 
          style={styles.buttonVerde} 
          onPress={handleCambiarPrecio} 
          disabled={cargando}
        >
          <Text style={styles.buttonText}>Actualizar Precio</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginTop: 40, marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 20, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  cardDesc: { fontSize: 14, color: '#666', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 15 },
  buttonRojo: { backgroundColor: '#C62828', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonVerde: { backgroundColor: '#2E7D32', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});