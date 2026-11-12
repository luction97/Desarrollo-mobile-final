/** Reglas horarias compartidas por bloqueos y reservas fijas (PRD §2 y §6). */
const HORA_EN_PUNTO = /^(?:08|09|1[0-9]|2[0-4]):00$/;
const FECHA_PATRON = /^\d{4}-\d{2}-\d{2}$/;

/** Días de la semana en el orden del PRD: índice 0 = domingo. */
export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

/** Valida una fecha "AAAA-MM-DD" de calendario real. Devuelve el mensaje de error o null. */
export function errorDeFecha(fecha: string): string | null {
  if (!FECHA_PATRON.test(fecha) || !Number.isFinite(new Date(`${fecha}T12:00:00-03:00`).getTime())) {
    return 'Ingresá una fecha válida con año, mes y día, por ejemplo 2026-11-14.';
  }
  return null;
}

/**
 * Valida un rango horario en punto dentro del día operativo 08:00–24:00 y con inicio < fin.
 * Devuelve el mensaje de error o null. Rango completo omitido = día entero.
 */
export function errorDeRangoHorario(inicio?: string | null, fin?: string | null): string | null {
  if (!inicio && !fin) return null;
  if (!inicio || !fin) return 'Si acotás el horario, completá la hora de inicio y la de fin.';
  if (!HORA_EN_PUNTO.test(inicio) || !HORA_EN_PUNTO.test(fin)) {
    return 'Los horarios van en punto, entre 08:00 y 24:00.';
  }
  if (inicio >= fin) return 'La hora de inicio debe ser anterior a la de fin.';
  return null;
}
