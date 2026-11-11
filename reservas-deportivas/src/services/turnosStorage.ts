import type { Turno } from '../tipos';
import { leerLocal, escribirLocal } from './localStore';

export async function inicializarDB() { /* La conexión se abre de forma diferida en localStore. */ }

export async function guardarTurnosLocalmente(turnos: Turno[]) {
  const grupos = new Map<string, Turno[]>();
  for (const turno of turnos) {
    const clave = `turnos:${turno.espacioId}:${turno.fecha}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), turno]);
  }
  for (const [clave, datos] of grupos) await escribirLocal(clave, datos);
}

export async function obtenerTurnosLocales(espacioId: string, fecha: string): Promise<Turno[]> {
  return await leerLocal<Turno[]>(`turnos:${espacioId}:${fecha}`) ?? [];
}
