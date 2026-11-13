import { Directory, File, Paths } from 'expo-file-system';
import preferencias from './preferencias';

function carpeta() {
  const dir = new Directory(Paths.document, 'medios_canchas');
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function borrarArchivo(uri: string | null) {
  if (!uri) return;
  const raiz = new Directory(Paths.document, 'medios_canchas').uri.replace(/\/+$/, '') + '/';
  if (!uri.startsWith(raiz) || uri.slice(raiz.length).includes('/')) return;
  const archivo = new File(uri);
  if (archivo.exists) archivo.delete();
}

export async function obtenerFoto(espacioId: string): Promise<string | null> {
  const uri = await preferencias.getItem('foto:' + espacioId);
  return uri && new File(uri).exists ? uri : null;
}

export async function guardarFoto(espacioId: string, uri: string): Promise<string> {
  const clave = 'foto:' + espacioId;
  const previa = await preferencias.getItem(clave);
  const destino = new File(carpeta(), encodeURIComponent(espacioId) + '_' + Date.now() + '.jpg');
  try {
    new File(uri).copy(destino);
    await preferencias.setItem(clave, destino.uri);
  } catch (error) {
    borrarArchivo(destino.uri);
    throw error;
  }
  if (previa !== destino.uri) borrarArchivo(previa);
  return destino.uri;
}

export async function borrarFoto(espacioId: string): Promise<void> {
  const clave = 'foto:' + espacioId;
  borrarArchivo(await preferencias.getItem(clave));
  await preferencias.removeItem(clave);
}

/**
 * Video grabado por el personal en la cancha: queda en el teléfono y con la
 * dirección del archivo subido. La API no tiene un endpoint para asociar un
 * video al espacio, por eso la app guarda la relación en el dispositivo.
 */
export async function guardarVideoGrabado(espacioId: string, uri: string, url: string): Promise<string> {
  const clave = 'video-grabado:' + espacioId;
  const previa = await preferencias.getItem(clave);
  const destino = new File(carpeta(), 'video_' + encodeURIComponent(espacioId) + '_' + Date.now() + '.mp4');
  try {
    new File(uri).copy(destino);
    await preferencias.setItem(clave, JSON.stringify({ uri: destino.uri, url }));
  } catch (error) {
    borrarArchivo(destino.uri);
    throw error;
  }
  if (previa) {
    try { borrarArchivo(JSON.parse(previa)?.uri ?? null); } catch { /* La relación anterior no se pudo leer. */ }
  }
  return destino.uri;
}

export async function obtenerVideoGrabado(espacioId: string): Promise<{ uri: string; url: string } | null> {
  const valor = await preferencias.getItem('video-grabado:' + espacioId);
  if (!valor) return null;
  try {
    const dato = JSON.parse(valor);
    if (typeof dato?.uri !== 'string' || typeof dato?.url !== 'string') return null;
    return new File(dato.uri).exists ? dato : null;
  } catch { return null; }
}

export async function borrarVideoGrabado(espacioId: string): Promise<void> {
  const clave = 'video-grabado:' + espacioId;
  const valor = await preferencias.getItem(clave);
  try { borrarArchivo(JSON.parse(valor ?? '{}')?.uri ?? null); } catch { /* No había archivo local. */ }
  await preferencias.removeItem(clave);
}

type Medio = 'imagen' | 'video';

function claveDescarga(tipo: Medio, espacioId: string, url: string) {
  // La clave anterior de video se conserva para recuperar descargas existentes.
  return tipo === 'video' ? 'video:' + espacioId : 'galeria:' + espacioId + ':' + url;
}

async function leerDescarga(clave: string): Promise<{ url: string; uri: string } | null> {
  const valor = await preferencias.getItem(clave);
  if (!valor) return null;
  try {
    const dato = JSON.parse(valor);
    return typeof dato?.uri === 'string' && typeof dato.url === 'string' ? dato : null;
  } catch { return null; }
}

export async function obtenerDescarga(tipo: Medio, espacioId: string, url: string): Promise<string | null> {
  const dato = await leerDescarga(claveDescarga(tipo, espacioId, url));
  return dato?.url === url && new File(dato.uri).exists ? dato.uri : null;
}

export async function guardarDescarga(tipo: Medio, espacioId: string, url: string): Promise<string> {
  const existente = await obtenerDescarga(tipo, espacioId, url);
  if (existente) return existente;
  const clave = claveDescarga(tipo, espacioId, url);
  const previo = await leerDescarga(clave);
  const nombre = tipo + '_' + encodeURIComponent(espacioId) + '_' + Date.now() + (tipo === 'video' ? '.mp4' : '.img');
  const destino = new File(carpeta(), nombre);
  try {
    const archivo = await File.downloadFileAsync(url, destino);
    if (!archivo.exists || !archivo.size) throw new Error('El archivo descargado está vacío.');
    await preferencias.setItem(clave, JSON.stringify({ url, uri: archivo.uri }));
  } catch (error) {
    borrarArchivo(destino.uri);
    throw error;
  }
  if (previo?.uri !== destino.uri) borrarArchivo(previo?.uri ?? null);
  return destino.uri;
}

export async function borrarDescarga(tipo: Medio, espacioId: string, url: string): Promise<void> {
  const clave = claveDescarga(tipo, espacioId, url);
  const dato = await leerDescarga(clave);
  if (dato?.url !== url) return;
  borrarArchivo(dato.uri);
  await preferencias.removeItem(clave);
}
