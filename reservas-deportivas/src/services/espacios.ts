import { api } from './api';
import { leerLocal, escribirLocal } from './localStore';
import type { Deporte, Espacio } from '../tipos';

export async function obtenerEspaciosLocales(): Promise<Espacio[]> {
  return await leerLocal<Espacio[]>('espacios') ?? [];
}

export async function obtenerEspacios(): Promise<{ datos: Espacio[]; local: boolean }> {
  try {
    const datos = await api.listarTodo<Espacio>('/espacios');
    await escribirLocal('espacios', datos).catch(() => undefined);
    return { datos, local: false };
  } catch (error) {
    const datos = await obtenerEspaciosLocales();
    if (!datos.length) throw error;
    return { datos, local: true };
  }
}

export async function obtenerEspacioLocal(id: string): Promise<Espacio | null> {
  return await leerLocal<Espacio>(`espacio:${id}`) ?? (await obtenerEspaciosLocales()).find(e => e.id === id) ?? null;
}

export async function obtenerEspacio(id: string): Promise<{ datos: Espacio; local: boolean }> {
  const clave = `espacio:${id}`;
  try {
    const dato = await api.get<Espacio>(`/espacios/${encodeURIComponent(id)}`);
    await escribirLocal(clave, dato).catch(() => undefined);
    return { datos: dato, local: false };
  } catch (error) {
    const dato = await obtenerEspacioLocal(id);
    if (!dato) throw error;
    return { datos: dato, local: true };
  }
}

export async function obtenerDeportes(): Promise<Deporte[]> {
  try {
    const datos = await api.listarTodo<Deporte>('/deportes');
    await escribirLocal('deportes', datos).catch(() => undefined);
    return datos;
  } catch (error) {
    const locales = await leerLocal<Deporte[]>('deportes');
    if (locales) return locales;
    throw error;
  }
}
