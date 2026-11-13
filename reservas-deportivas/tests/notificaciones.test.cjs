const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { cargarModulo: cargar } = require('./helpers/cargar-modulo.cjs');

const recordatorios = cargar('src/utils/recordatorios.ts', {});
const fechas = cargar('src/utils/fechas.ts', {});
const modelos = cargar('src/modelos/reservas.ts', { '../utils/fechas': fechas });
const inicioFuturo = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

function entorno({ os = 'android', expoGo = false, permiso = { granted: true }, respuesta = permiso, fallarCarga = false } = {}) {
  const llamadas = [];
  let cargas = 0;
  let handler;
  const programadas = new Map();
  const nativo = {
    AndroidImportance: { DEFAULT: 3 },
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler: valor => { handler = valor; llamadas.push(['handler']); },
    setNotificationChannelAsync: async (...args) => { llamadas.push(['canal', ...args]); },
    getPermissionsAsync: async () => { llamadas.push(['permisos']); return permiso; },
    requestPermissionsAsync: async () => { llamadas.push(['solicitar']); return respuesta; },
    getAllScheduledNotificationsAsync: async () => [...programadas.values()],
    scheduleNotificationAsync: async datos => { programadas.set(datos.identifier, datos); llamadas.push(['programar', datos]); return datos.identifier; },
    cancelScheduledNotificationAsync: async id => { programadas.delete(id); llamadas.push(['cancelar', id]); },
    cancelAllScheduledNotificationsAsync: async () => { llamadas.push(['cancelarTodos']); },
    getExpoPushTokenAsync: async () => { llamadas.push(['token']); return { data: 'ExponentPushToken[prueba]' }; },
    getDevicePushTokenAsync: () => assert.fail('No se deben solicitar tokens del dispositivo'),
    addPushTokenListener: () => assert.fail('No se deben registrar listeners de tokens'),
    addNotificationReceivedListener: () => assert.fail('No se necesitan listeners de recepción'),
    addNotificationResponseReceivedListener: (fn) => { llamadas.push(['respuesta']); return { remove: () => llamadas.push(['quitar']) }; },
  };
  const dependencias = {
    'react-native': { Platform: { OS: os } },
    'expo': { isRunningInExpoGo: () => expoGo },
    './api': { api: { post: async (endpoint, cuerpo) => { llamadas.push(['api', endpoint, cuerpo]); return { datos: cuerpo }; } } },
    '../utils/recordatorios': recordatorios,
    get 'expo-notifications'() {
      cargas++;
      if (fallarCarga) throw new Error('Módulo nativo no disponible');
      return nativo;
    },
  };
  const { notificacionesService } = cargar('src/services/notificaciones.ts', dependencias);
  return { servicio: notificacionesService, llamadas, get cargas() { return cargas; }, get handler() { return handler; } };
}

test('importar el servicio no carga expo-notifications ni instala handlers', () => {
  const caso = entorno();
  assert.equal(caso.cargas, 0);
  assert.deepEqual(caso.llamadas, []);
});

test('Android: programa el recordatorio local dos horas antes, con canal y sin tokens push', async () => {
  const caso = entorno();
  const inicio = inicioFuturo();
  assert.equal(await caso.servicio.programarRecordatorio('Cancha 2', inicio, 'res-1'), true);
  assert.deepEqual(caso.llamadas.map(([nombre]) => nombre).slice(0, 5), ['handler', 'cancelar', 'canal', 'permisos', 'programar']);
  const programada = caso.llamadas.find(([nombre]) => nombre === 'programar')[1];
  assert.equal(programada.identifier, 'reserva-res-1');
  assert.deepEqual(programada.content, {
    title: 'Tu turno empieza en dos horas', body: 'Cancha 2. Llevá el QR para ingresar.', data: { reservaId: 'res-1', programadoPara: new Date(inicio.getTime() - 7200000).toISOString() }, sound: true,
  });
  assert.equal(programada.trigger.type, 'date');
  assert.equal(programada.trigger.channelId, 'recordatorios');
  assert.equal(programada.trigger.date.getTime(), inicio.getTime() - 2 * 60 * 60 * 1000);
  assert.deepEqual(caso.llamadas.find(([nombre]) => nombre === 'canal')[2], { name: 'Recordatorios de reservas', importance: 3 });
  assert.deepEqual(await caso.handler.handleNotification(), {
    shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
  });
});

test('al tocar una notificación entrega los datos de la reserva', async () => {
  const caso = entorno();
  let datos = null;
  const quitar = await caso.servicio.suscribirApertura(recibidos => { datos = recibidos; });
  assert.ok(caso.llamadas.some(([nombre]) => nombre === 'respuesta'));
  quitar();
  assert.ok(caso.llamadas.some(([nombre]) => nombre === 'quitar'));
});

