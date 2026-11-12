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
const turno = (inicio, estado = 'libre') => ({
  id: `turno-${inicio}`, espacioId: 'esp-prueba', fecha: '2026-11-11', inicio,
  fin: `${Number(inicio.slice(0, 2)) + 1}:00`, estado, reservaId: null, motivoBloqueo: null, precio: 12000,
});

test('ordena por hora independientemente del estado', () => {
  const turnos = [turno('17:00', 'reservado'), turno('20:00'), turno('19:00', 'mantenimiento'),
    turno('23:00'), turno('18:00'), turno('22:00', 'reservado'), turno('21:00', 'fijo')];
  const ordenados = ordenarTurnosParaMostrar(turnos);
  assert.deepEqual(ordenados.map(t => t.inicio), ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']);
});

test('en una jornada futura los estados se conservan al ordenar', () => {
  const turnos = [turno('08:00'), turno('16:00', 'fijo'), turno('23:00'), turno('12:00')];
  const ordenados = ordenarTurnosParaMostrar(turnos);
  assert.deepEqual(ordenados.map(t => t.inicio), ['08:00', '12:00', '16:00', '23:00']);
  assert.equal(ordenados[2].estado, 'fijo');
});

test('ordena aunque no haya turnos futuros disponibles', () => {
  const turnos = [turno('12:00'), turno('20:00', 'mantenimiento'), turno('22:00', 'reservado'), turno('17:00')];
  assert.deepEqual(ordenarTurnosParaMostrar(turnos).map(t => t.inicio), ['12:00', '17:00', '20:00', '22:00']);
});

test('no modifica ni el arreglo original ni los datos de turnos y acepta una grilla vacía', () => {
  const a = Object.freeze(turno('20:00'));
  const b = Object.freeze(turno('23:00'));
  const original = Object.freeze([a, b]);
  const resultado = ordenarTurnosParaMostrar(original);
  assert.notEqual(resultado, original);
  assert.deepEqual(original, [a, b]);
  assert.equal(resultado[0], a);
  assert.deepEqual(ordenarTurnosParaMostrar([]), []);
});
