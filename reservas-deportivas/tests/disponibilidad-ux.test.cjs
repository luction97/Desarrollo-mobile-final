const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { createUiEnvironment } = require('./helpers/ui-environment.cjs');
const shared = createUiEnvironment();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function cargar(archivo, dependencias) {
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', codigo)(nombre => {
    if (Object.hasOwn(dependencias, nombre)) return dependencias[nombre];
    if (['react', 'react/jsx-runtime'].includes(nombre)) return require(nombre);
    if (nombre.endsWith('/theme')) return shared.theme;
    if (nombre.endsWith('/ui')) return shared.ui;
    throw new Error(`Dependencia sin controlar: ${nombre}`);
  }, modulo, modulo.exports);
  return modulo.exports;
}

const nativos = {
  View: 'View', Text: 'Text', FlatList: 'FlatList', TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator', Button: 'Button', ScrollView: 'ScrollView',
  Pressable: 'Pressable', Modal: 'Modal', StyleSheet: { create: s => s },
};
const futuro = { id: 'turno-prueba', espacioId: 'esp-02', fecha: '2099-01-15', inicio: '20:00', fin: '21:00', estado: 'libre', precio: 12000, motivoBloqueo: null };
const espacio = {
  id: 'esp-02', nombre: 'Cancha 2', deporteId: 'dep-futbol5', complejo: 'Polideportivo',
  capacidad: 10, precioPorHora: 12000, imagenes: [], videoUrl: null, reglas: '', activo: true,
};
const fechas = cargar('src/utils/fechas.ts', {});
const modeloCanchas = cargar('src/canchas/modelo.ts', {});
const imagenesCanchas = { fotoDeCancha: () => null };

async function montar({ fallar = false } = {}) {
  const navegaciones = [];
  const router = { push: ruta => navegaciones.push(typeof ruta === 'string' ? ruta : ruta.pathname) };
  const pantalla = cargar('app/(tabs)/index.tsx', {
    'react-native': nativos,
    'expo-router': {
      useRouter: () => router,
      useFocusEffect: callback => React.useEffect(callback, [callback]),
      useLocalSearchParams: () => ({}),
    },
    '../../src/services/turnos': { consultarGrilla: async () => {
      if (fallar) throw new Error('No se pudo consultar la disponibilidad.');
      return { datos: [futuro], local: false };
    } },
    '../../src/services/espacios': {
      obtenerEspacios: async () => ({ datos: [espacio], local: false }),
      obtenerEspaciosLocales: async () => [espacio],
      obtenerDeportes: async () => [{ id: 'dep-futbol5', nombre: 'Fútbol 5' }],
    },
    '../../src/canchas/modelo': modeloCanchas,
    '../../src/canchas/imagenes': imagenesCanchas,
    '../../src/services/reservas': { crearReserva: async () => assert.fail('El invitado no debe crear reservas') },
    '../../src/services/preferencias': { default: { getItem: async () => null, setItem: async () => {} } },
    '../../src/context/AuthContext': { useAuth: () => ({ usuario: null, cargando: false, logout: async () => {} }) },
    'expo-network': {
      getNetworkStateAsync: async () => ({ isConnected: true }),
      addNetworkStateListener: () => ({ remove() {} }),
    },
    '../../src/components/DialogoAviso': { DialogoAviso: 'DialogoAviso' },
    '../../src/components/ReservaDialog': { ReservaDialog: 'ReservaDialog' },
    '../../src/utils/fechas': fechas,
    '../../src/utils/turnos': cargar('src/utils/turnos.ts', {}),
  }).default;
  let vista;
  await act(async () => { vista = create(React.createElement(pantalla)); });
  return { vista, navegaciones,
    recuperar: () => { fallar = false; },
    fila: turno => vista.root.findByType('FlatList').props.renderItem({ item: turno }),
    cerrar: async () => { await act(async () => vista.unmount()); },
  };
}

test('invitado elige un libre futuro: diálogo contextual sin alert ni redirección automática', async () => {
  const caso = await montar();
  try {
    await act(async () => { await caso.fila(futuro).props.onPress(); });
    const dialogo = caso.vista.root.findByType('DialogoAviso').props;
    assert.equal(dialogo.titulo, 'Ingresá para reservar');
    assert.equal(dialogo.detalle, '15/01/2099 · 20:00–21:00');
    assert.equal(dialogo.accionPrincipal, 'Iniciar sesión');
    assert.equal(dialogo.accionSecundaria, 'Ahora no');
    assert.equal(dialogo.mensaje, undefined);
    assert.deepEqual(caso.navegaciones, []);
    const fuente = fs.readFileSync(path.join(__dirname, '../app/(tabs)/index.tsx'), 'utf8');
    assert.ok(!fuente.includes('window.alert') && !fuente.includes('Alert.alert'));
  } finally { await caso.cerrar(); }
});