test('en Expo Go no carga expo-notifications: el push no existe y no debe mostrar error', async () => {
  const caso = entorno({ expoGo: true });
  await caso.servicio.inicializar();
  assert.equal(await caso.servicio.programarRecordatorio('Cancha 2', inicioFuturo(), 'res-1'), false);
  assert.equal(await caso.servicio.registrarDispositivo(), false);
  assert.equal(await caso.servicio.pedirPermisos(), false);
  assert.equal(caso.cargas, 0);
  assert.deepEqual(caso.llamadas, []);
});

test('anota el teléfono en el servidor para recibir los avisos de suspensión', async () => {
  const caso = entorno();
  assert.equal(await caso.servicio.registrarDispositivo(), true);
  const registro = caso.llamadas.find(([nombre]) => nombre === 'api');
  assert.equal(registro[1], '/dispositivos');
  assert.deepEqual(registro[2], { tokenExpo: 'ExponentPushToken[prueba]', plataforma: 'android' });
});

test('sin permiso de notificaciones no anota el teléfono', async () => {
  const caso = entorno({ permiso: { granted: false } });
  assert.equal(await caso.servicio.registrarDispositivo(), false);
  assert.ok(!caso.llamadas.some(([nombre]) => nombre === 'api'));
});

test('en la web no pide token ni anota el teléfono', async () => {
  const caso = entorno({ os: 'web' });
  assert.equal(await caso.servicio.registrarDispositivo(), false);
  assert.ok(!caso.llamadas.some(([nombre]) => nombre === 'token'));
});

test('inicializaciones concurrentes comparten carga y handler', async () => {
  const caso = entorno();
  await Promise.all([caso.servicio.inicializar(), caso.servicio.inicializar()]);
  await caso.servicio.programarRecordatorio('Cancha 2', inicioFuturo(), 'res-1');
  assert.equal(caso.cargas, 1);
  assert.equal(caso.llamadas.filter(([nombre]) => nombre === 'handler').length, 1);
});

test('Android: crea el canal antes de solicitar permisos denegados y no programa', async () => {
  const caso = entorno({ permiso: { granted: false } });
  assert.equal(await caso.servicio.programarRecordatorio('Cancha 2', inicioFuturo(), 'res-1'), false);
  assert.deepEqual(caso.llamadas.map(([nombre]) => nombre), ['handler', 'cancelar', 'canal', 'permisos', 'solicitar']);
});

test('Android: permiso concedido por el usuario permite programar', async () => {
  const caso = entorno({ permiso: { granted: false }, respuesta: { granted: true } });
  assert.equal(await caso.servicio.programarRecordatorio('Cancha 2', inicioFuturo(), 'res-1'), true);
  assert.ok(caso.llamadas.some(([nombre]) => nombre === 'programar'));
});

test('iOS: autorización provisional permite recordatorios sin canal Android ni nuevo permiso', async () => {
  const caso = entorno({ os: 'ios', permiso: { granted: false, ios: { status: 3 } } });
  assert.equal(await caso.servicio.programarRecordatorio('Cancha 2', inicioFuturo(), 'res-1'), true);
  assert.ok(!caso.llamadas.some(([nombre]) => ['canal', 'solicitar'].includes(nombre)));
});

test('sin fecha futura de recordatorio cancela el anterior sin solicitar permisos', async () => {
  for (const inicio of [new Date(Date.now() + 60 * 60 * 1000), new Date(0), new Date('inválida')]) {
    const caso = entorno();
    assert.equal(await caso.servicio.programarRecordatorio('Cancha 2', inicio, 'res-1'), false);
    assert.deepEqual(caso.llamadas.map(([nombre]) => nombre), ['handler', 'cancelar']);
  }
});

test('cancelar una reserva y cerrar sesión conservan sus cancelaciones locales sin pedir permisos', async () => {
  const caso = entorno();
  await caso.servicio.cancelarRecordatorio('res-1');
  await caso.servicio.cancelarTodos();
  assert.deepEqual(caso.llamadas, [['handler'], ['cancelar', 'reserva-res-1'], ['cancelarTodos']]);
});

test('web: no carga expo-notifications ni ejecuta operaciones nativas', async () => {
  const caso = entorno({ os: 'web' });
  await caso.servicio.inicializar();
  assert.equal(await caso.servicio.pedirPermisos(), false);
  assert.equal(await caso.servicio.programarRecordatorio('Cancha 2', inicioFuturo(), 'res-1'), false);
  await caso.servicio.cancelarRecordatorio('res-1');
  await caso.servicio.cancelarTodos();
  assert.equal(caso.cargas, 0);
  assert.deepEqual(caso.llamadas, []);
});

