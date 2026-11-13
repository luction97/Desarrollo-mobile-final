import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { notificacionesService } from '../services/notificaciones';

/**
 * Al tocar una notificación, la app abre la reserva con su QR. Es el camino
 * más corto para un jugador que acaba de recibir el aviso de su turno.
 */
export function AperturaNotificacion() {
  const router = useRouter();

  useEffect(() => {
    let quitar: (() => void) | undefined;
    let vigente = true;
    void notificacionesService.suscribirApertura(datos => {
      const reservaId = typeof datos.reservaId === 'string' ? datos.reservaId : null;
      if (!reservaId) return;
      router.push({ pathname: '/(tabs)/two', params: { reservaId } });
    }).then(fn => { if (vigente) quitar = fn; else fn(); }).catch(() => undefined);
    return () => { vigente = false; quitar?.(); };
  }, [router]);

  return null;
}
