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
  puntos.filter(puntoValido).forEach(({ id, nombre, latitud, longitud, complejo }) =>
    todos.set(id, { id, nombre, latitud, longitud, complejo }));
  try { await Storage.setItem(CLAVE, JSON.stringify([...todos.values()])); } catch { /* La caché no impide consultar el mapa. */ }
}
