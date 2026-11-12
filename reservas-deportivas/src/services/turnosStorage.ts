import type { Turno } from '../tipos';
import { leerLocal, escribirLocal } from './localStore';

export function guardarTurnosLocalmente(espacioId: string, fecha: string, turnos: Turno[]) {
  return escribirLocal(`turnos:${espacioId}:${fecha}`, turnos);
}

export async function obtenerTurnosLocales(espacioId: string, fecha: string): Promise<Turno[]> {
  return await leerLocal<Turno[]>(`turnos:${espacioId}:${fecha}`) ?? [];
}
