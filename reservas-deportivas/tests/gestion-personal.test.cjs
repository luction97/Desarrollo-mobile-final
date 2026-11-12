const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { cargarModulo: cargar } = require('./helpers/cargar-modulo.cjs');
const { createUiEnvironment } = require('./helpers/ui-environment.cjs');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const horarios = cargar('src/utils/horarios.ts', {});

test('bloqueo con rango horario envía inicio y fin; sin rango queda día entero', async () => {
  let peticion;
  const { operacionesService: servicio } = cargar('src/services/operaciones.ts', {
    './api': { api: { post: async (...args) => { peticion = args; return []; } } },
    '../utils/horarios': horarios,
  });
  await servicio.bloquear({ espacioIds: ['esp-01', 'esp-02'], fecha: '2026-11-10', motivo: 'Corte de luz', inicio: '08:00', fin: '12:00' });
  assert.deepEqual(peticion, ['/bloqueos', { espacioIds: ['esp-01', 'esp-02'], fecha: '2026-11-10', motivo: 'Corte de luz', inicio: '08:00', fin: '12:00' }]);
  await servicio.bloquear({ espacioIds: ['esp-03'], fecha: '2026-11-10', motivo: 'Anegada' });
  assert.deepEqual(peticion, ['/bloqueos', { espacioIds: ['esp-03'], fecha: '2026-11-10', motivo: 'Anegada' }]);
});

test('bloqueo rechaza datos malos sin llamar a la API', async () => {
  const { operacionesService: servicio } = cargar('src/services/operaciones.ts', {
    './api': { api: { post: () => assert.fail('No debe llamar a la API') } },
    '../utils/horarios': horarios,
  });
  await assert.rejects(servicio.bloquear({ espacioIds: [], fecha: '2026-11-10', motivo: 'X' }), /cancha/);
  await assert.rejects(servicio.bloquear({ espacioIds: ['esp-02'], fecha: '11/10/2026', motivo: 'X' }), /fecha/);
  await assert.rejects(servicio.bloquear({ espacioIds: ['esp-02'], fecha: '2026-11-10', motivo: 'X', inicio: '08:30', fin: '10:00' }), /punto/);
  await assert.rejects(servicio.bloquear({ espacioIds: ['esp-02'], fecha: '2026-11-10', motivo: 'X', inicio: '07:00', fin: '10:00' }), /08:00/);
  await assert.rejects(servicio.bloquear({ espacioIds: ['esp-02'], fecha: '2026-11-10', motivo: 'X', inicio: '12:00', fin: '10:00' }), /anterior/);
  await assert.rejects(servicio.bloquear({ espacioIds: ['esp-02'], fecha: '2026-11-10', motivo: 'X', inicio: '08:00' }), /completá/);
});

test('bloqueos: lista con filtros y baja por id', async () => {
  let consultada;
  let eliminada;
  const bloqueos = [{ id: 'blo-1', espacioId: 'esp-02', fecha: '2026-11-10', inicio: null, fin: null, motivo: 'Lluvia' }];
  const { operacionesService: servicio } = cargar('src/services/operaciones.ts', {
    './api': {
      api: {
        listarTodo: async (endpoint) => { consultada = endpoint; return bloqueos; },
        delete: async (endpoint) => { eliminada = endpoint; },
      },
    },
    '../utils/horarios': horarios,
  });
  assert.deepEqual(await servicio.listarBloqueos('esp-02', '2026-11-10'), bloqueos);
  assert.equal(consultada, '/bloqueos?espacioId=esp-02&desde=2026-11-10');
  await servicio.cancelarBloqueo('blo-1');
  assert.equal(eliminada, '/bloqueos/blo-1');
});