test('error de disponibilidad conserva mensaje y Reintentar recupera la grilla', async () => {
  const caso = await montar({ fallar: true });
  try {
    // FlatList es un host en este arnés: su estado vacío se monta aparte.
    const lista = caso.vista.root.findByType('FlatList');
    let vacio;
    await act(async () => { vacio = create(lista.props.ListEmptyComponent); });
    assert.ok(vacio.root.findAllByType('NativeText').some(n =>
      n.props.accessibilityRole === 'alert' && n.props.children === 'No se pudo consultar la disponibilidad.'));
    const reintentar = vacio.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel === 'Reintentar');
    assert.ok(reintentar);
    caso.recuperar();
    await act(async () => { await reintentar.props.onPress(); });
    assert.equal(caso.vista.root.findByType('FlatList').props.data[0].id, futuro.id);
    await act(async () => { vacio.unmount(); });
  } finally { await caso.cerrar(); }
});

test('ahora no cierra el diálogo y conserva la fecha elegida sin navegar', async () => {
  const caso = await montar();
  try {
    const grillaAntes = caso.vista.root.findByType('FlatList').props.data;
    await act(async () => { await caso.fila(futuro).props.onPress(); });
    await act(async () => { caso.vista.root.findByType('DialogoAviso').props.onCerrar(); });
    assert.equal(caso.vista.root.findAllByType('DialogoAviso').length, 0);
    assert.deepEqual(caso.navegaciones, []);
    assert.deepEqual(caso.vista.root.findByType('FlatList').props.data, grillaAntes);
  } finally { await caso.cerrar(); }
});

test('iniciar sesión navega solo al confirmar, sin reservar automáticamente', async () => {
  const caso = await montar();
  try {
    await act(async () => { await caso.fila(futuro).props.onPress(); });
    await act(async () => { caso.vista.root.findByType('DialogoAviso').props.onConfirmar(); });
    assert.deepEqual(caso.navegaciones, ['/login']);
    assert.equal(caso.vista.root.findAllByType('DialogoAviso').length, 0);
  } finally { await caso.cerrar(); }
});

test('turnos pasados y ocupados están deshabilitados y anuncian su estado', async () => {
  const caso = await montar();
  try {
    const pasado = { ...futuro, fecha: '2000-01-15' };
    const fila = caso.fila(pasado);
    assert.equal(fila.props.disabled, true);
    assert.equal(fila.props.accessibilityState.disabled, true);
    assert.ok(fila.props.accessibilityLabel.includes('no reservable'));
    assert.equal(caso.fila({ ...futuro, estado: 'reservado' }).props.disabled, true);
    assert.equal(caso.fila(futuro).props.disabled, false);
    // El handler revalida el horario aunque la vista haya quedado desactualizada.
    await act(async () => { await fila.props.onPress(); });
    const aviso = caso.vista.root.findByType('DialogoAviso').props;
    assert.equal(aviso.accionPrincipal, 'Entendido');
    assert.equal(aviso.accionSecundaria, undefined);
    assert.deepEqual(caso.navegaciones, []);
  } finally { await caso.cerrar(); }
});

test('diálogo tiene controles de 48 dp, cierre con Atrás y tema oscuro sin dependencias nuevas', async () => {
  const dark = createUiEnvironment('dark');
  const { DialogoAviso } = cargar('src/components/DialogoAviso.tsx', {
    'react-native': { ...nativos, Platform: { OS: 'web' }, useColorScheme: () => 'dark' },
    './ui': dark.ui,
    '../theme': dark.theme,
  });
  let cerrados = 0;
  let confirmados = 0;
  let vista;
  try {
    await act(async () => { vista = create(React.createElement(DialogoAviso, {
      titulo: 'Ingresá para reservar', mensaje: 'Mensaje', accionPrincipal: 'Iniciar sesión',
      accionSecundaria: 'Ahora no', onCerrar: () => cerrados++, onConfirmar: () => confirmados++,
    })); });
    const modal = vista.root.findByType('Modal');
    assert.equal(modal.props.animationType, 'none');
    modal.props.onRequestClose();
    assert.equal(cerrados, 1);
    const acciones = vista.root.findAllByType('Pressable');
    for (const accion of acciones) {
      assert.equal(accion.props.accessibilityRole, 'button');
      assert.equal(accion.props.style({ pressed: false })[0].minHeight, 48);
    }
    acciones[0].props.onPress();
    assert.equal(confirmados, 1);
    const surface = vista.root.findAllByType('View').find(n => n.props.accessibilityViewIsModal);
    assert.equal(Object.assign({}, ...surface.props.style.filter(Boolean)).backgroundColor, dark.theme.darkColors.surface);
  } finally { if (vista) await act(async () => vista.unmount()); }
});
