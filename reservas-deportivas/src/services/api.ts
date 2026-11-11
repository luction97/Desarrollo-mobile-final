import axios from 'axios';
import { storage } from './storage';
import { invalidarSesion } from './sesionEventos';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: BASE_URL,
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
  try {
    const response = await apiClient.request({
      method,
      url: endpoint,
      data,
    });
    
    if (response.status === 204) return { datos: undefined as T, meta: null };
    return response.data as Sobre<T>;
  } catch (error: any) {
    if (error.response) {
      if (error.response.status === 401 && error.response.data?.error?.codigo === 'NO_AUTENTICADO') {
        await storage.deleteItem('token');
        await storage.deleteItem('usuario');
        invalidarSesion();
      }
      throw new ApiError(
        error.response.data?.error?.codigo || 'ERROR_DESCONOCIDO',
        error.response.data?.error?.mensaje || 'Ocurrió un error inesperado'
      );
    } else if (error.request) {
      throw new ApiError('ERROR_DE_RED', 'No se pudo conectar con el servidor.');
    } else {
      throw new ApiError('ERROR_INTERNO', 'Error interno de la aplicación.');
    }
  }
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