test('fallos de carga se propagan y permiten reintentar', async () => {
  const caso = entorno({ fallarCarga: true });
  await assert.rejects(caso.servicio.inicializar(), /Módulo nativo no disponible/);
  await assert.rejects(caso.servicio.inicializar(), /Módulo nativo no disponible/);
  assert.equal(caso.cargas, 2);
});

const usuario = { id: 'usr-1', nombre: 'Jugador', espaciosFavoritos: [], rol: 'jugador' };
const espacio = { id: 'esp-1', nombre: 'Cancha 2', capacidad: 10 };
const turno = { id: 'tur-1', fecha: '2099-01-15', inicio: '20:00', fin: '21:00', precio: 10000 };
const reserva = { id: 'res-1', usuarioId: usuario.id, espacioId: espacio.id, codigoQr: 'QR-PRUEBA', estado: 'confirmada' };
const guardada = { reserva, espacio, turno };

function cargarReservas(caso, { datos = [], api = {} } = {}) {
  const storage = new Map([[`reservas:${usuario.id}`, datos]]);
  return cargar('src/services/reservas.ts', {
    './api': { api, ApiError: class ApiError extends Error {} },
    './localStore': {
      leerLocal: async clave => storage.get(clave),
      escribirLocal: async (clave, valor) => { storage.set(clave, valor); },
    },
    './espacios': { obtenerEspaciosLocales: async () => [espacio], obtenerEspacios: async () => ({ datos: [espacio] }) },
    './notificaciones': { notificacionesService: caso.servicio },
    '../modelos/reservas': modelos,
    '../utils/fechas': fechas,
    '../utils/recordatorios': recordatorios,
  });
}

test('crear una reserva real programa el recordatorio mediante el servicio local', async () => {
  const caso = entorno();
  const reservas = cargarReservas(caso, { api: { post: async () => reserva } });
  const resultado = await reservas.crearReserva(turno, espacio, 2, usuario.id);
  assert.equal(resultado.recordatorioDisponible, true);
  assert.equal(caso.llamadas.find(([nombre]) => nombre === 'programar')[1].identifier, 'reserva-res-1');
});

test('denegar notificaciones no invalida la reserva y devuelve recordatorioDisponible false', async () => {
  const caso = entorno({ permiso: { granted: false } });
  const reservas = cargarReservas(caso, { api: { post: async () => reserva } });
  const resultado = await reservas.crearReserva(turno, espacio, 2, usuario.id);
  assert.equal(resultado.dato.reserva.id, reserva.id);
  assert.equal(resultado.recordatorioDisponible, false);
});

test('un fallo de carga nativa no invalida una reserva confirmada', async () => {
  const caso = entorno({ fallarCarga: true });
  const reservas = cargarReservas(caso, { api: { post: async () => reserva } });
  const resultado = await reservas.crearReserva(turno, espacio, 2, usuario.id);
  assert.equal(resultado.dato.reserva.id, reserva.id);
  assert.equal(resultado.recordatorioDisponible, false);
});

test('una reserva rechazada no carga el paquete ni genera recordatorio', async () => {
  const caso = entorno();
  const reservas = cargarReservas(caso, { api: { post: async () => { throw new Error('Turno ocupado'); } } });
  await assert.rejects(reservas.crearReserva(turno, espacio, 2, usuario.id), /Turno ocupado/);
  assert.equal(caso.cargas, 0);
});

test('cancelar o sincronizar una reserva cancelada elimina su recordatorio local', async () => {
  const caso = entorno();
  const cancelada = { ...reserva, estado: 'cancelada' };
  const reservas = cargarReservas(caso, {
    datos: [guardada],
    api: { post: async () => cancelada, listarTodo: async ruta => ruta.endsWith('proximas') ? [cancelada] : [] },
  });
  await reservas.cancelarReserva(guardada);
  await reservas.sincronizarReservas(usuario.id);
  assert.deepEqual(caso.llamadas.filter(([nombre]) => nombre === 'cancelar'), [
    ['cancelar', 'reserva-res-1'],
  ]);
  assert.ok(!caso.llamadas.some(([nombre]) => ['programar', 'solicitar'].includes(nombre)));
});

test('sincronizar recupera un recordatorio faltante y conserva el existente sin pedir permisos', async () => {
  const caso = entorno();
  const remota = { ...reserva, cancelableHasta: '2099-01-15T16:00:00-03:00' };
  const reservas = cargarReservas(caso, {
    api: { listarTodo: async ruta => ruta.endsWith('proximas') ? [remota] : [] },
  });
  await reservas.sincronizarReservas(usuario.id);
  await reservas.sincronizarReservas(usuario.id);
  assert.equal(caso.llamadas.filter(([nombre]) => nombre === 'programar').length, 1);
  assert.ok(!caso.llamadas.some(([nombre]) => nombre === 'solicitar'));
});

