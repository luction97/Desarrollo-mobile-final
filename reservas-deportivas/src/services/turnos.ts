import { api } from './api';
import { guardarTurnosLocalmente, obtenerTurnosLocales } from './turnosStorage';
import * as Network from 'expo-network';
import type { Turno } from '../tipos';
import { instanteTurno } from '../utils/fechas';

export async function consultarGrilla(espacioId: string, fecha: string): Promise<{ datos: Turno[]; local: boolean; liberados?: Turno[] }> {
  let conectado = true;
  try {
    const red = await Network.getNetworkStateAsync();
    conectado = red.isConnected !== false && red.isInternetReachable !== false;
  } catch { /* Se intenta la API igual. */ }
  if (conectado) {
    try {
      const datos = await api.listarTodo<Turno>(`/espacios/${encodeURIComponent(espacioId)}/turnos?fecha=${fecha}`);
      const previos = await obtenerTurnosLocales(espacioId, fecha).catch(() => []);
      const ocupados = new Set(previos.filter(t => t.estado !== 'libre').map(t => t.id));
      const ahora = Date.now();
      const liberados = datos.filter(t => t.estado === 'libre' && ocupados.has(t.id) &&
        instanteTurno(t.fecha, t.inicio).getTime() > ahora);
      await guardarTurnosLocalmente(espacioId, fecha, datos).catch(() => undefined);
      return { datos, local: false, liberados };
    } catch (error) {
      const datos = await obtenerTurnosLocales(espacioId, fecha);
      if (!datos.length) throw error;
      return { datos, local: true };
    }
  }
  return { datos: await obtenerTurnosLocales(espacioId, fecha), local: true };
}
