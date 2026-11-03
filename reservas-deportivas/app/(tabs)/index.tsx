import { api } from '../../src/services/api';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router'; 
import { obtenerGrillaDia } from '../../src/services/turnos';
import { Turno } from '../../src/tipos';
import { useAuth } from '../../src/context/AuthContext'; 
import { notificacionesService } from '../../src/services/notificaciones';
import * as Network from 'expo-network';
import { inicializarDB } from '../../src/services/db';

const mostrarAlerta = (titulo: string, mensaje: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${titulo}\n\n${mensaje}`);
  } else {
    Alert.alert(titulo, mensaje);
  }
};

export default function TabOneScreen() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [sinRed, setSinRed] = useState(false);
  const router = useRouter();
  // Solo traemos 'usuario', ya no usamos 'logout' acá
  const { usuario } = useAuth(); 
  
  const fechaActual = new Date();
  const year = fechaActual.getFullYear();
  const month = String(fechaActual.getMonth() + 1).padStart(2, '0');
  const day = String(fechaActual.getDate()).padStart(2, '0');
  const fechaPrueba = `${year}-${month}-${day}`;

  useEffect(() => {
    inicializarDB();
    const subscription = Network.addNetworkStateListener((state) => {
      setSinRed(!state.isConnected);
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      obtenerGrillaDia('esp-02', fechaPrueba).then(setTurnos);
    }, [fechaPrueba])
  );

  const handleReservar = async (turno: Turno) => {
    if (turno.estado !== 'libre') return; 
    
    if (!usuario) {
      mostrarAlerta('Atención', 'Para reservar tenés que iniciar sesión.');
      router.push('/login');
      return;
    }

    const ahora = new Date();
    const horaTurno = new Date(`${turno.fecha}T${turno.inicio}:00`);
    if (horaTurno < ahora) {
      mostrarAlerta('Turno pasado', 'Este turno ya pasó, no se puede reservar.');
      return;
    }

    try {
      await api.post('/reservas', {
        turnoId: turno.id, 
        cantidadPersonas: 2, 
      });

      // Actualización optimista para que cambie a RESERVADO en pantalla
      setTurnos(prevTurnos => 
        prevTurnos.map(t => 
          t.id === turno.id ? { ...t, estado: 'reservado' as any } : t
        )
      );

      const fechaTurno = new Date(`${turno.fecha}T${turno.inicio}:00`);
      await notificacionesService.programarRecordatorio('Cancha 2 - Fútbol 5', fechaTurno);
      
      mostrarAlerta('¡Reserva confirmada!', 'Tu reserva se guardó. Podés verla en "Mis Reservas".');

    } catch (error: any) {
      mostrarAlerta('Error al reservar', error.message || 'No se pudo reservar el turno.');
    }
  };

  // 👇 ACÁ ESTÁ EL CAMBIO: Ya no borra la sesión, solo redirige al login
  const handleLogout = async () => {
    router.replace('/login'); 
  };

  return (
    <View style={styles.container}>
      {sinRed && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠️ MODO OFFLINE: Datos guardados localmente.</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.userTitle}>
          Hola, {usuario ? usuario.nombre.split(' ')[0] : 'Invitado'} 👋
        </Text>
        
        {usuario ? (
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/login')} style={styles.loginButton}>
            <Text style={styles.loginText}>Entrar</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>Grilla para el {fechaPrueba}</Text>
      
      <View style={styles.cardsContainer}>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: '#1976D2' }]}
          onPress={() => router.push({ pathname: '/espacio/[id]', params: { id: 'esp-02' } })}
        >
          <Text style={styles.cardText}>📹 Ver Detalle y Video</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, { backgroundColor: '#E65100' }]}
          onPress={() => router.push('/scanner')}
        >
          <Text style={styles.cardText}>📷 Escanear QR</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={turnos}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyText}>Cargando turnos...</Text>}
        renderItem={({ item }) => {
          const horaTurno = new Date(`${item.fecha}T${item.inicio}:00`);
          const esPasado = horaTurno < new Date();
          
          return (
            <TouchableOpacity onPress={() => handleReservar(item)} activeOpacity={0.7}>
              <View style={[styles.row, esPasado && { opacity: 0.5 }]}>
                <View>
                  <Text style={styles.hourText}>{item.inicio} - {item.fin}</Text>
                  {item.motivoBloqueo && <Text style={styles.reasonText}>{item.motivoBloqueo}</Text>}
                  {esPasado && <Text style={styles.reasonText}>⌛ Turno pasado</Text>}
                </View>
                <View style={[styles.badge, { 
                  backgroundColor: item.estado === 'libre' ? '#E8F5E9' : 
                                   item.estado === 'fijo' ? '#F3E5F5' : 
                                   item.estado === 'reservado' ? '#FFEBEE' : '#FFF3E0'
                }]}>
                  <Text style={{ 
                    fontWeight: 'bold',
                    color: item.estado === 'libre' ? '#2E7D32' : 
                           item.estado === 'fijo' ? '#7B1FA2' : 
                           item.estado === 'reservado' ? '#C62828' : '#E65100'
                  }}>
                    {item.estado.toUpperCase()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#FAFAFA' },
  offlineBanner: { backgroundColor: '#d32f2f', padding: 10, borderRadius: 8, marginBottom: 15 },
  offlineText: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  userTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  logoutButton: { backgroundColor: '#FFCDD2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  logoutText: { color: '#C62828', fontWeight: 'bold', fontSize: 12 },
  loginButton: { backgroundColor: '#C8E6C9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  loginText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12 },
  title: { fontSize: 16, color: '#666', marginBottom: 20 },
  cardsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  card: { flex: 1, padding: 15, borderRadius: 10, marginHorizontal: 5, alignItems: 'center', elevation: 2 },
  cardText: { color: 'white', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 15, backgroundColor: 'white', marginBottom: 8, borderRadius: 10, alignItems: 'center', elevation: 1 },
  hourText: { fontSize: 16, fontWeight: '500', color: '#333' },
  reasonText: { fontSize: 11, color: '#888', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 20 },
});