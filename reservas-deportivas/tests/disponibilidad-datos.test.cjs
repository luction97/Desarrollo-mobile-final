const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cargarModulo: cargar } = require('./helpers/cargar-modulo.cjs');
const fechas = cargar('src/utils/fechas.ts', {});
const turno = { id: 'tur-1', espacioId: 'esp-1', fecha: '2099-01-15', inicio: '20:00' };

test('la ventana de fechas sigue el día de Villaguay y atraviesa fin de año', () => {
  const antes = new Date('2026-01-01T02:59:59Z');
  const despues = new Date('2026-01-01T03:00:00Z');
  assert.deepEqual(fechas.diasDeReserva(fechas.fechaArgentina(antes)).map(d => d.fecha), [
    '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06',
  ]);
  assert.equal(fechas.diasDeReserva(fechas.fechaArgentina(despues)).at(-1).fecha, '2026-01-07');
});

test('la grilla solo anuncia liberaciones futuras observadas y guarda la respuesta vacía', async () => {
  let previos = [{ ...turno, estado: 'reservado' }];
  let remotos = [{ ...turno, estado: 'libre' }, { ...turno, id: 'tur-nuevo', estado: 'libre' }];
  const { consultarGrilla } = cargar('src/services/turnos.ts', {
    './api': { api: { listarTodo: async () => remotos } },
    './turnosStorage': {
      obtenerTurnosLocales: async () => previos,
      guardarTurnosLocalmente: async (_id, _fecha, datos) => { previos = datos; },
    },
    'expo-network': { getNetworkStateAsync: async () => ({ isConnected: true }) },
    '../utils/fechas': fechas,
  });
  assert.deepEqual((await consultarGrilla(turno.espacioId, turno.fecha)).liberados.map(t => t.id), [turno.id]);
  assert.deepEqual((await consultarGrilla(turno.espacioId, turno.fecha)).liberados, []);
  remotos = [];
  assert.deepEqual((await consultarGrilla(turno.espacioId, turno.fecha)).datos, []);
  assert.deepEqual(previos, []);
});
