import { api } from './api';
import { storage } from './storage';
import { Usuario } from '../tipos';
import { tokenVigente } from '../utils/sesion';

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface DatosRegistro { nombre: string; email: string; telefono: string; contrasena: string }

async function guardarSesion(data: LoginResponse): Promise<Usuario> {
  try {
    await storage.setItem('token', data.token);
    await storage.setItem('usuario', JSON.stringify(data.usuario));
    return data.usuario;
  } catch (error) {
    await storage.deleteItem('token').catch(() => undefined);
    await storage.deleteItem('usuario').catch(() => undefined);
    throw error;
  }
}

export const authService = {
  obtenerPerfil(): Promise<Usuario> {
    return api.get<Usuario>('/yo');
  },

  async login(email: string, contrasena: string): Promise<Usuario> {
    const data = await api.post<LoginResponse>('/auth/ingreso', { email: email.trim(), contrasena });
    return guardarSesion(data);
  },

  async registro(datos: DatosRegistro): Promise<Usuario> {
    const data = await api.post<LoginResponse>('/auth/registro', datos);
    
    return guardarSesion(data);
  },

  async logout() {
    await storage.deleteItem('token');
    await storage.deleteItem('usuario');
  },

  async obtenerUsuarioGuardado(): Promise<Usuario | null> {
    const userStr = await storage.getItem('usuario');
    try { return userStr ? JSON.parse(userStr) as Usuario : null; } catch { return null; }
  },

  /** Guarda la copia local del usuario (favoritos, contadores). */
  async actualizar(usuario: Usuario): Promise<void> {
    await storage.setItem('usuario', JSON.stringify(usuario));
  },

  async restaurarSesion(): Promise<Usuario | null> {
    const token = await storage.getItem('token');
    if (!token || !tokenVigente(token, Date.now())) return null;
    return authService.obtenerUsuarioGuardado();
  },

  async verificarPersonal(email: string, contrasena: string, usuarioId: string): Promise<boolean> {
    const data = await api.post<LoginResponse>('/auth/ingreso', { email, contrasena });
    return data.usuario.id === usuarioId && (data.usuario.rol === 'encargado' || data.usuario.rol === 'administrador');
  },
};
