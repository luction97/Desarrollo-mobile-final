import type { EstadoReserva, EstadoTurno, Rol } from '../tipos';

export const etiquetasReserva: Record<EstadoReserva, string> = {
  confirmada: 'Confirmada', cancelada: 'Cancelada', cumplida: 'Asistió', ausente: 'No asistió',
};

export const etiquetasTurno: Record<EstadoTurno, string> = {
  libre: 'Disponible', reservado: 'Reservado', fijo: 'Reserva fija', mantenimiento: 'No disponible',
};

export const etiquetasRol: Record<Rol, string> = {
  jugador: 'Jugador', encargado: 'Encargado', administrador: 'Administrador',
};
