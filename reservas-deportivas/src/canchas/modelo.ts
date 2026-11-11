import type { Espacio } from '../tipos';

/** Deporte que identifica la foto registrada de una cancha. */
export type FamiliaDeporte = 'futbol' | 'basquet' | 'voley' | 'tenis';

const FAMILIA_POR_DEPORTE: Record<string, FamiliaDeporte> = {
  'dep-futbol5': 'futbol',
  'dep-futbol11': 'futbol',
  'dep-basquet': 'basquet',
  'dep-voley': 'voley',
  'dep-tenis': 'tenis',
};

/** Orden de presentación del catálogo de ejemplo. */
const ORDEN: FamiliaDeporte[] = ['futbol', 'basquet', 'voley', 'tenis'];

/**
 * Familia de la foto registrada para un deporte.
 * `null` cuando no hay foto propia (por ejemplo, el gimnasio).
 */
export function familiaDeDeporte(deporteId: string): FamiliaDeporte | null {
  return FAMILIA_POR_DEPORTE[deporteId] ?? null;
}

/**
 * Catálogo de ejemplo: una cancha activa por deporte y sin gimnasio.
 * La API devuelve todas las canchas; la selección es sólo de presentación.
 */
export function seleccionarCanchasDeEjemplo(espacios: Espacio[]): Espacio[] {
  const porFamilia = new Map<FamiliaDeporte, Espacio>();
  const ordenados = [...espacios].sort((a, b) => a.id.localeCompare(b.id));
  for (const espacio of ordenados) {
    if (!espacio.activo) continue;
    const familia = familiaDeDeporte(espacio.deporteId);
    if (!familia || porFamilia.has(familia)) continue;
    porFamilia.set(familia, espacio);
  }
  return ORDEN.flatMap(familia => {
    const espacio = porFamilia.get(familia);
    return espacio ? [espacio] : [];
  });
}