test('la agenda consulta turnos, reservas y datos del titular por id', async () => {
  let consultas = [];
  const { operacionesService: servicio } = cargar('src/services/operaciones.ts', {
    './api': {
      api: {
        listarTodo: async (endpoint) => { consultas.push(endpoint); return []; },
        get: async (endpoint) => { consultas.push(endpoint); return { id: 'usr-207' }; },
      },
    },
    '../utils/horarios': horarios,
  });
  await servicio.listarAgenda('2026-11-10');
  await servicio.listarReservasDelDia('2026-11-10');
  await servicio.obtenerUsuario('usr-207');
  assert.deepEqual(consultas, ['/agenda?fecha=2026-11-10', '/reservas?fecha=2026-11-10', '/usuarios/usr-207']);
});

test('fijas: listado filtrado por espacio y activas', async () => {
  let consultada;
  const { fijasService: servicio } = cargar('src/services/fijas.ts', {
    './api': { api: { listarTodo: async (endpoint) => { consultada = endpoint; return []; } } },
    '../utils/horarios': horarios,
  });
  await servicio.listar('esp-02');
  assert.equal(consultada, '/fijas?espacioId=esp-02&activa=true');
});

test('fijas: creación y edición con titular limpio y hasta opcional', async () => {
  let peticion;
  const { fijasService: servicio } = cargar('src/services/fijas.ts', {
    './api': {
      api: {
        post: async (...args) => { peticion = args; return {}; },
        patch: async (...args) => { peticion = args; return {}; },
      },
    },
    '../utils/horarios': horarios,
  });
  const datos = { espacioId: 'esp-02', titular: ' Grupo de los martes ', dia: 2, inicio: '21:00', fin: '23:00', desde: '2026-03-01', hasta: null };
  await servicio.crear(datos);
  assert.deepEqual(peticion, ['/fijas', { ...datos, titular: 'Grupo de los martes' }]);
  await servicio.editar('fij-07', { ...datos, titular: 'Grupo', hasta: '2026-12-31' });
  assert.deepEqual(peticion, ['/fijas/fij-07', { ...datos, titular: 'Grupo', hasta: '2026-12-31' }]);
});

test('fijas: rechaza datos inválidos sin llamar a la API', async () => {
  const llamadas = [];
  const { fijasService: servicio } = cargar('src/services/fijas.ts', {
    './api': { api: { post: async () => { llamadas.push(1); } } },
    '../utils/horarios': horarios,
  });
  const base = { espacioId: 'esp-02', titular: 'Grupo', dia: 2, inicio: '21:00', fin: '22:00', desde: '2026-03-01', hasta: null };
  await assert.rejects(servicio.crear({ ...base, titular: ' ' }), /titular/);
  await assert.rejects(servicio.crear({ ...base, inicio: '21:30', fin: '22:00' }), /punto/);
  await assert.rejects(servicio.crear({ ...base, inicio: '22:00', fin: '22:00' }), /anterior/);
  await assert.rejects(servicio.crear({ ...base, desde: '03-01' }), /desde/);
  await assert.rejects(servicio.crear({ ...base, hasta: '2026-02-01' }), /posterior/);
  assert.equal(llamadas.length, 0);
});

test('fijas: baja por id', async () => {
  let eliminada;
  const { fijasService: servicio } = cargar('src/services/fijas.ts', {
    './api': { api: { delete: async (endpoint) => { eliminada = endpoint; } } },
    '../utils/horarios': horarios,
  });
  await servicio.darDeBaja('fij-07');
  assert.equal(eliminada, '/fijas/fij-07');
});

test('favoritos: agrega con PUT y quita con DELETE codificando el id', async () => {
  const llamadas = [];
  const { favoritosService: servicio } = cargar('src/services/favoritos.ts', {
    './api': {
      api: {
        put: async (endpoint, cuerpo) => { llamadas.push(['put', endpoint, cuerpo]); return { id: 'usr-207' }; },
        delete: async (endpoint) => { llamadas.push(['delete', endpoint]); },
      },
    },
  });
  await servicio.agregar('esp-02');
  await servicio.quitar('esp-02');
  assert.deepEqual(llamadas, [['put', '/yo/espacios-favoritos/esp-02', {}], ['delete', '/yo/espacios-favoritos/esp-02']]);
});

