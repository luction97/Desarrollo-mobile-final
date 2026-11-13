import { diasDeReserva, fechaArgentina } from '../utils/fechas';
import { guardarTurnosLocalmente } from './turnosStorage';

const oyentes = new Set<() => void>();

/** Se avisa cuando una reserva fija o un bloqueo cambia, para que la grilla se actualice. */
export function notificarCambioDeTurnos() {
  oyentes.forEach(oyente => { try { oyente(); } catch { /* Un oyente fallido no debe romper los otros. */ } });
}

export function alCambiarTurnos(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}

/** Borra las grillas cacheadas de un espacio para las fechas visibles (7 días). */
export async function invalidarGrillaLocal(espacioId: string): Promise<void> {
  const hoy = fechaArgentina();
  const dias = diasDeReserva(hoy);
  await Promise.all(dias.map(dia =>
    guardarTurnosLocalmente(espacioId, dia.fecha, []).catch(() => undefined)));
}
