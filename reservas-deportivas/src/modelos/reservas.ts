import type { Espacio, Reserva, Turno } from '../tipos';
import { horarioDeReserva } from '../utils/fechas';

// Modelo de presentación local: no modifica el contrato de la API.
export interface ReservaGuardada {
  reserva: Reserva;
  espacio: Espacio | null;
  turno: (Pick<Turno, 'fecha' | 'inicio' | 'fin'> & { precio: number | null }) | null;
  guardadaEn: string;
}

export function presentarReserva(reserva: Reserva, espacio: Espacio | null, turno?: Turno): ReservaGuardada {
  const horario = horarioDeReserva(reserva.cancelableHasta);
  return {
    reserva, espacio,
    turno: turno ? { fecha: turno.fecha, inicio: turno.inicio, fin: turno.fin, precio: turno.precio }
      : horario ? { ...horario, precio: espacio?.precioPorHora ?? null } : null,
    guardadaEn: new Date().toISOString(),
  };
}
