import { api } from '../../src/services/api';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Platform, ActivityIndicator, Button, ScrollView } from 'react-native';
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
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dias, setDias] = useState<{ fecha: Date, diaSemana: string, diaNumero: string, fechaStr: string }[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());

  const router = useRouter();
  const { usuario } = useAuth(); 

  useEffect(() => {
    const proximos7Dias = [];
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    for (let i = 0; i < 7; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + i);
      
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      
      proximos7Dias.push({
        fecha,
        diaSemana: i === 0 ? 'Hoy' : diasSemana[fecha.getDay()],
        diaNumero: day,
        fechaStr: `${year}-${month}-${day}`
      });
    }
    setDias(proximos7Dias);
  }, []);

  const formatearFecha = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const fechaPrueba = formatearFecha(fechaSeleccionada);

  useEffect(() => {
    inicializarDB();
    const subscription = Network.addNetworkStateListener((state) => {
      setSinRed(!state.isConnected);
    });
    return () => subscription.remove();
  }, []);

  const cargarGrilla = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerGrillaDia('esp-02', fechaPrueba);
      setTurnos(data);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los turnos. Revisá tu conexión.');
    } finally {
      setCargando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarGrilla();
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

  const handleLogout = async () => {
    router.replace('/login'); 
  };

  const renderContenido = () => {
    if (cargando) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={{ marginTop: 10, color: '#666' }}>Cargando disponibilidad...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={{ color: '#C62828', textAlign: 'center', marginBottom: 15 }}>{error}</Text>
          <Button title="Reintentar" onPress={cargarGrilla} color="#2E7D32" />
        </View>
      );
    }

    return (
      <FlatList
        data={turnos}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay turnos disponibles para este día.</Text>
        }
        renderItem={({ item }) => {
          const horaTurno = new Date(`${item.fecha}T${item.inicio}:00`);
          const esPasado = horaTurno < new Date();
          
          const precioFormateado = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(item.precio);

          return (
            <TouchableOpacity onPress={() => handleReservar(item)} activeOpacity={0.7}>
              <View style={[styles.row, esPasado && { opacity: 0.5 }]}>
                <View>
                  <Text style={styles.hourText}>{item.inicio} - {item.fin}</Text>
                  {item.motivoBloqueo && <Text style={styles.reasonText}>{item.motivoBloqueo}</Text>}
                  {esPasado && <Text style={styles.reasonText}>⌛ Turno pasado</Text>}
                  
                  {item.estado === 'libre' && !esPasado && (
                    <Text style={styles.priceText}>{precioFormateado}</Text>
                  )}
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
    );
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysContainer}>
        {dias.map((dia, index) => {
          const isSelected = dia.fechaStr === fechaPrueba;
          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.dayCard, isSelected && styles.dayCardSelected]}
              onPress={() => setFechaSeleccionada(dia.fecha)}
            >
              <Text style={[styles.dayName, isSelected && { color: 'white' }]}>{dia.diaSemana}</Text>
              <Text style={[styles.dayNumber, isSelected && { color: 'white' }]}>{dia.diaNumero}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
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

      {/* 👇 BOTONERA DE ADMINISTRACIÓN COMPLETA 👇 */}
      {(usuario?.rol === 'administrador' || usuario?.rol === 'encargado') && (
        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity 
            style={{ backgroundColor: '#333', padding: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 10 }}
            onPress={() => router.push('/admin')}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>⚙️ Panel de Administración</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ backgroundColor: '#455A64', padding: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 10 }}
            onPress={() => router.push('/agenda')}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>📋 Agenda del Día y Ausentes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ backgroundColor: '#1976D2', padding: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
            onPress={() => router.push('/catalogo')}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>🏟️ Ver Catálogo de Espacios</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* 👆 FIN DE LA BOTONERA DE ADMINISTRACIÓN 👆 */}

      <View style={{ flex: 1 }}>
        {renderContenido()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#FAFAFA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 50 },
  offlineBanner: { backgroundColor: '#d32f2f', padding: 10, borderRadius: 8, marginBottom: 15 },
  offlineText: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  userTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  logoutButton: { backgroundColor: '#FFCDD2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  logoutText: { color: '#C62828', fontWeight: 'bold', fontSize: 12 },
  loginButton: { backgroundColor: '#C8E6C9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  loginText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12 },
  
  daysContainer: { marginBottom: 20, maxHeight: 80 },
  dayCard: { 
    width: 65, 
    height: 75, 
    backgroundColor: 'white', 
    borderRadius: 12, 
    marginRight: 10, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 1,
    borderWidth: 1,
    borderColor: '#eee'
  },
  dayCardSelected: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  dayName: { fontSize: 14, color: '#666', fontWeight: 'bold', marginBottom: 4 },
  dayNumber: { fontSize: 20, color: '#333', fontWeight: 'bold' },

  cardsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  card: { flex: 1, padding: 15, borderRadius: 10, marginHorizontal: 5, alignItems: 'center', elevation: 2 },
  cardText: { color: 'white', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 15, backgroundColor: 'white', marginBottom: 8, borderRadius: 10, alignItems: 'center', elevation: 1 },
  hourText: { fontSize: 16, fontWeight: '500', color: '#333' },
  reasonText: { fontSize: 11, color: '#888', marginTop: 2 },
  priceText: { fontSize: 13, color: '#2E7D32', fontWeight: 'bold', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
});