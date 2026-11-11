const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const fuente = fs.readFileSync(path.join(__dirname, '../src/utils/turnos.ts'), 'utf8');
const codigo = ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const modulo = { exports: {} };
new Function('exports', codigo)(modulo.exports);
const { ordenarTurnosParaMostrar } = modulo.exports;
const ahora = new Date('2026-11-11T18:30:00');
const turno = (inicio, estado = 'libre') => ({
  id: `turno-${inicio}`, espacioId: 'esp-prueba', fecha: '2026-11-11', inicio,
  fin: `${Number(inicio.slice(0, 2)) + 1}:00`, estado, reservaId: null, motivoBloqueo: null, precio: 12000,
});

test('primero libres futuros descendentes, después ocupados futuros y finalmente pasados', () => {
  const turnos = [turno('17:00', 'reservado'), turno('20:00'), turno('19:00', 'mantenimiento'),
    turno('23:00'), turno('18:00'), turno('22:00', 'reservado'), turno('21:00', 'fijo')];
  const ordenados = ordenarTurnosParaMostrar(turnos, ahora);
  assert.deepEqual(ordenados.map(t => t.inicio), ['23:00', '20:00', '22:00', '21:00', '19:00', '18:00', '17:00']);
});

test('en una jornada futura todos los libres aparecen de mayor a menor sin inventar disponibilidad', () => {
  const turnos = [turno('08:00'), turno('16:00', 'fijo'), turno('23:00'), turno('12:00')];
  const ordenados = ordenarTurnosParaMostrar(turnos, new Date('2026-11-10T23:00:00'));
  assert.deepEqual(ordenados.map(t => t.inicio), ['23:00', '12:00', '08:00', '16:00']);
  assert.equal(ordenados.at(-1).estado, 'fijo');
});

test('sin disponibles mantiene ocupados antes de pasados, orden descendente dentro de cada grupo', () => {
  const turnos = [turno('12:00'), turno('20:00', 'mantenimiento'), turno('22:00', 'reservado'), turno('17:00')];
  assert.deepEqual(ordenarTurnosParaMostrar(turnos, ahora).map(t => t.inicio), ['22:00', '20:00', '17:00', '12:00']);
});

test('no modifica ni el arreglo original ni los datos de turnos y acepta una grilla vacía', () => {
  const a = Object.freeze(turno('20:00'));
  const b = Object.freeze(turno('23:00'));
  const original = Object.freeze([a, b]);
  const resultado = ordenarTurnosParaMostrar(original, ahora);
  assert.notEqual(resultado, original);
  assert.deepEqual(original, [a, b]);
  assert.equal(resultado[0], b);
  assert.deepEqual(ordenarTurnosParaMostrar([], ahora), []);
});
