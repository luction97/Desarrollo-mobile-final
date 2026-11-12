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
 * Catálogo visible de la app: los espacios activos, en orden estable por id.
 * Incluye los once de ejemplo (el gimnasio usa la foto que publica la API).
 */
export function catalogoDeEspacios(espacios: Espacio[]): Espacio[] {
  return [...espacios].filter(e => e.activo).sort((a, b) => a.id.localeCompare(b.id));
}
