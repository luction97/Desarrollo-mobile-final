import type { ImageSourcePropType } from 'react-native';
import type { Espacio } from '../tipos';
import { familiaDeDeporte, type FamiliaDeporte } from './modelo';

/**
 * Fotos registradas de las canchas de ejemplo. Los `require` son estáticos
 * para que Metro incluya los archivos en el bundle y funcionen sin conexión.
 */
const FOTO_POR_DEPORTE: Record<FamiliaDeporte, ImageSourcePropType> = {
  futbol: require('../../assets/images/canchas/cancha-futbol.png'),
  basquet: require('../../assets/images/canchas/cancha-basquet.png'),
  voley: require('../../assets/images/canchas/cancha-voley.png'),
  tenis: require('../../assets/images/canchas/cancha-tenis.png'),
  gimnasio: require('../../assets/images/canchas/cancha-gimnasio.png'),
};

/** Espacios del catálogo demo con foto local registrada: las once canchas. */
const ESPACIOS_CON_FOTO_LOCAL = /^esp-(0[1-9]|1[01])$/;

/**
 * Usa la foto local en los espacios de ejemplo y la imagen publicada en los demás.
 */
export function portadaDeEjemplo(espacio: Pick<Espacio, 'id' | 'deporteId'>): ImageSourcePropType | null {
  if (!ESPACIOS_CON_FOTO_LOCAL.test(espacio.id)) return null;
  const familia = familiaDeDeporte(espacio.deporteId);
  return familia ? FOTO_POR_DEPORTE[familia] : null;
}

export function fotoDeCancha(espacio: Pick<Espacio, 'id' | 'deporteId' | 'imagenes'>): ImageSourcePropType | null {
  const remota = espacio.imagenes?.find(Boolean);
  return portadaDeEjemplo(espacio) ?? (remota ? { uri: remota } : fotoDeDeporte(espacio.deporteId));
}

export function fotoDeDeporte(deporteId: string): ImageSourcePropType | null {
  const familia = familiaDeDeporte(deporteId);
  return familia ? FOTO_POR_DEPORTE[familia] : null;
}
