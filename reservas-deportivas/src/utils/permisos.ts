import type { Usuario } from '../tipos';

export function permisosDe(usuario: Pick<Usuario, 'rol'> | null) {
  const administrador = usuario?.rol === 'administrador';
  return {
    puedeReservar: usuario?.rol === 'jugador',
    puedeGestionar: administrador || usuario?.rol === 'encargado',
    puedeAdministrar: administrador,
    puedeActualizarFoto: administrador,
  };
}
