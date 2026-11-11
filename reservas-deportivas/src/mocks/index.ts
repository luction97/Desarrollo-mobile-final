import { Deporte, Espacio, ReservaFija, Turno, Reserva } from '../tipos';

export const DEPORTES: Deporte[] = [
  { id: 'dep-futbol5', nombre: 'Fútbol 5', icono: 'football-outline', color: '#2E7D32' },
  { id: 'dep-basquet', nombre: 'Básquet', icono: 'basketball-outline', color: '#E65100' },
];

export const ESPACIOS: Espacio[] = [
  {
    id: 'esp-02',
    nombre: 'Cancha 2 - Fútbol 5',
    deporteId: 'dep-futbol5',
    complejo: 'Polideportivo Municipal',
    superficie: 'césped sintético',
    techado: false,
    iluminacion: true,
    capacidad: 10,
    precioPorHora: 12000,
    coordenadas: { latitud: -31.8642, longitud: -59.0281 },
    imagenes: ['https://picsum.photos/400/300'],
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    reglas: 'No se permite calzado con tapones de aluminio.',
    activo: true,
  },
  {
    id: 'esp-03',
    nombre: 'Cancha de Básquet 1',
    deporteId: 'dep-basquet',
    complejo: 'Polideportivo Municipal',
    superficie: 'parquet sintético',
    techado: true,
    iluminacion: true,
    capacidad: 12,
    precioPorHora: 10000,
    coordenadas: { latitud: -31.8645, longitud: -59.0285 },
    imagenes: ['https://picsum.photos/400/301'],
    videoUrl: null,
    reglas: 'Prohibido colgarse del aro.',
    activo: true,
  }
];

export const RESERVAS_FIJAS: ReservaFija[] = [
  {
    id: 'fij-07',
    espacioId: 'esp-02',
    titular: 'Grupo de los martes',
    dia: 2, // 0 = domingo ... 2 = martes
    inicio: '21:00',
    fin: '22:00',
    desde: '2026-03-01',
    hasta: null,
    activa: true,
  }
];

export const RESERVAS: Reserva[] = [
  {
    id: 'res-1180',
    turnoId: 'tur-2026-10-26-18',
    espacioId: 'esp-02',
    usuarioId: 'usr-207',
    cantidadPersonas: 10,
    codigoQr: 'VGY-1180-0219-19',
    estado: 'confirmada',
    ingresoEn: null,
    creadaEn: '2026-10-24T21:04:00-03:00',
    cancelableHasta: '2026-10-26T14:00:00-03:00',
  }
];

export const BLOQUEOS_DIAS_ENTEROS = [
  { espacioId: 'esp-02', fecha: '2026-10-28', motivo: 'Cancha anegada por lluvia' }
];