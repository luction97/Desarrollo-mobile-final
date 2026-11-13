import { api } from './api';
import { storage } from './storage';
import { Usuario } from '../tipos';
import { tokenVigente } from '../utils/sesion';
import { cambiarSesion } from './sesionEventos';

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface DatosRegistro { nombre: string; email: string; telefono: string; contrasena: string }

function guardarSesion(data: LoginResponse): Promise<Usuario> {
  return cambiarSesion(async () => {
    try {
      await storage.setItem('usuario', JSON.stringify(data.usuario));
      await storage.setItem('token', data.token);
      return data.usuario;
    } catch (error) {
      await Promise.allSettled([storage.deleteItem('token'), storage.deleteItem('usuario')]);
      throw error;
    }
  });
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
    await cambiarSesion(async () => {
      await storage.deleteItem('token');
      await storage.deleteItem('usuario').catch(() => undefined);
    });
  },

  async obtenerUsuarioGuardado(): Promise<Usuario | null> {
    const userStr = await storage.getItem('usuario');
    try { return userStr ? JSON.parse(userStr) as Usuario : null; } catch { return null; }
  },

  /** Guarda la copia local del usuario (favoritos, contadores). */
  async actualizar(usuario: Usuario): Promise<void> {
    await cambiarSesion(async () => {
      const guardado = await authService.obtenerUsuarioGuardado();
      if (guardado?.id === usuario.id && await storage.getItem('token')) {
        await storage.setItem('usuario', JSON.stringify(usuario));
      }
    });
  },

  /**
   * Devuelve la sesión guardada. Si el token venció, la borra: un token
   * inválido nunca alcanza para volver a entrar.
   */
  async restaurarSesion(): Promise<{ usuario: Usuario | null; vigente: boolean }> {
    return cambiarSesion(async () => {
      const token = await storage.getItem('token');
      const guardado = await authService.obtenerUsuarioGuardado();
      if (!token || !guardado) return { usuario: null, vigente: false };
      if (!tokenVigente(token, Date.now())) {
        await Promise.allSettled([storage.deleteItem('token'), storage.deleteItem('usuario')]);
        return { usuario: null, vigente: false };
      }
      return { usuario: guardado, vigente: true };
    });
  },

  async verificarPersonal(email: string, contrasena: string, usuarioId: string): Promise<boolean> {
    const data = await api.post<LoginResponse>('/auth/ingreso', { email, contrasena });
    return data.usuario.id === usuarioId && (data.usuario.rol === 'encargado' || data.usuario.rol === 'administrador');
  },
};
