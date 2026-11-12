import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from './storage';
import { invalidarSesion } from './sesionEventos';

const PUERTO_API = '3000';

/**
 * Arma las URLs candidatas de la API en runtime, sin hardcodear en componentes:
 * 1. EXPO_PUBLIC_API_URL (web y APK preview: se hornea en el bundle, ver eas.json):
 *    única candidata, no se prueba nada más.
 * 2. En Expo Go / dev client, el host con el que el teléfono llegó a Metro
 *    (hostUri). Así sigue andando si la IP de la PC cambia de red o con hotspot.
 * 3. Emulador de Android: el localhost de la PC es 10.0.2.2.
 * 4. Dev build por USB con `adb reverse tcp:3000 tcp:3000`: localhost del teléfono.
 * 5. Web: mismo host que sirve la página.
 * Nota: con --tunnel el host (…exp.direct) sólo alcanza a Metro, no a la API;
 * para consumir la API hace falta estar en la misma red (--lan o hotspot).
 */
function armarCandidatos(): string[] {
  const configurada = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configurada) return [configurada.replace(/\/+$/, '')];

  if (Platform.OS === 'web') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return [`http://${host}:${PUERTO_API}`];
  }

  const candidatos: string[] = [];
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('exp.direct')) {
    candidatos.push(`http://${host}:${PUERTO_API}`);
  }
  if (Platform.OS === 'android') {
    candidatos.push(`http://10.0.2.2:${PUERTO_API}`); // emulador
  }
  candidatos.push(`http://localhost:${PUERTO_API}`); // USB con adb reverse, o la propia PC
  return candidatos;
}

const CANDIDATOS_BASE = armarCandidatos();
// La primera que responda queda fijada; las demás quedan como fallback si se cae.
let baseActual = CANDIDATOS_BASE[0];

const apiClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await storage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class ApiError extends Error {
  codigo: string;
  constructor(codigo: string, mensaje: string) {
    super(mensaje);
    this.name = 'ApiError';
    this.codigo = codigo;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

interface Sobre<T> {
  datos: T;
  meta: { total: number; pagina: number; porPagina: number } | null;
}

async function requestSobre<T>(method: string, endpoint: string, data?: unknown): Promise<Sobre<T>> {
  // La base elegida va primero; si no responde, se prueban las otras.
  const orden = [baseActual, ...CANDIDATOS_BASE.filter((base) => base !== baseActual)];
  for (const base of orden) {
    const url = `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    try {
      const response = await apiClient.request({
        method,
        url,
        data,
      });

      if (response.status === 204) return { datos: undefined as T, meta: null };
      baseActual = base;
      return response.data as Sobre<T>;
    } catch (error: any) {
      if (error.response) {
        baseActual = base;
        if (error.response.status === 401 && error.response.data?.error?.codigo === 'NO_AUTENTICADO') {
          await storage.deleteItem('token');
          await storage.deleteItem('usuario');
          invalidarSesion();
        }
        throw new ApiError(
          error.response.data?.error?.codigo || 'ERROR_DESCONOCIDO',
          error.response.data?.error?.mensaje || 'Ocurrió un error inesperado'
        );
      }
      // Sin response = red caída: probá la siguiente base.
    }
  }
  throw new ApiError('ERROR_DE_RED', 'No se pudo conectar con el servidor.');
}

async function requestApi<T>(method: string, endpoint: string, data?: unknown): Promise<T> {
  return (await requestSobre<T>(method, endpoint, data)).datos;
}

async function listarTodo<T>(endpoint: string): Promise<T[]> {
  const datos: T[] = [];
  for (let pagina = 1; ; pagina++) {
    const resultado = await requestSobre<T[]>('GET', `${endpoint}${endpoint.includes('?') ? '&' : '?'}pagina=${pagina}&porPagina=100`);
    datos.push(...resultado.datos);
    if (!resultado.meta || datos.length >= resultado.meta.total || resultado.datos.length === 0) return datos;
  }
}

export const api = {
  listarTodo,
  getConMeta: <T>(endpoint: string) => requestSobre<T>('GET', endpoint),
  get: <T>(endpoint: string) => requestApi<T>('GET', endpoint),
  post: <T>(endpoint: string, body: any) => requestApi<T>('POST', endpoint, body),
  put: <T>(endpoint: string, body: any) => requestApi<T>('PUT', endpoint, body),
  patch: <T>(endpoint: string, body: any) => requestApi<T>('PATCH', endpoint, body),
  delete: <T>(endpoint: string) => requestApi<T>('DELETE', endpoint),
};
