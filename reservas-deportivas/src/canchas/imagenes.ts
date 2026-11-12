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
};

/**
 * Prioriza la imagen del espacio y usa la ilustración del deporte como respaldo.
 */
export function fotoDeCancha(espacio: Pick<Espacio, 'deporteId' | 'imagenes'>): ImageSourcePropType | null {
  const remota = espacio.imagenes?.find(Boolean);
  if (remota) return { uri: remota };
  const familia = familiaDeDeporte(espacio.deporteId);
  return familia ? FOTO_POR_DEPORTE[familia] : null;
}
