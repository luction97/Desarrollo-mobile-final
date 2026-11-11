import Storage from './mapaStorage';
import { PuntoMapa, puntoValido } from '../mapa/modelo';

const CLAVE = 'mapa.puntos-publicos.v1';

export async function obtenerPuntosLocales(): Promise<PuntoMapa[]> {
  try {
    const valor: unknown = JSON.parse(await Storage.getItem(CLAVE) ?? '[]');
    return Array.isArray(valor) ? valor.filter(puntoValido) : [];
  } catch { return []; }
}

export async function guardarPuntosLocales(puntos: PuntoMapa[]): Promise<void> {
  const todos = new Map((await obtenerPuntosLocales()).map(p => [p.id, p]));
  puntos.filter(puntoValido).forEach(p => todos.set(p.id, { id: p.id, nombre: p.nombre, latitud: p.latitud, longitud: p.longitud }));
  try { await Storage.setItem(CLAVE, JSON.stringify([...todos.values()])); } catch { /* La caché no impide consultar el mapa. */ }
}
