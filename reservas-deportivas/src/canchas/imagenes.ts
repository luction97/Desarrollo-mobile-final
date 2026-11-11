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
 * Foto que se muestra como registrada por el complejo. Usa la imagen local
 * cuando el deporte tiene una y, si no, la que publique la API.
 */
export function fotoDeCancha(espacio: Pick<Espacio, 'deporteId' | 'imagenes'>): ImageSourcePropType | null {
  const familia = familiaDeDeporte(espacio.deporteId);
  if (familia) return FOTO_POR_DEPORTE[familia];
  const remota = espacio.imagenes?.[0];
  return remota ? { uri: remota } : null;
}
