import { api } from './api';
import { leerLocal, escribirLocal } from './localStore';
import type { Deporte, Espacio } from '../tipos';

export async function obtenerEspaciosLocales(): Promise<Espacio[]> {
  return await leerLocal<Espacio[]>('espacios') ?? [];
}

export async function obtenerEspacios(): Promise<{ datos: Espacio[]; local: boolean }> {
  try {
    const datos = await api.listarTodo<Espacio>('/espacios');
    if (datos.length) await escribirLocal('espacios', datos).catch(() => undefined);
    return { datos, local: false };
  } catch (error) {
    const datos = await obtenerEspaciosLocales();
    if (!datos.length) throw error;
    return { datos, local: true };
  }
}

export async function obtenerEspacio(id: string): Promise<Espacio> {
  const clave = `espacio:${id}`;
  try {
    const dato = await api.get<Espacio>(`/espacios/${encodeURIComponent(id)}`);
    await escribirLocal(clave, dato).catch(() => undefined);
    return dato;
  } catch (error) {
    const dato = await leerLocal<Espacio>(clave) ?? (await obtenerEspaciosLocales()).find(e => e.id === id);
    if (!dato) throw error;
    return dato;
  }
}

export async function obtenerDeportes(): Promise<Deporte[]> {
  try {
    const datos = await api.listarTodo<Deporte>('/deportes');
    await escribirLocal('deportes', datos).catch(() => undefined);
    return datos;
  } catch { return await leerLocal<Deporte[]>('deportes') ?? []; }
}
