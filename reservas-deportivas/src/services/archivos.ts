import { api } from './api';
import { Platform } from 'react-native';

interface ArchivoSubido {
  url: string;
  tipo: 'imagen' | 'audio' | 'video';
  bytes: number;
}

export async function subirFoto(uri: string): Promise<ArchivoSubido> {
  return subirArchivo(uri, 'estado-cancha.jpg', 'image/jpeg');
}

/** Sube el video grabado de la cancha. La API acepta mp4 de hasta 30 MB. */
export async function subirVideo(uri: string): Promise<ArchivoSubido> {
  return subirArchivo(uri, 'video-cancha.mp4', 'video/mp4');
}

async function subirArchivo(uri: string, nombre: string, mime: string): Promise<ArchivoSubido> {
  const datos = new FormData();
  if (Platform.OS === 'web') {
    const archivo = await (await fetch(uri)).blob();
    datos.append('archivo', archivo, nombre);
  } else {
    // React Native representa los archivos multipart con una URI local.
    datos.append('archivo', { uri, name: nombre, type: mime } as unknown as Blob);
  }
  return api.post<ArchivoSubido>('/archivos', datos);
}
