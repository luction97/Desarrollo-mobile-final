import type { Espacio } from '../tipos';

export interface CoordenadasMapa { latitud: number; longitud: number }
export interface PuntoMapa extends CoordenadasMapa { id: string; nombre: string; complejo?: string | null }
export type EstadoMapa = 'cargando' | 'disponible' | 'error';
export type MensajeMapa =
  | { tipo: 'estado'; estado: EstadoMapa }
  | { tipo: 'seleccion'; id: string }
  | { tipo: 'enlace'; url: string };

export const ATRIBUCION_URL = 'https://www.openstreetmap.org/copyright';
export const REPORTE_URL = 'https://www.openstreetmap.org/fixthemap';
export const LEAFLET_URL = 'https://leafletjs.com';
export const IDENTIFICACION_MAPA = 'Deporturnos/1.0 (+https://github.com/luction97/Desarrollo-mobile-final)';

export function coordenadasValidas(valor: unknown): valor is CoordenadasMapa {
  if (!valor || typeof valor !== 'object') return false;
  const p = valor as CoordenadasMapa;
  return Number.isFinite(p.latitud) && Math.abs(p.latitud) <= 85.05112878 &&
    Number.isFinite(p.longitud) && Math.abs(p.longitud) <= 180;
}

export function puntoValido(valor: unknown): valor is PuntoMapa {
  const p = valor as PuntoMapa | null;
  return coordenadasValidas(p) && typeof p?.id === 'string' && p.id.length > 0 &&
    typeof p.nombre === 'string' && p.nombre.length > 0 &&
    (p.complejo == null || typeof p.complejo === 'string');
}

export function puntosDeEspacios(espacios: Espacio[]): PuntoMapa[] {
  return espacios.map(e => {
    const etiqueta = e.complejo?.trim();
    const complejo = etiqueta && !['—', '-'].includes(etiqueta) ? etiqueta : null;
    return { id: e.id, nombre: complejo ?? e.nombre, complejo,
      latitud: e.coordenadas?.latitud, longitud: e.coordenadas?.longitud };
  }).filter(puntoValido);
}

export function agruparComplejos(puntos: PuntoMapa[]): PuntoMapa[] {
  const destinos = new Map<string, PuntoMapa>();
  for (const punto of puntos.filter(puntoValido)) {
    const complejo = punto.complejo?.toLocaleLowerCase('es-AR');
    // Las copias anteriores no distinguen complejos de canchas independientes.
    const clave = complejo ? `complejo:${complejo}`
      : punto.complejo === null ? `espacio:${punto.id}`
        : `ubicacion:${punto.nombre}|${punto.latitud}|${punto.longitud}`;
    if (!destinos.has(clave)) destinos.set(clave, punto);
  }
  return [...destinos.values()];
}

export function leerMensajeMapa(datos: string, puntos: PuntoMapa[]): MensajeMapa | null {
  if (datos.length > 2048) return null;
  try {
    const m = JSON.parse(datos);
    if (m?.tipo === 'estado' && ['cargando', 'disponible', 'error'].includes(m.estado)) return { tipo: 'estado', estado: m.estado };
    if (m?.tipo === 'seleccion' && puntos.some(p => p.id === m.id)) return { tipo: 'seleccion', id: m.id };
    if (m?.tipo === 'enlace' && [ATRIBUCION_URL, REPORTE_URL, LEAFLET_URL].includes(m.url)) return { tipo: 'enlace', url: m.url };
  } catch { return null; }
  return null;
}

export function enlacesDestino(punto: PuntoMapa, plataforma: string): string[] {
  if (!puntoValido(punto)) return [];
  const coords = `${punto.latitud},${punto.longitud}`;
  const web = `https://www.openstreetmap.org/?mlat=${punto.latitud}&mlon=${punto.longitud}#map=16/${punto.latitud}/${punto.longitud}`;
  if (plataforma === 'android') return [`geo:0,0?q=${coords}(${encodeURIComponent(punto.nombre)})`, web];
  if (plataforma === 'ios') return [`https://maps.apple.com/?daddr=${coords}&q=${encodeURIComponent(punto.nombre)}`, web];
  return [web];
}
