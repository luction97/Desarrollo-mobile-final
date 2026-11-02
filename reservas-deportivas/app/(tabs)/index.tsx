import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Button, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { obtenerGrillaDia } from '../../src/services/turnos';
import { Turno } from '../../src/tipos';
import { useAuth } from '../../src/context/AuthContext'; 
import { notificacionesService } from '../../src/services/notificaciones';

// 1. Importamos Network y la inicialización de la base de datos
import * as Network from 'expo-network';
import { inicializarDB } from '../../src/services/db';

export default function TabOneScreen() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [sinRed, setSinRed] = useState(false); // <-- Estado para el cartel de offline
  const router = useRouter();
  const { usuario } = useAuth(); 
  
  const fechaPrueba = '2026-10-27'; 

  // 2. Efecto para inicializar SQLite y escuchar el estado de la red
  useEffect(() => {
    inicializarDB();

    const subscription = Network.addNetworkStateListener((state) => {
      setSinRed(!state.isConnected);
    });

    return () => subscription.remove();
  }, []);

  // 3. Efecto para cargar los turnos
  useEffect(() => {
    obtenerGrillaDia('esp-02', fechaPrueba).then(setTurnos);
  }, []);

  const handleReservar = async (turno: Turno) => {
    if (turno.estado !== 'libre') return; 

    const fechaTurno = new Date(`${turno.fecha}T${turno.inicio}:00`);
    await notificacionesService.programarRecordatorio('Cancha 2 - Fútbol 5', fechaTurno);
    
    alert('¡Reserva confirmada! Te enviaremos un recordatorio 2 horas antes (en este caso, en 5 segundos para probar).');
  };

  return (
    <View style={styles.container}>
      {/* 4. Cartel rojo que aparece si el celular se queda sin internet */}
      {sinRed && (
        <View style={{ backgroundColor: '#d32f2f', padding: 10, borderRadius: 5, marginBottom: 10 }}>
          <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
            ⚠️ MODO OFFLINE: Estás viendo datos guardados en tu teléfono.
          </Text>
        </View>
      )}

      <Text style={styles.userTitle}>
        Hola, {usuario ? usuario.nombre : 'Invitado'}
      </Text>

      <Text style={styles.title}>Grilla para el {fechaPrueba}</Text>
      
      {/* BOTONERA ACTUALIZADA */}
      <View style={{ marginBottom: 20 }}>
        <Button 
          title="Ver Detalle y Video de la Cancha" 
          onPress={() => router.push({ pathname: '/espacio/[id]', params: { id: 'esp-02' } })}
          color="#1976D2"
        />
        
        <View style={{ marginTop: 10 }}>
          <Button 
            title="Ir al Login (Probar API)" 
            onPress={() => router.push('/login')} 
            color="#2E7D32"
          />
        </View>
        
        <View style={{ marginTop: 10 }}>
            <Button 
              title="Escanear QR (Modo Encargado)" 
              onPress={() => router.push('/scanner')} 
              color="#E65100"
            />
        </View>
      </View>

      <FlatList
        data={turnos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleReservar(item)}>
            <View style={styles.row}>
              <Text>{item.inicio} - {item.fin}</Text>
              <Text style={{ 
                fontWeight: 'bold',
                color: item.estado === 'libre' ? 'green' : 
                       item.estado === 'fijo' ? 'purple' : 
                       item.estado === 'reservado' ? 'red' : 'orange'
              }}>
                {item.estado.toUpperCase()}
              </Text>
              {item.motivoBloqueo && <Text style={{fontSize: 10, color: 'gray'}}>{item.motivoBloqueo}</Text>}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  userTitle: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' }
});