import { api } from './api';
import { storage } from './storage';
import { Usuario } from '../tipos';

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export const authService = {
  async login(email: string, contrasena: string): Promise<Usuario> {
    const data = await api.post<LoginResponse>('/auth/ingreso', { email, contrasena });
    
    await storage.setItem('token', data.token);
    await storage.setItem('usuario', JSON.stringify(data.usuario));
    
    return data.usuario;
  },

  async registro(datos: any): Promise<Usuario> {
    const data = await api.post<LoginResponse>('/auth/registro', datos);
    
    await storage.setItem('token', data.token);
    await storage.setItem('usuario', JSON.stringify(data.usuario));
    
    return data.usuario;
  },

  async logout() {
    await storage.deleteItem('token');
    await storage.deleteItem('usuario');
  },

  async obtenerUsuarioGuardado(): Promise<Usuario | null> {
    const userStr = await storage.getItem('usuario');
    return userStr ? JSON.parse(userStr) : null;
  }
};