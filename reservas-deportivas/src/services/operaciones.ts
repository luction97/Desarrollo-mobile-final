import { api } from './api';
import { errorDeFecha, errorDeRangoHorario } from '../utils/horarios';
import type { Bloqueo, Espacio, Reserva, Turno, Usuario } from '../tipos';

export interface EntradaBloqueo {
  espacioIds: string[];
  fecha: string;
  motivo: string;
  inicio?: string;
  fin?: string;
}

export const operacionesService = {
  marcarAusente(id: string): Promise<Reserva> {
    return api.post<Reserva>(`/reservas/${encodeURIComponent(id)}/ausente`, {});
  },

  cancelarReserva(id: string): Promise<Reserva> {
    return api.post<Reserva>(`/reservas/${encodeURIComponent(id)}/cancelacion`, {});
  },

  listarAgenda(fecha: string): Promise<Turno[]> {
    return api.listarTodo<Turno>(`/agenda?fecha=${encodeURIComponent(fecha)}`);
  },

  cambiarPrecio(espacioId: string, precioPorHora: number): Promise<Espacio> {
    return api.patch<Espacio>(`/espacios/${encodeURIComponent(espacioId)}`, { precioPorHora });
  },

  registrarIngreso(codigoQr: string, espacioId: string): Promise<Reserva> {
    if (!codigoQr.trim() || !espacioId) {
      return Promise.reject(new Error('Indicá el código y la cancha de ingreso.'));
    }
    return api.post<Reserva>('/ingresos', { codigoQr: codigoQr.trim(), espacioId });
  },

  /** Datos del titular de una reserva (con teléfono e historial), para la agenda del personal. */
  obtenerUsuario(id: string): Promise<Usuario> {
    return api.get<Usuario>(`/usuarios/${encodeURIComponent(id)}`);
  },

  /** Reservas de todos los espacios para una fecha, para la agenda del día. */
  listarReservasDelDia(fecha: string): Promise<Reserva[]> {
    return api.listarTodo<Reserva>(`/reservas?fecha=${encodeURIComponent(fecha)}`);
  },

  /** Bloquea uno o varios espacios para una fecha: día entero, o rango horario si se indica. */
  async bloquear(entrada: EntradaBloqueo): Promise<Bloqueo[]> {
    if (!entrada.espacioIds.length) throw new Error('Seleccioná al menos una cancha.');
    if (!entrada.motivo.trim()) throw new Error('Escribí un motivo para el bloqueo.');
    const errorFecha = errorDeFecha(entrada.fecha);
    if (errorFecha) throw new Error(errorFecha);
    const errorHoras = errorDeRangoHorario(entrada.inicio, entrada.fin);
    if (errorHoras) throw new Error(errorHoras);
    const cuerpo: Record<string, unknown> = {
      espacioIds: entrada.espacioIds,
      fecha: entrada.fecha,
      motivo: entrada.motivo.trim(),
    };
    if (entrada.inicio && entrada.fin) {
      cuerpo.inicio = entrada.inicio;
      cuerpo.fin = entrada.fin;
    }
    return api.post<Bloqueo[]>('/bloqueos', cuerpo);
  },

  /** Bloqueos del espacio vigentes a partir de una fecha (inclusiva). */
  listarBloqueos(espacioId: string, desde: string): Promise<Bloqueo[]> {
    return api.listarTodo<Bloqueo>(`/bloqueos?espacioId=${encodeURIComponent(espacioId)}&desde=${encodeURIComponent(desde)}`);
  },

  /** Cancela un bloqueo; las reservas que este canceló siguen canceladas. */
  async cancelarBloqueo(id: string): Promise<void> {
    await api.delete(`/bloqueos/${encodeURIComponent(id)}`);
  },
};