test('corazón: sin sesión no llama a la API y sugiere ingresar', async () => {
  const entorno = createUiEnvironment();
  let peticiones = 0;
  const { FavoritoToggle } = cargar('src/components/favoritos.tsx', {
    'react-native': { Pressable: 'Pressable', View: 'View', StyleSheet: { create: s => s } },
    '@react-native-vector-icons/ionicons': { default: 'Ionicons' },
    'expo-haptics': { NotificationFeedbackType: { Success: 'success' }, notificationAsync: async () => {} },
    'expo-network': { getNetworkStateAsync: async () => ({ isConnected: true }) },
    './DialogoAviso': { DialogoAviso: 'DialogoAviso' },
    '../context/AuthContext': { useAuth: () => ({ usuario: null, cambiarFavorito: async () => { peticiones++; } }) },
    '../theme': entorno.theme,
  });
  let vista;
  try {
    await act(async () => { vista = create(React.createElement(FavoritoToggle, { espacioId: 'esp-02', nombre: 'Cancha 2' })); });
    const boton = vista.root.findByType('Pressable');
    const estilo = Object.assign({}, ...boton.props.style({ pressed: false }));
    assert.equal(estilo.borderWidth, undefined);
    assert.equal(estilo.borderRadius, undefined);
    assert.equal(estilo.backgroundColor, undefined);
    assert.ok(estilo.minWidth >= 48 && estilo.minHeight >= 48);
    assert.ok(boton.props.style({ pressed: true }).at(-1).opacity < 1);
    await act(async () => { await vista.root.findByType('Pressable').props.onPress(); });
    assert.equal(peticiones, 0);
    const dialogo = vista.root.findByType('DialogoAviso').props;
    assert.equal(dialogo.titulo, 'Ingresá para marcar favoritos');
  } finally {
    if (vista) await act(async () => vista.unmount());
  }
});

test('corazón: envía el cambio una vez y avisa con háptica tras confirmarlo', async () => {
  const entorno = createUiEnvironment();
  const vibraciones = [];
  const actualizaciones = [];
  const usuarioBase = { id: 'usr-207', espaciosFavoritos: ['esp-01'] };
  const { FavoritoToggle } = cargar('src/components/favoritos.tsx', {
    'react-native': { Pressable: 'Pressable', View: 'View', StyleSheet: { create: s => s } },
    '@react-native-vector-icons/ionicons': { default: 'Ionicons' },
    'expo-haptics': { NotificationFeedbackType: { Success: 'success' }, notificationAsync: async (tipo) => { vibraciones.push(tipo); } },
    'expo-network': { getNetworkStateAsync: async () => ({ isConnected: true }) },
    './DialogoAviso': { DialogoAviso: 'DialogoAviso' },
    '../context/AuthContext': {
      useAuth: () => ({ usuario: usuarioBase, cambiarFavorito: async (...args) => { actualizaciones.push(args); } }),
    },
    '../theme': entorno.theme,
  });
  let vista;
  try {
    await act(async () => { vista = create(React.createElement(FavoritoToggle, { espacioId: 'esp-02' })); });
    assert.equal(vista.root.findByType('Pressable').props.accessibilityLabel, 'Agregar esta cancha a favoritos');
    await act(async () => { await vista.root.findByType('Pressable').props.onPress(); });
    assert.deepEqual(actualizaciones, [['esp-02', true]]);
    assert.deepEqual(vibraciones, ['success']);
  } finally {
    if (vista) await act(async () => vista.unmount());
  }
});

