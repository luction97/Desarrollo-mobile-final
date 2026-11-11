// Adaptador web; Metro usa localStore.native.ts en Android/iOS.
export async function leerLocal<T>(clave: string): Promise<T | null> {
  if (typeof window === 'undefined') return null;
  const valor = window.localStorage.getItem(`reservas:${clave}`);
  if (!valor) return null;
  try { return JSON.parse(valor) as T; } catch { return null; }
}

export async function escribirLocal(clave: string, datos: unknown): Promise<void> {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`reservas:${clave}`, JSON.stringify(datos));
}
