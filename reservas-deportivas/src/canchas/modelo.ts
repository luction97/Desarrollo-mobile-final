import type { Espacio } from '../tipos';

/** Deporte que identifica la foto registrada de una cancha. */
export type FamiliaDeporte = 'futbol' | 'basquet' | 'voley' | 'tenis' | 'gimnasio';

const FAMILIA_POR_DEPORTE: Record<string, FamiliaDeporte> = {
  'dep-futbol5': 'futbol',
  'dep-futbol11': 'futbol',
  'dep-basquet': 'basquet',
  'dep-voley': 'voley',
  'dep-tenis': 'tenis',
  'dep-gimnasio': 'gimnasio',
};

/** Familia de la foto registrada para un deporte. `null` cuando el deporte no tiene foto propia. */
export function familiaDeDeporte(deporteId: string): FamiliaDeporte | null {
  return FAMILIA_POR_DEPORTE[deporteId] ?? null;
}

/**
 * Catálogo visible de la app: los espacios activos, en orden estable por id.
 * Incluye los once de ejemplo con su foto local registrada.
 */
export function catalogoDeEspacios(espacios: Espacio[]): Espacio[] {
  return [...espacios].filter(e => e.activo).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Nombre para mostrar: sin el sufijo del deporte ("Cancha 1 - Fútbol 5" → "Cancha 1"),
 * porque el deporte ya figura aparte en la descripción de la cancha.
 */
export function nombreCorto(espacio: Pick<Espacio, 'nombre'>): string {
  const [base] = espacio.nombre.split(/\s+[-–—]\s+/);
  return base?.trim() || espacio.nombre;
}
