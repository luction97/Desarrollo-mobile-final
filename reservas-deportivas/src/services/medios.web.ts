export async function obtenerFoto(_espacioId: string): Promise<string | null> { return null; }
export async function guardarFoto(_espacioId: string, uri: string): Promise<string> { return uri; }
export async function obtenerVideo(_espacioId: string, _url: string): Promise<string | null> { return null; }
export async function guardarVideo(_espacioId: string, _url: string): Promise<string> {
  throw new Error('La descarga para ver sin datos está disponible en la app móvil.');
}
