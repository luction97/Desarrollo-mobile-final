import { Turno } from '../tipos';

// Implementación web del módulo ./db (Metro resuelve db.native.ts en iOS/Android).
export async function inicializarDB() {
}

export async function guardarTurnosLocalmente(turnos: Turno[]) {
  localStorage.setItem('turnos_guardados', JSON.stringify(turnos));
}

export async function obtenerTurnosLocales(espacioId: string, fecha: string): Promise<Turno[]> {
  const guardados = localStorage.getItem('turnos_guardados');
  if (!guardados) return [];
  
  const todos: Turno[] = JSON.parse(guardados);
  return todos.filter(t => t.espacioId === espacioId && t.fecha === fecha);
}