import { api } from './api';
import type { Espacio, Reserva } from '../tipos';

export const operacionesService = {
  obtenerEspacios(): Promise<Espacio[]> {
    return api.get<Espacio[]>('/espacios');
  },

  registrarIngreso(codigoQr: string, espacioId: string): Promise<Reserva> {
    if (!codigoQr.trim() || !espacioId) {
      return Promise.reject(new Error('Indicá el código y la cancha de ingreso.'));
    }
    return api.post<Reserva>('/ingresos', { codigoQr: codigoQr.trim(), espacioId });
  },

  bloquearDia(espacioId: string, fecha: string, motivo: string): Promise<unknown> {
    if (!espacioId || !motivo.trim()) {
      return Promise.reject(new Error('Seleccioná una cancha y escribí el motivo.'));
    }
    return api.post('/bloqueos', { espacioIds: [espacioId], fecha, motivo: motivo.trim() });
  },
};
