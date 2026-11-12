/** Precio entero en pesos, con el formato que muestra toda la app. */
export function precioLegible(valor: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor);
}
