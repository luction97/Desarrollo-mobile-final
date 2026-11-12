import { api } from './api';
import type { Usuario } from '../tipos';

/**
 * Favoritos del usuario en sesión (M6 de la API): PUT agrega y devuelve el
 * `Usuario` actualizado; DELETE quita (204, sin cuerpo).
 */
export const favoritosService = {
  agregar(espacioId: string): Promise<Usuario> {
    return api.put<Usuario>(`/yo/espacios-favoritos/${encodeURIComponent(espacioId)}`, {});
  },

  async quitar(espacioId: string): Promise<void> {
    await api.delete(`/yo/espacios-favoritos/${encodeURIComponent(espacioId)}`);
  },
};
