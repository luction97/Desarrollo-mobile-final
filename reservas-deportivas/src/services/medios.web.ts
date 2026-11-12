export async function obtenerFoto(_espacioId: string): Promise<string | null> { return null; }
export async function guardarFoto(_espacioId: string, uri: string): Promise<string> { return uri; }
export async function borrarFoto(_espacioId: string): Promise<void> {}
export async function obtenerDescarga(_tipo: 'imagen' | 'video', _id: string, _url: string): Promise<string | null> { return null; }
export async function guardarDescarga(_tipo: 'imagen' | 'video', _id: string, _url: string): Promise<string> {
  throw new Error('La descarga para ver sin datos está disponible en la app móvil.');
}
export async function borrarDescarga(_tipo: 'imagen' | 'video', _id: string, _url: string): Promise<void> {}
