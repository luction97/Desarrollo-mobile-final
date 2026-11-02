import { Turno } from '../tipos';

// VERSIÓN WEB: Usa localStorage en lugar de SQLite
export async function inicializarDB() {
  // No hace falta inicializar nada en la web
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