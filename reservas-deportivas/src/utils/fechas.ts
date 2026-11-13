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

/** Último día del mes de una fecha "AAAA-MM-DD". Sirve para las reservas fijas que cubren el mes. */
export function finDeMes(fecha: string): string | null {
  const [anio, mes] = fecha.split('-').map(Number);
  if (!anio || !mes || mes < 1 || mes > 12) return null;
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return `${anio}-${String(mes).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`;
}

export function horarioDeReserva(cancelableHasta: string) {
  // SPECIFICATION R10: cancelableHasta es exactamente inicio menos cuatro horas.
  const inicio = new Date(new Date(cancelableHasta).getTime() + 4 * 60 * 60 * 1000);
  if (!Number.isFinite(inicio.getTime())) return null;
  const hora = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  return { fecha: fechaArgentina(inicio), inicio: hora.format(inicio), fin: hora.format(fin) === '00:00' ? '24:00' : hora.format(fin) };
}
