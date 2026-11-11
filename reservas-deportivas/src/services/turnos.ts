import { api } from './api';
import { guardarTurnosLocalmente, obtenerTurnosLocales } from './db';
import * as Network from 'expo-network';
import { Turno } from '../tipos';

export async function obtenerGrillaDia(espacioId: string, fecha: string): Promise<Turno[]> {
  const estadoRed = await Network.getNetworkStateAsync();
  
  if (!estadoRed.isConnected) {
    console.log('⚠️ Sin internet, leyendo de SQLite...');
    return await obtenerTurnosLocales(espacioId, fecha);
  }

  try {
    console.log('🌐 Conectado, buscando turnos reales en la API...');
    
    const turnosReales = await api.get<Turno[]>(`/espacios/${espacioId}/turnos?fecha=${fecha}`);

    await guardarTurnosLocalmente(turnosReales);
    
    return turnosReales;
  } catch (error) {
    console.error('Error al traer turnos de la API, usando datos locales:', error);
    return await obtenerTurnosLocales(espacioId, fecha);
  }
}