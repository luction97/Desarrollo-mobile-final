import axios from 'axios';
import { storage } from './storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: BASE_URL,
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

async function requestApi<T>(method: string, endpoint: string, data?: any): Promise<T> {
  try {
    const response = await apiClient.request({
      method,
      url: endpoint,
      data,
    });
    
    return response.data.datos;
  } catch (error: any) {
    if (error.response) {
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

export const api = {
  get: <T>(endpoint: string) => requestApi<T>('GET', endpoint),
  post: <T>(endpoint: string, body: any) => requestApi<T>('POST', endpoint, body),
  put: <T>(endpoint: string, body: any) => requestApi<T>('PUT', endpoint, body),
  patch: <T>(endpoint: string, body: any) => requestApi<T>('PATCH', endpoint, body),
  delete: <T>(endpoint: string) => requestApi<T>('DELETE', endpoint),
};