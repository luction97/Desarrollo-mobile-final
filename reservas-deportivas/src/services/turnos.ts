import { api } from './api';
import { guardarTurnosLocalmente, obtenerTurnosLocales } from './turnosStorage';
import * as Network from 'expo-network';
import type { Turno } from '../tipos';

export async function consultarGrilla(espacioId: string, fecha: string): Promise<{ datos: Turno[]; local: boolean }> {
  let conectado = true;
  try { conectado = (await Network.getNetworkStateAsync()).isConnected !== false; } catch { /* Se intenta la API igual. */ }
  if (conectado) {
    try {
      const datos = await api.listarTodo<Turno>(`/espacios/${encodeURIComponent(espacioId)}/turnos?fecha=${fecha}`);
      await guardarTurnosLocalmente(datos).catch(() => undefined);
      return { datos, local: false };
    } catch (error) {
      const datos = await obtenerTurnosLocales(espacioId, fecha);
      if (!datos.length) throw error;
      return { datos, local: true };
    }
  }
  return { datos: await obtenerTurnosLocales(espacioId, fecha), local: true };
}

export async function obtenerGrillaDia(espacioId: string, fecha: string): Promise<Turno[]> {
  return (await consultarGrilla(espacioId, fecha)).datos;
}