test('corazón: si el servidor rechaza, conserva el estado y muestra el error', async () => {
  const entorno = createUiEnvironment();
  const usuarioBase = { id: 'usr-207', espaciosFavoritos: ['esp-01'] };
  const fallo = new Error('Ya alcanzaste el máximo de favoritos.');
  const { FavoritoToggle } = cargar('src/components/favoritos.tsx', {
    'react-native': { Pressable: 'Pressable', View: 'View', StyleSheet: { create: s => s } },
    '@react-native-vector-icons/ionicons': { default: 'Ionicons' },
    'expo-haptics': { NotificationFeedbackType: { Success: 'success' }, notificationAsync: async () => {} },
    'expo-network': { getNetworkStateAsync: async () => ({ isConnected: true }) },
    './DialogoAviso': { DialogoAviso: 'DialogoAviso' },
    '../context/AuthContext': {
      useAuth: () => ({ usuario: usuarioBase, cambiarFavorito: async () => { throw fallo; } }),
    },
    '../theme': entorno.theme,
  });
  let vista;
  try {
    await act(async () => { vista = create(React.createElement(FavoritoToggle, { espacioId: 'esp-02' })); });
    await act(async () => { await vista.root.findByType('Pressable').props.onPress(); });
    assert.equal(vista.root.findByType('Pressable').props.accessibilityState.selected, false);
    const dialogo = vista.root.findByType('DialogoAviso').props;
    assert.equal(dialogo.mensaje, fallo.message);
  } finally {
    if (vista) await act(async () => vista.unmount());
  }
});

test('corazón: quitar favorito conserva la selección y muestra el error si falla la red', async () => {
  const entorno = createUiEnvironment();
  const actualizaciones = [];
  const usuarioBase = { id: 'usr-207', espaciosFavoritos: ['esp-02'] };
  const { FavoritoToggle } = cargar('src/components/favoritos.tsx', {
    'react-native': { Pressable: 'Pressable', View: 'View', StyleSheet: { create: s => s } },
    '@react-native-vector-icons/ionicons': { default: 'Ionicons' },
    'expo-haptics': { NotificationFeedbackType: { Success: 'success' }, notificationAsync: async () => {} },
    'expo-network': { getNetworkStateAsync: async () => ({ isConnected: false }) },
    './DialogoAviso': { DialogoAviso: 'DialogoAviso' },
    '../context/AuthContext': {
      useAuth: () => ({ usuario: usuarioBase, cambiarFavorito: async (...args) => { actualizaciones.push(args); } }),
    },
    '../theme': entorno.theme,
  });
  let vista;
  try {
    await act(async () => { vista = create(React.createElement(FavoritoToggle, { espacioId: 'esp-02' })); });
    await act(async () => { await vista.root.findByType('Pressable').props.onPress(); });
    // No desaparece del filtro Solo favoritos antes de confirmar el cambio.
    assert.deepEqual(actualizaciones, []);
    const dialogo = vista.root.findByType('DialogoAviso').props;
    assert.equal(dialogo.mensaje, 'Conectate para actualizar tus favoritos.');
  } finally {
    if (vista) await act(async () => vista.unmount());
  }
});

test('corazón: quitar espera al servidor antes de desaparecer de Solo favoritos', async () => {
  const entorno = createUiEnvironment();
  const actualizaciones = [];
  let confirmar;
  const pendiente = new Promise(resolve => { confirmar = resolve; });
  const { FavoritoToggle } = cargar('src/components/favoritos.tsx', {
    'react-native': { Pressable: 'Pressable', View: 'View', StyleSheet: { create: s => s } },
    '@react-native-vector-icons/ionicons': { default: 'Ionicons' },
    'expo-haptics': {}, 'expo-network': { getNetworkStateAsync: async () => ({ isConnected: true }) },
    './DialogoAviso': { DialogoAviso: 'DialogoAviso' },
    '../context/AuthContext': { useAuth: () => ({ usuario: { espaciosFavoritos: ['esp-02'] }, cambiarFavorito: async (...args) => { await pendiente; actualizaciones.push(args); } }) },
    '../theme': entorno.theme,
  });
  let vista;
  try {
    await act(async () => { vista = create(React.createElement(FavoritoToggle, { espacioId: 'esp-02' })); });
    let operacion;
    await act(async () => { operacion = vista.root.findByType('Pressable').props.onPress(); });
    assert.deepEqual(actualizaciones, []);
    assert.equal(vista.root.findByType('Pressable').props.accessibilityState.busy, true);
    await act(async () => { confirmar(); await operacion; });
    assert.deepEqual(actualizaciones, [['esp-02', false]]);
  } finally { if (vista) await act(async () => { vista.unmount(); }); }
});
