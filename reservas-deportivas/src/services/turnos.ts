import { api } from './api';
import { guardarTurnosLocalmente, obtenerTurnosLocales } from './db';
import * as Network from 'expo-network';
import { Turno } from '../tipos';

export async function obtenerGrillaDia(espacioId: string, fecha: string): Promise<Turno[]> {
  // 1. Chequeamos si hay internet
  const estadoRed = await Network.getNetworkStateAsync();
  
  if (!estadoRed.isConnected) {
    console.log('⚠️ Sin internet, leyendo de SQLite...');
    return await obtenerTurnosLocales(espacioId, fecha);
  }

  try {
    // 2. ¡Llamamos a la API REAL!
    console.log('🌐 Conectado, buscando turnos reales en la API...');
    
    // Le pasamos el id y la fecha por query params
    const turnosReales = await api.get<Turno[]>(`/espacios/${espacioId}/turnos?fecha=${fecha}`);

    // 3. Guardamos en SQLite para el modo offline
    await guardarTurnosLocalmente(turnosReales);
    
    return turnosReales;
  } catch (error) {
    console.error('Error al traer turnos de la API, usando datos locales:', error);
    // Si falla la API, intentamos leer de SQLite
    return await obtenerTurnosLocales(espacioId, fecha);
  }
}