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

/** Familia de la foto registrada para un deporte. `null` cuando no hay foto propia (gimnasio). */
export function familiaDeDeporte(deporteId: string): FamiliaDeporte | null {
  return FAMILIA_POR_DEPORTE[deporteId] ?? null;
}

/**
 * Catálogo de ejemplo: todas las canchas activas, sin el gimnasio.
 * La API devuelve once espacios; la selección es sólo de presentación.
 */
export function seleccionarCanchasDeEjemplo(espacios: Espacio[]): Espacio[] {
  return [...espacios]
    .filter(e => e.activo && familiaDeDeporte(e.deporteId) !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}
