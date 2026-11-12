import { api } from './api';
import { Platform } from 'react-native';

interface ArchivoSubido {
  url: string;
  tipo: 'imagen' | 'audio' | 'video';
  bytes: number;
}

export async function subirFoto(uri: string): Promise<ArchivoSubido> {
  const datos = new FormData();
  if (Platform.OS === 'web') {
    const foto = await (await fetch(uri)).blob();
    datos.append('archivo', foto, 'estado-cancha');
  } else {
    // React Native representa los archivos multipart con una URI local.
    datos.append('archivo', { uri, name: 'estado-cancha', type: 'application/octet-stream' } as unknown as Blob);
  }
  return api.post<ArchivoSubido>('/archivos', datos);
}
