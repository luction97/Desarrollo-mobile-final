import { api } from './api';
import { errorDeFecha, errorDeRangoHorario } from '../utils/horarios';
import type { ReservaFija } from '../tipos';

export interface DatosFija {
  espacioId: string;
  titular: string;
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  inicio: string;
  fin: string;
  desde: string;
  hasta: string | null;
}

/** Valida los datos con las reglas de la API (M5): titular, fechas y horarios en punto 08:00–24:00. */
function validar(datos: DatosFija): string | null {
  if (!datos.espacioId) return 'Seleccioná una cancha.';
  if (!datos.titular.trim()) return 'Escribí el titular de la reserva fija.';
  if (errorDeFecha(datos.desde)) return 'Revisá la fecha desde. Escribila con año, mes y día.';
  if (datos.hasta && errorDeFecha(datos.hasta)) return 'Revisá la fecha hasta. Escribila con año, mes y día.';
  if (datos.hasta && datos.hasta < datos.desde) return 'La fecha hasta debe ser posterior o igual a la fecha desde.';
  if (!datos.inicio || !datos.fin) return 'Elegí la hora de inicio y la de fin.';
  return errorDeRangoHorario(datos.inicio, datos.fin);
}

function cuerpo(datos: DatosFija, incluirEspacio = true): Record<string, unknown> {
  const resultado: Record<string, unknown> = {
    titular: datos.titular.trim(),
    dia: datos.dia,
    inicio: datos.inicio,
    fin: datos.fin,
    desde: datos.desde,
    hasta: datos.hasta,
  };
  // El espacio se crea al alta; al editar la API no lo acepta ("sobra el dato espacioId").
  if (incluirEspacio) resultado.espacioId = datos.espacioId;
  return resultado;
}

export const fijasService = {
  /** Fijas activas del espacio, ordenadas por el servidor. */
  listar(espacioId: string): Promise<ReservaFija[]> {
    return api.listarTodo<ReservaFija>(`/fijas?espacioId=${encodeURIComponent(espacioId)}&activa=true`);
  },

  crear(datos: DatosFija): Promise<ReservaFija> {
    const error = validar(datos);
    if (error) return Promise.reject(new Error(error));
    return api.post<ReservaFija>('/fijas', cuerpo(datos));
  },

  editar(id: string, datos: DatosFija): Promise<ReservaFija> {
    const error = validar(datos);
    if (error) return Promise.reject(new Error(error));
    return api.patch<ReservaFija>(`/fijas/${encodeURIComponent(id)}`, cuerpo(datos, false));
  },

  /** Da de baja la fija en el servidor (activa: false). Los errores 409 de conflicto llegan como mensaje. */
  async darDeBaja(id: string): Promise<void> {
    await api.delete(`/fijas/${encodeURIComponent(id)}`);
  },
};
