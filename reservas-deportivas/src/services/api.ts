import axios from 'axios';
import { storage } from './storage';

// ⚠️ CAMBIÁ ESTA IP POR LA DE TU PC (para probar en el celular)
// O dejala en localhost si estás probando en la web
const BASE_URL = 'http://localhost:3000'; 

// Creamos la instancia de Axios
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Antes de cada petición, busca el token y lo agrega al header
apiClient.interceptors.request.use(async (config) => {
  const token = await storage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mantenemos nuestra clase de error para no romper el resto del código
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
    
    // Devolvemos solo el campo "datos" como pide el PRD
    return response.data.datos;
  } catch (error: any) {
    if (error.response) {
      // La API respondió con un error (ej. 404, 401)
      throw new ApiError(
        error.response.data?.error?.codigo || 'ERROR_DESCONOCIDO',
        error.response.data?.error?.mensaje || 'Ocurrió un error inesperado'
      );
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta (sin internet o API apagada)
      throw new ApiError('ERROR_DE_RED', 'No se pudo conectar con el servidor.');
    } else {
      // Error al armar la petición
      throw new ApiError('ERROR_INTERNO', 'Error interno de la aplicación.');
    }
  }
}

// Mantenemos la misma interfaz para que auth.ts y turnos.ts sigan funcionando igual
export const api = {
  get: <T>(endpoint: string) => requestApi<T>('GET', endpoint),
  post: <T>(endpoint: string, body: any) => requestApi<T>('POST', endpoint, body),
  put: <T>(endpoint: string, body: any) => requestApi<T>('PUT', endpoint, body),
  delete: <T>(endpoint: string) => requestApi<T>('DELETE', endpoint),
};