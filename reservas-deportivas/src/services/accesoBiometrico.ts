import preferencias from './preferencias';

/**
 * Preferencia de acceso biométrico de cada usuario. Va en el kv-store porque
 * no es un dato sensible: el token de la sesión vive aparte, en el SecureStore.
 */
const claveDe = (usuarioId: string) => `biometria:${usuarioId}`;
const claveOfrecida = (usuarioId: string) => `biometria:ofrecida:${usuarioId}`;

export async function accesoBiometricoActivado(usuarioId: string): Promise<boolean> {
  return (await preferencias.getItem(claveDe(usuarioId))) === 'activado';
}

export async function activarAccesoBiometrico(usuarioId: string): Promise<void> {
  await preferencias.setItem(claveDe(usuarioId), 'activado');
}

export async function desactivarAccesoBiometrico(usuarioId: string): Promise<void> {
  await preferencias.removeItem(claveDe(usuarioId));
}

/** Marca que la activación ya se ofreció, para no volver a preguntar. */
export async function marcarOfertaBiometrica(usuarioId: string): Promise<void> {
  await preferencias.setItem(claveOfrecida(usuarioId), 'ofrecida');
}

export async function ofertaBiometricaHecha(usuarioId: string): Promise<boolean> {
  return (await preferencias.getItem(claveOfrecida(usuarioId))) === 'ofrecida';
}
