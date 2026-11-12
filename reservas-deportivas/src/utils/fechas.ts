export const ZONA = 'America/Argentina/Buenos_Aires';

export function diasDeReserva(hoy: string) {
  const formato = new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: ZONA });
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(`${hoy}T12:00:00-03:00`);
    dia.setUTCDate(dia.getUTCDate() + i);
    return { fecha: fechaArgentina(dia), nombre: i === 0 ? 'Hoy' : formato.format(dia) };
  });
}

export function fechaArgentina(fecha = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
}

export function instanteTurno(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00-03:00`);
}

export function fechaLegible(fecha: string): string {
  return fecha.split('-').reverse().join('/');
}

export function horarioDeReserva(cancelableHasta: string) {
  // SPECIFICATION R10: cancelableHasta es exactamente inicio menos cuatro horas.
  const inicio = new Date(new Date(cancelableHasta).getTime() + 4 * 60 * 60 * 1000);
  if (!Number.isFinite(inicio.getTime())) return null;
  const hora = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  return { fecha: fechaArgentina(inicio), inicio: hora.format(inicio), fin: hora.format(fin) === '00:00' ? '24:00' : hora.format(fin) };
}
