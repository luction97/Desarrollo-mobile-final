export function tokenVigente(token: string, ahora: number): boolean {
  try {
    const parte = token.split('.')[1];
    const base64 = parte.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64 + '='.repeat((4 - base64.length % 4) % 4))) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 > ahora;
  } catch { return false; }
}

/**
 * Minutos que la app puede quedar en segundo plano antes de volver a pedir la
 * biometría. Volver a la app (cámara, dialer, QR) no debe cerrar la sesión.
 */
export const MINUTOS_BLOQUEO_SESION = 5;

/** Hay que volver a pedir la biometría sólo si la app quedó mucho tiempo dormida. */
export function debeBloquearSesion(desdeFondo: number | null, ahora: number): boolean {
  if (!desdeFondo) return false;
  return ahora - desdeFondo >= MINUTOS_BLOQUEO_SESION * 60 * 1000;
}
