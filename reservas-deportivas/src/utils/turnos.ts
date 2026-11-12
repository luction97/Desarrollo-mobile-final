import type { Turno } from '../tipos';

export function ordenarTurnosParaMostrar(turnos: readonly Turno[]): Turno[] {
  return [...turnos].sort((a, b) =>
    a.fecha.localeCompare(b.fecha) ||
    a.inicio.localeCompare(b.inicio) ||
    a.id.localeCompare(b.id),
  );
}
