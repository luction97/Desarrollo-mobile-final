import type { Usuario } from '../tipos';

export function permisosDe(usuario: Pick<Usuario, 'rol'> | null) {
  const administrador = usuario?.rol === 'administrador';
  const encargado = usuario?.rol === 'encargado';
  return {
    puedeReservar: usuario?.rol === 'jugador',
    puedeGestionar: administrador || encargado,
    puedeAdministrar: administrador,
    /** El personal del complejo documenta el estado de la cancha con fotos y video (RF-52). */
    puedeActualizarFoto: administrador || encargado,
  };
}