test('una cancelación detectada al actualizar se informa una sola vez', async () => {
  const caso = entorno();
  const cancelada = { ...reserva, estado: 'cancelada' };
  const reservas = cargarReservas(caso, {
    datos: [guardada],
    api: { listarTodo: async ruta => ruta.endsWith('pasadas') ? [cancelada] : [] },
  });
  assert.equal((await reservas.sincronizarReservas(usuario.id)).cambios[0].reserva.id, reserva.id);
  assert.deepEqual((await reservas.sincronizarReservas(usuario.id)).cambios, []);
  assert.equal((await reservas.reservasGuardadas(usuario.id))[0].reserva.estado, 'cancelada');
});

test('una sincronización que perdió vigencia no pisa el QR guardado', async () => {
  const caso = entorno();
  let devolver;
  const peticion = new Promise(resolve => { devolver = resolve; });
  const reservas = cargarReservas(caso, {
    datos: [guardada],
    api: { listarTodo: async () => peticion },
  });
  let vigente = true;
  const sincronizacion = reservas.sincronizarReservas(usuario.id, () => vigente);
  vigente = false;
  devolver([]);
  assert.equal((await sincronizacion).actualizada, false);
  assert.equal((await reservas.reservasGuardadas(usuario.id))[0].reserva.codigoQr, guardada.reserva.codigoQr);
  assert.deepEqual(caso.llamadas, []);
});

test('reabrir con reservas confirmadas futuras prepara el handler sin reprogramar ni pedir permisos', async () => {
  const caso = entorno();
  const reservas = cargarReservas(caso, { datos: [guardada] });
  await reservas.prepararRecordatoriosGuardados(usuario.id);
  assert.deepEqual(caso.llamadas, [['handler']]);
});

test('sin reservas futuras propias no inicializa notificaciones al reabrir', async () => {
  const dentroDeUnaHora = new Date(Date.now() + 60 * 60 * 1000);
  const hora = new Intl.DateTimeFormat('en-GB', { timeZone: fechas.ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(dentroDeUnaHora);
  for (const datos of [[], [{ ...guardada, turno: null }], [{ ...guardada, reserva: { ...reserva, estado: 'cancelada' } }],
    [{ ...guardada, turno: { ...turno, fecha: '2000-01-01' } }], [{ ...guardada, reserva: { ...reserva, usuarioId: 'usr-otro' } }],
    [{ ...guardada, turno: { ...turno, fecha: fechas.fechaArgentina(dentroDeUnaHora), inicio: hora } }]]) {
    const caso = entorno();
    const reservas = cargarReservas(caso, { datos });
    await reservas.prepararRecordatoriosGuardados(usuario.id);
    assert.equal(caso.cargas, 0);
  }
});

test('AuthContext: arranque invitado sin carga nativa; restauración con reservas y logout conservan avisos', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const [guardado, biometria] of [[null, false], [usuario, false], [usuario, true]]) {
    const caso = entorno();
    const reservas = cargarReservas(caso, { datos: [guardada] });
    let contexto;
    let cerrada = false;
    const { AuthProvider, useAuth } = cargar('src/context/AuthContext.tsx', {
      react: { ...React, default: React },
      'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
      '../hooks/useSinRed': { useSinRed: () => false },
      '../services/auth': { authService: { obtenerPerfil: async () => guardado, restaurarSesion: async () => guardado, logout: async () => { cerrada = true; } } },
      '../services/biometria': { biometriaDisponible: async () => biometria },
      '../services/favoritos': { favoritosService: {} },
      '../services/sesionEventos': { escucharSesionInvalidada: () => () => {} },
      '../services/notificaciones': { notificacionesService: caso.servicio },
      '../services/reservas': reservas,
    });
    function Consumidor() { contexto = useAuth(); return null; }
    let vista;
    try {
      await act(async () => { vista = create(React.createElement(AuthProvider, null, React.createElement(Consumidor))); });
      assert.equal(contexto.cargando, false);
      assert.equal(contexto.usuario, guardado);
      assert.equal(contexto.sesionVencida, false);
      assert.equal(caso.cargas, guardado ? 1 : 0);
      assert.ok(!caso.llamadas.some(([nombre]) => ['solicitar', 'programar'].includes(nombre)));
      if (guardado) {
        await act(async () => { contexto.bloquear(); });
        assert.equal(contexto.usuario, null);
        assert.equal(contexto.usuarioGuardado, guardado);
        await act(async () => { await contexto.logout(); });
        assert.equal(cerrada, true);
        assert.equal(contexto.usuario, null);
        assert.ok(caso.llamadas.some(([nombre]) => nombre === 'cancelarTodos'));
      }
    } finally {
      if (vista) await act(async () => { vista.unmount(); });
    }
  }
});
