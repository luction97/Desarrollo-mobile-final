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

function guardar(usuarioId: string, datos: ReservaGuardada[], desdeRevision?: number) {
  const tarea = cola.catch(() => undefined).then(async () => {
    const previas = await reservasGuardadas(usuarioId);
    if (desdeRevision !== undefined) {
      if (revision !== desdeRevision) return false;
      await escribirLocal(`reservas:${usuarioId}`, datos);
      return true;
    }
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
  const anteriores = await reservasGuardadas(usuarioId);
  let espacios = await obtenerEspaciosLocales();
  try { espacios = (await obtenerEspacios()).datos; } catch { /* El QR no depende de descargar el catálogo. */ }
  const propias = new Map([...proximas, ...pasadas].filter(r => r.usuarioId === usuarioId).map(r => [r.id, r]));
  const datos = [...propias.values()].map(r => {
    const anterior = anteriores.find(a => a.reserva.id === r.id);
    const espacio = espacios.find(e => e.id === r.espacioId) ?? anterior?.espacio ?? null;
    return anterior && anterior.reserva.turnoId === r.turnoId && anterior.reserva.cancelableHasta === r.cancelableHasta
      ? { ...anterior, reserva: r, espacio }
      : presentarReserva(r, espacio);
  });
  const guardadas = vigente() && await guardar(usuarioId, datos, desdeRevision);
  if (!guardadas) return { datos: await reservasGuardadas(usuarioId), cambios: [], actualizada: false };
  const cambios = datos.filter(d => d.reserva.estado === 'cancelada' &&
    anteriores.some(a => a.reserva.id === d.reserva.id && a.reserva.estado === 'confirmada'));
  for (const d of datos) {
    if (!vigente() || revision !== desdeRevision) break;
    if (d.reserva.estado === 'confirmada' && d.turno) {
      const inicio = instanteTurno(d.turno.fecha, d.turno.inicio);
      if (fechaRecordatorio(inicio, new Date())) {
        await notificacionesService.programarRecordatorio(d.espacio?.nombre ?? 'Tu cancha', inicio, d.reserva.id, false).catch(() => undefined);
      }
    } else if (anteriores.some(a => a.reserva.id === d.reserva.id && a.reserva.estado === 'confirmada')) {
      await notificacionesService.cancelarRecordatorio(d.reserva.id).catch(() => undefined);
    }
  }
  return { datos, cambios, actualizada: true };
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
