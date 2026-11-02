import { Turno, EstadoTurno } from '../tipos';
import { RESERVAS, RESERVAS_FIJAS, BLOQUEOS_DIAS_ENTEROS } from '../mocks';
import { guardarTurnosLocalmente, obtenerTurnosLocales } from './db';
import * as Network from 'expo-network';

export async function obtenerGrillaDia(espacioId: string, fecha: string): Promise<Turno[]> {
  // 1. Chequeamos si hay internet
  const estadoRed = await Network.getNetworkStateAsync();
  
  if (!estadoRed.isConnected) {
    console.log('⚠️ Sin internet, leyendo de SQLite...');
    return await obtenerTurnosLocales(espacioId, fecha);
  }

  // 2. Si hay internet, simulamos la llamada a la API y generamos los turnos
  console.log('🌐 Conectado, buscando en la nube...');
  await new Promise(resolve => setTimeout(resolve, 500));

  const turnos: Turno[] = [];
  const [year, month, day] = fecha.split('-').map(Number);
  const diaSemana = new Date(year, month - 1, day).getDay();
  const bloqueoDia = BLOQUEOS_DIAS_ENTEROS.find(b => b.espacioId === espacioId && b.fecha === fecha);

  for (let hora = 8; hora < 24; hora++) {
    const inicio = `${hora.toString().padStart(2, '0')}:00`;
    const fin = `${(hora + 1).toString().padStart(2, '0')}:00`;
    const turnoId = `tur-${fecha}-${hora}`;

    let estado: EstadoTurno = 'libre';
    let reservaId: string | null = null;
    let motivoBloqueo: string | null = null;

    if (bloqueoDia) {
      estado = 'mantenimiento';
      motivoBloqueo = bloqueoDia.motivo;
    } else {
      const fija = RESERVAS_FIJAS.find(f => f.espacioId === espacioId && f.dia === diaSemana && f.inicio === inicio && f.activa);
      if (fija) {
        estado = 'fijo';
        motivoBloqueo = `Reservado por: ${fija.titular}`;
      } else {
        const reserva = RESERVAS.find(r => r.espacioId === espacioId && r.turnoId === turnoId && r.estado === 'confirmada');
        if (reserva) {
          estado = 'reservado';
          reservaId = reserva.id;
        }
      }
    }

    turnos.push({ id: turnoId, espacioId, fecha, inicio, fin, estado, reservaId, motivoBloqueo, precio: 12000 });
  }

  // 3. Guardamos la grilla en el teléfono para cuando no haya señal
  await guardarTurnosLocalmente(turnos);
  return turnos;
}