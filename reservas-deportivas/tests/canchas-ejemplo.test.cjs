const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const fuente = fs.readFileSync(path.join(__dirname, '../src/canchas/modelo.ts'), 'utf8');
const codigo = ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const modulo = { exports: {} };
new Function('exports', codigo)(modulo.exports);
const { familiaDeDeporte, catalogoDeEspacios } = modulo.exports;

const espacio = (id, deporteId, activo = true) => ({
  id,
  nombre: `Cancha ${id}`,
  deporteId,
  complejo: 'Polideportivo Municipal',
  superficie: 'Césped sintético',
  techado: false,
  iluminacion: true,
  capacidad: 10,
  precioPorHora: 12000,
  coordenadas: { latitud: -31.86, longitud: -59.02 },
  imagenes: [],
  videoUrl: null,
  reglas: 'Usar calzado deportivo.',
  activo,
});

const semillas = () => [
  espacio('esp-01', 'dep-futbol5'),
  espacio('esp-02', 'dep-futbol5'),
  espacio('esp-03', 'dep-futbol11'),
  espacio('esp-04', 'dep-basquet'),
  espacio('esp-05', 'dep-basquet'),
  espacio('esp-06', 'dep-basquet'),
  espacio('esp-07', 'dep-voley'),
  espacio('esp-08', 'dep-voley'),
  espacio('esp-09', 'dep-tenis'),
  espacio('esp-10', 'dep-tenis'),
  espacio('esp-11', 'dep-gimnasio'),
];

test('incluye los once espacios activos de ejemplo', () => {
  const canchas = catalogoDeEspacios(semillas());
  assert.equal(canchas.length, 11);
  assert.deepEqual(canchas.map(c => c.id), ['esp-01','esp-02','esp-03','esp-04','esp-05','esp-06','esp-07','esp-08','esp-09','esp-10','esp-11']);
});

test('fútbol 5 y fútbol 11 comparten la misma foto registrada', () => {
  assert.equal(familiaDeDeporte('dep-futbol5'), 'futbol');
  assert.equal(familiaDeDeporte('dep-futbol11'), 'futbol');
  // El gimnasio no tiene foto propia: usa la imagen que publica la API.
  assert.equal(familiaDeDeporte('dep-gimnasio'), null);
});

test('descarta las canchas inactivas y mantiene las activas', () => {
  const canchas = catalogoDeEspacios([
    espacio('esp-04', 'dep-basquet', false),
    espacio('esp-06', 'dep-basquet'),
    espacio('esp-05', 'dep-basquet'),
    espacio('esp-09', 'dep-tenis', false),
  ]);
  assert.deepEqual(canchas.map(c => c.id), ['esp-05', 'esp-06']);
});

test('no modifica el arreglo original y tolera listas vacías', () => {
  const original = Object.freeze(semillas().map(e => Object.freeze(e)));
  assert.doesNotThrow(() => catalogoDeEspacios(original));
  assert.deepEqual(catalogoDeEspacios([]), []);
});

test('cada deporte del ejemplo tiene su archivo de foto local', () => {
  const imagenes = fs.readFileSync(path.join(__dirname, '../src/canchas/imagenes.ts'), 'utf8');
  const rutas = [...imagenes.matchAll(/require\('([^']+\.png)'\)/g)].map(m => m[1]);
  assert.equal(rutas.length, 4);
  for (const ruta of rutas) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'src', 'canchas', ruta)), `Falta ${ruta}`);
  }
});
