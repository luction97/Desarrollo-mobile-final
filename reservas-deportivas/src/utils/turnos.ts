import type { Turno } from '../tipos';

export function ordenarTurnosParaMostrar(turnos: readonly Turno[], ahora: Date): Turno[] {
  const prioridad = (turno: Turno) => {
    const inicio = new Date(`${turno.fecha}T${turno.inicio}:00-03:00`);
    if (inicio <= ahora) return 2;
    return turno.estado === 'libre' ? 0 : 1;
  };

  return [...turnos].sort((a, b) =>
    prioridad(a) - prioridad(b) ||
    b.fecha.localeCompare(a.fecha) ||
    b.inicio.localeCompare(a.inicio) ||
    a.id.localeCompare(b.id),
  );
}
