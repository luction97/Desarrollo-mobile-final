const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cargarModulo: cargar } = require('./helpers/cargar-modulo.cjs');

test('un 401 tardío conserva la sesión más reciente y las solicitudes de ingreso van sin token', async () => {
  const sesiones = cargar('src/services/sesionEventos.ts', {});
  const valores = new Map([['token', 'anterior'], ['usuario', 'anterior']]);
  let invalidaciones = 0;
  let rechazar;
  const peticiones = [];
  sesiones.escucharSesionInvalidada(() => invalidaciones++);
  const { api } = cargar('src/services/api.ts', {
    axios: { default: { create: () => ({ request: opciones => {
      peticiones.push(opciones);
      if (opciones.url.endsWith('/yo')) return new Promise((_resolve, reject) => { rechazar = reject; });
      return Promise.resolve({ status: 200, data: { datos: {} } });
    } }) } },
    'react-native': { Platform: { OS: 'android' } },
    'expo-constants': { default: {} },
    './storage': { storage: { getItem: async k => valores.get(k), deleteItem: async k => valores.delete(k) } },
    './sesionEventos': sesiones,
  });
  const anterior = api.get('/yo');
  const fallo = assert.rejects(anterior, /Sesión vencida/);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(peticiones[0].headers.Authorization, 'Bearer anterior');
  await api.post('/auth/ingreso', {});
  assert.equal(peticiones[1].headers.Authorization, undefined);
  await sesiones.cambiarSesion(async () => {
    valores.set('token', 'nuevo');
    valores.set('usuario', 'nuevo');
  });
  const respuesta = { response: { status: 401, data: { error: { codigo: 'NO_AUTENTICADO', mensaje: 'Sesión vencida' } } } };
  rechazar(respuesta);
  await fallo;
  assert.equal(valores.get('token'), 'nuevo');
  assert.equal(valores.get('usuario'), 'nuevo');
  assert.equal(invalidaciones, 0);

  const actual = assert.rejects(api.get('/yo'), /Sesión vencida/);
  await new Promise(resolve => setImmediate(resolve));
  rechazar(respuesta);
  await actual;
  assert.equal(valores.has('token'), false);
  assert.equal(valores.get('usuario'), 'nuevo');
  assert.equal(invalidaciones, 1);
});

test('la sesión sobrevive al cierre de la app aunque el token haya caducado', async () => {
  const sesiones = cargar('src/services/sesionEventos.ts', {});
  const valores = new Map([['token', 'token-caducado'], ['usuario', '{"id":"usr-1","nombre":"Jugador"}']]);
  const { authService } = cargar('src/services/auth.ts', {
    './api': { api: {} },
    './storage': { storage: {
      getItem: async k => valores.get(k) ?? null,
      setItem: async (k, v) => { valores.set(k, v); },
      deleteItem: async k => { valores.delete(k); },
    } },
    '../utils/sesion': { tokenVigente: () => false },
    './sesionEventos': sesiones,
  });
  const usuario = await authService.restaurarSesion();
  assert.equal(usuario?.id, 'usr-1');
  assert.equal(await authService.sesionVigente(), false);
});
