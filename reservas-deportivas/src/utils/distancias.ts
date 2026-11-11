import type { Coordenadas } from '../tipos';

export function distanciaMetros(a: Coordenadas, b: Coordenadas): number {
  const valida = (p: Coordenadas) => Number.isFinite(p.latitud) && Number.isFinite(p.longitud) && Math.abs(p.latitud) <= 90 && Math.abs(p.longitud) <= 180;
  if (!valida(a) || !valida(b)) return Infinity;
  const rad = (grados: number) => grados * Math.PI / 180;
  const dLat = rad(b.latitud - a.latitud), dLon = rad(b.longitud - a.longitud);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}

export function distanciaLegible(metros: number): string {
  return metros < 1000 ? `${Math.round(metros)} m` : `${(metros / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
}
