export function fechaRecordatorio(inicio: Date, ahora: Date): Date | null {
  const fecha = new Date(inicio.getTime() - 2 * 60 * 60 * 1000);
  return Number.isFinite(fecha.getTime()) && fecha > ahora ? fecha : null;
}
