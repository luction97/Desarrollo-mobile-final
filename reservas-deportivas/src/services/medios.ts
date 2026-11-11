import { Directory, File, Paths } from 'expo-file-system';
import preferencias from './preferencias';

function carpeta() {
  const dir = new Directory(Paths.document, 'medios_canchas');
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export async function obtenerFoto(espacioId: string): Promise<string | null> {
  const uri = await preferencias.getItem(`foto:${espacioId}`);
  return uri && new File(uri).exists ? uri : null;
}

export async function guardarFoto(espacioId: string, uri: string): Promise<string> {
  const destino = new File(carpeta(), `${encodeURIComponent(espacioId)}_${Date.now()}.jpg`);
  new File(uri).copy(destino);
  await preferencias.setItem(`foto:${espacioId}`, destino.uri);
  return destino.uri;
}

export async function obtenerVideo(espacioId: string, url: string): Promise<string | null> {
  const guardado = await preferencias.getItem(`video:${espacioId}`);
  if (!guardado) return null;
  try {
    const datos = JSON.parse(guardado) as { url: string; uri: string };
    return datos.url === url && new File(datos.uri).exists ? datos.uri : null;
  } catch { return null; }
}

export async function guardarVideo(espacioId: string, url: string): Promise<string> {
  const destino = new File(carpeta(), `${encodeURIComponent(espacioId)}_${Date.now()}.mp4`);
  try {
    const archivo = await File.downloadFileAsync(url, destino);
    await preferencias.setItem(`video:${espacioId}`, JSON.stringify({ url, uri: archivo.uri }));
    return archivo.uri;
  } catch (error) {
    if (destino.exists) destino.delete();
    throw error;
  }
}
