import { api, ApiError } from './api';
import { leerLocal, escribirLocal } from './localStore';
import { obtenerEspacios, obtenerEspaciosLocales } from './espacios';
import { notificacionesService } from './notificaciones';
import type { Espacio, Reserva, Turno } from '../tipos';
import { presentarReserva, type ReservaGuardada } from '../modelos/reservas';
import { instanteTurno } from '../utils/fechas';
import { fechaRecordatorio } from '../utils/recordatorios';

let cola = Promise.resolve();
let revision = 0;

export async function reservasGuardadas(usuarioId: string): Promise<ReservaGuardada[]> {
  const datos = await leerLocal<ReservaGuardada[]>(`reservas:${usuarioId}`);
  return Array.isArray(datos) ? datos.filter(d => d?.reserva?.usuarioId === usuarioId && typeof d.reserva.codigoQr === 'string') : [];
}

export async function prepararRecordatoriosGuardados(usuarioId: string): Promise<void> {
  const datos = await reservasGuardadas(usuarioId);
  const ahora = new Date();
  if (datos.some(d => d.reserva.estado === 'confirmada' && d.turno && fechaRecordatorio(instanteTurno(d.turno.fecha, d.turno.inicio), ahora))) {
    // Al reabrir, los recordatorios ya programados también necesitan el handler en primer plano.
    await notificacionesService.inicializar();
  }
}

function guardar(usuarioId: string, datos: ReservaGuardada[], reemplazarSi?: () => boolean) {
  const tarea = cola.then(async () => {
    if (reemplazarSi) {
      if (!reemplazarSi()) return false;
      await escribirLocal(`reservas:${usuarioId}`, datos);
      return true;
    }
    const previas = await reservasGuardadas(usuarioId);
    const porId = new Map(previas.map(d => [d.reserva.id, d]));
    datos.forEach(d => porId.set(d.reserva.id, d));
    await escribirLocal(`reservas:${usuarioId}`, [...porId.values()]);
    return true;
  });
  cola = tarea.then(() => undefined, () => undefined);
  return tarea;
}

export async function crearReserva(turno: Turno, espacio: Espacio, cantidadPersonas: number, usuarioId: string) {
  if (!Number.isInteger(cantidadPersonas) || cantidadPersonas < 1 || cantidadPersonas > espacio.capacidad) {
    throw new Error(`Indicá entre 1 y ${espacio.capacidad} personas.`);
  }
  const reserva = await api.post<Reserva>('/reservas', { turnoId: turno.id, cantidadPersonas });
  revision++;
  const dato = presentarReserva(reserva, espacio, turno);
  let guardadaLocalmente = true;
  try { await guardar(usuarioId, [dato]); } catch { guardadaLocalmente = false; }
  let recordatorioDisponible = true;
  try { recordatorioDisponible = await notificacionesService.programarRecordatorio(espacio.nombre, instanteTurno(turno.fecha, turno.inicio), reserva.id); }
  catch { recordatorioDisponible = false; }
  return { dato, guardadaLocalmente, recordatorioDisponible };
}

export async function sincronizarReservas(usuarioId: string, vigente = () => true) {
  const desdeRevision = revision;
  const [proximas, pasadas] = await Promise.all([
    api.listarTodo<Reserva>('/yo/reservas?cuando=proximas'),
    api.listarTodo<Reserva>('/yo/reservas?cuando=pasadas'),
  ]);
  const anteriores = await reservasGuardadas(usuarioId).catch(() => []);
  let espacios = await obtenerEspaciosLocales().catch(() => []);
  if (!espacios.length) {
    try { espacios = (await obtenerEspacios()).datos; } catch { /* El QR no depende del catálogo. */ }
  }
  const propias = new Map([...proximas, ...pasadas].filter(r => r.usuarioId === usuarioId).map(r => [r.id, r]));
  const porId = new Map(anteriores.map(dato => [dato.reserva.id, dato]));
  const datos = [...propias.values()].map(r => {
    const anterior = porId.get(r.id);
    const espacio = espacios.find(e => e.id === r.espacioId) ?? anterior?.espacio ?? null;
    return anterior && anterior.reserva.turnoId === r.turnoId && anterior.reserva.cancelableHasta === r.cancelableHasta
      ? { ...anterior, reserva: r, espacio }
      : presentarReserva(r, espacio);
  });
  const corresponde = () => vigente() && revision === desdeRevision;
  const guardadas = await guardar(usuarioId, datos, corresponde).catch(() => null);
  if (guardadas === false) return { datos: await reservasGuardadas(usuarioId).catch(() => []), cambios: [], actualizada: false, guardadas: true };
  const cambios = datos.filter(d => d.reserva.estado === 'cancelada' &&
    porId.get(d.reserva.id)?.reserva.estado === 'confirmada');
  for (const anterior of anteriores) {
    if (!vigente() || revision !== desdeRevision) break;
    if (anterior.reserva.estado === 'confirmada' && !propias.has(anterior.reserva.id)) {
      await notificacionesService.cancelarRecordatorio(anterior.reserva.id).catch(() => undefined);
    }
  }
  for (const d of datos) {
    if (!vigente() || revision !== desdeRevision) break;
    const anterior = porId.get(d.reserva.id);
    const inicio = d.turno && instanteTurno(d.turno.fecha, d.turno.inicio);
    if (d.reserva.estado === 'confirmada' && inicio && fechaRecordatorio(inicio, new Date())) {
      await notificacionesService.programarRecordatorio(d.espacio?.nombre ?? 'Tu cancha', inicio, d.reserva.id, false).catch(() => undefined);
    } else if (anterior?.reserva.estado === 'confirmada') {
      await notificacionesService.cancelarRecordatorio(d.reserva.id).catch(() => undefined);
    }
  }
  return { datos, cambios, actualizada: true, guardadas: guardadas === true };
}

export async function cancelarReserva(dato: ReservaGuardada) {
  const reserva = await api.post<Reserva>(`/reservas/${encodeURIComponent(dato.reserva.id)}/cancelacion`, {});
  revision++;
  let guardadaLocalmente = true;
  try { await guardar(reserva.usuarioId, [{ ...dato, reserva }]); } catch { guardadaLocalmente = false; }
  await notificacionesService.cancelarRecordatorio(reserva.id).catch(() => undefined);
  return { reserva, guardadaLocalmente };
}

export function esErrorSesion(error: unknown) {
  return error instanceof ApiError && error.codigo === 'NO_AUTENTICADO';
}
