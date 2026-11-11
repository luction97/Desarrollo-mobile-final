export function tokenVigente(token: string, ahora: number): boolean {
  try {
    const parte = token.split('.')[1];
    const base64 = parte.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64 + '='.repeat((4 - base64.length % 4) % 4))) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 > ahora;
  } catch { return false; }
}
