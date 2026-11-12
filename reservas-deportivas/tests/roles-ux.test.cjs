const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { cargarModulo: cargar } = require('./helpers/cargar-modulo.cjs');
const { createUiEnvironment } = require('./helpers/ui-environment.cjs');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const entorno = createUiEnvironment();
const permisos = cargar('src/utils/permisos.ts', {});
const etiquetas = cargar('src/utils/etiquetas.ts', {});
const fechas = cargar('src/utils/fechas.ts', {});
const dinero = cargar('src/utils/dinero.ts', {});
const nativos = {
  View: 'View', Image: 'Image', ScrollView: 'ScrollView', FlatList: 'FlatList',
  ActivityIndicator: 'ActivityIndicator', KeyboardAvoidingView: 'KeyboardAvoidingView',
  StyleSheet: { create: s => s }, Platform: { OS: 'android' },
};
const cancha = {
  id: 'esp-02', nombre: 'Cancha 2', complejo: 'Polideportivo', deporteId: 'dep-futbol5',
  coordenadas: { latitud: -31.86, longitud: -59.02 }, imagenes: ['https://ejemplo.test/cancha.jpg'],
  superficie: 'Sintético', techado: false, iluminacion: true, capacidad: 10, precioPorHora: 12000,
  videoUrl: null, reglas: 'Usar calzado deportivo.', activo: true,
};
const usuario = rol => rol ? { id: 'usr-prueba', rol, nombre: 'Persona', email: 'persona@ejemplo.test', espaciosFavoritos: [], ausencias: 0, cancelacionesTardias: 0 } : null;
const boton = (vista, nombre) => vista.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel === nombre);

test('permisos: jugador reserva; personal gestiona; sólo administrador registra fotos y cambia precios', () => {
  for (const [rol, esperado] of [
    [null, [false, false, false, false]], ['jugador', [true, false, false, false]],
    ['encargado', [false, true, false, false]], ['administrador', [false, true, true, true]],
  ]) assert.deepEqual(Object.values(permisos.permisosDe(usuario(rol))), esperado);
});

async function montarDetalle(rol) {
  let actual = usuario(rol);
  const llamadas = [];
  const player = { replace() {} };
  const foto = async () => { llamadas.push('elegirFoto'); return { canceled: false, assets: [{ uri: 'file:///foto.jpg' }] }; };
  const Pantalla = cargar('app/espacio/[id].tsx', {
    'react-native': nativos,
    'expo-router': { useRouter: () => ({ push() {} }), useLocalSearchParams: () => ({ id: cancha.id }) },
    'expo-video': { useVideoPlayer: () => player, VideoView: 'VideoView' },
    'expo-image-picker': {
      requestCameraPermissionsAsync: async () => { llamadas.push('permiso'); return { granted: true }; },
      launchCameraAsync: foto, launchImageLibraryAsync: foto,
    },
    'expo-haptics': { NotificationFeedbackType: { Success: 'success' }, notificationAsync: async () => {} },
    '../../src/components/ui': entorno.ui,
    '../../src/theme': entorno.theme,
    '../../src/services/espacios': { obtenerEspacio: async () => cancha },
    '../../src/services/medios': {
      obtenerFoto: async () => { llamadas.push('leerFoto'); return 'file:///privada.jpg'; },
      obtenerVideo: async () => null,
      guardarFoto: async () => { llamadas.push('guardarFoto'); return 'file:///nueva.jpg'; },
    },
    '../../src/context/AuthContext': { useAuth: () => ({ usuario: actual }) },
    '../../src/utils/permisos': permisos,
    '../../src/components/Mapa': { Mapa: 'Mapa' },
    '../../src/mapa/modelo': { puntosDeEspacios: () => [] },
    '../../src/services/mapas': { obtenerPuntosLocales: async () => [], guardarPuntosLocales: async () => {} },
    '../../src/components/favoritos': { FavoritoToggle: 'FavoritoToggle' },
    '../../src/utils/dinero': dinero,
    '../../src/canchas/imagenes': { fotoDeCancha: () => ({ uri: cancha.imagenes[0] }) },
  }).default;
  let vista;
  await act(async () => { vista = create(React.createElement(Pantalla)); });
  return { vista, llamadas,
    cambiarRol: async nuevo => { actual = usuario(nuevo); await act(async () => { vista.update(React.createElement(Pantalla)); }); },
    cerrar: async () => { await act(async () => { vista.unmount(); }); },
  };
}

test('jugador, invitado y encargado ven la cancha sin herramientas ni fotos privadas del administrador', async () => {
  for (const rol of [null, 'jugador', 'encargado']) {
    const caso = await montarDetalle(rol);
    try {
      assert.equal(boton(caso.vista, 'Tomar foto'), undefined);
      assert.equal(boton(caso.vista, 'Elegir de la galería'), undefined);
      assert.deepEqual(caso.llamadas, []);
      assert.ok(boton(caso.vista, 'Ver horarios'));
      assert.deepEqual(caso.vista.root.findAllByType('Image').map(n => n.props.source.uri), cancha.imagenes);
      assert.ok(!JSON.stringify(caso.vista.toJSON()).includes('Sin video'));
      assert.ok(!JSON.stringify(caso.vista.toJSON()).includes('dep-futbol5'));
    } finally { await caso.cerrar(); }
  }
});

test('administrador registra una foto local, sin presentar el guardado como una publicación', async () => {
  const caso = await montarDetalle('administrador');
  try {
    assert.ok(JSON.stringify(caso.vista.toJSON()).includes('no se publica para los jugadores'));
    await act(async () => { await boton(caso.vista, 'Tomar foto').props.onPress(); });
    assert.deepEqual(caso.llamadas, ['leerFoto', 'permiso', 'elegirFoto', 'guardarFoto']);
    assert.ok(caso.vista.root.findAllByType('Image').some(n => n.props.source.uri === 'file:///nueva.jpg'));
    await caso.cambiarRol('jugador');
    assert.equal(boton(caso.vista, 'Tomar foto'), undefined);
    assert.ok(!caso.vista.root.findAllByType('Image').some(n => n.props.source.uri.startsWith('file:')));
  } finally { await caso.cerrar(); }
});

test('Perfil distingue historial del jugador y herramientas de gestión del personal', async () => {
  for (const rol of ['jugador', 'encargado', 'administrador']) {
    const Pantalla = cargar('app/(tabs)/perfil.tsx', {
      'react-native': nativos, 'expo-router': { useRouter: () => ({ push() {} }) },
      '../../src/components/ui': entorno.ui, '../../src/theme': entorno.theme,
      '../../src/context/AuthContext': { useAuth: () => ({ usuario: usuario(rol), logout() {}, cargando: false }) },
      '../../src/utils/permisos': permisos, '../../src/utils/etiquetas': etiquetas,
    }).default;
    let vista;
    try {
      await act(async () => { vista = create(React.createElement(Pantalla)); });
      assert.equal(!!boton(vista, 'Gestionar canchas'), rol !== 'jugador');
      assert.equal(!!boton(vista, 'Escanear QR'), rol !== 'jugador');
      assert.equal(JSON.stringify(vista.toJSON()).includes('Tu historial'), rol === 'jugador');
      assert.ok(boton(vista, 'Cerrar sesión'));
    } finally { if (vista) await act(async () => { vista.unmount(); }); }
  }
});

test('Administración: encargado ve fijas sin edición; sólo administrador ve precios', async () => {
  for (const rol of [null, 'jugador', 'encargado', 'administrador']) {
    let consultas = 0;
    const Pantalla = cargar('app/admin.tsx', {
      'react-native': nativos, 'expo-router': { useRouter: () => ({ push() {} }) },
      '../src/components/ui': entorno.ui, '../src/theme': entorno.theme,
      '../src/context/AuthContext': { useAuth: () => ({ usuario: usuario(rol) }) },
      '../src/utils/permisos': permisos, '../src/utils/dinero': dinero,
      '../src/components/DialogoAviso': { DialogoAviso: 'DialogoAviso' },
      '../src/components/admin/BloqueosPanel': { BloqueosPanel: 'BloqueosPanel' },
      '../src/components/admin/FijasPanel': { FijasPanel: 'FijasPanel' },
      '../src/services/espacios': { obtenerEspacios: async () => { consultas++; return { datos: [cancha] }; } },
      '../src/services/operaciones': { operacionesService: {} },
    }).default;
    let vista;
    try {
      await act(async () => { vista = create(React.createElement(Pantalla)); });
      assert.equal(!!boton(vista, 'Actualizar precio'), rol === 'administrador');
      assert.equal(consultas, ['encargado', 'administrador'].includes(rol) ? 1 : 0);
      const panel = vista.root.findAllByType('FijasPanel');
      if (panel.length) assert.equal(panel[0].props.editable, rol === 'administrador');
    } finally { if (vista) await act(async () => { vista.unmount(); }); }
  }
});

test('agenda no consulta reservas ni titulares al entrar como invitado o jugador', async () => {
  for (const rol of [null, 'jugador', 'encargado']) {
    let consultas = 0;
    const Pantalla = cargar('app/agenda.tsx', {
      'react-native': nativos,
      'expo-router': { useRouter: () => ({ push() {} }), useFocusEffect: callback => React.useEffect(callback, [callback]) },
      '../src/components/ui': entorno.ui, '../src/theme': entorno.theme,
      '../src/context/AuthContext': { useAuth: () => ({ usuario: usuario(rol) }) },
      '../src/utils/permisos': permisos, '../src/utils/etiquetas': etiquetas, '../src/utils/fechas': fechas,
      '../src/components/CodigoQr': { CodigoQr: 'CodigoQr' }, '../src/components/DialogoAviso': { DialogoAviso: 'DialogoAviso' },
      '../src/services/espacios': { obtenerEspacios: async () => ({ datos: [cancha] }) },
      '../src/services/operaciones': { operacionesService: { listarReservasDelDia: async () => { consultas++; return []; } } },
    }).default;
    let vista;
    try {
      await act(async () => { vista = create(React.createElement(Pantalla)); });
      assert.equal(consultas, rol === 'encargado' ? 1 : 0);
    } finally { if (vista) await act(async () => { vista.unmount(); }); }
  }
});

test('ruta Mis reservas del personal no consulta datos privados ni ofrece crear o cancelar reservas', async () => {
  let consultas = 0;
  const navegaciones = [];
  const Pantalla = cargar('app/(tabs)/two.tsx', {
    'react-native': nativos,
    'expo-router': { useRouter: () => ({ replace: ruta => navegaciones.push(ruta) }), useFocusEffect: callback => React.useEffect(callback, [callback]) },
    'expo-network': {}, '../../src/components/ui': entorno.ui, '../../src/theme': entorno.theme,
    '../../src/context/AuthContext': { useAuth: () => ({ usuario: usuario('encargado'), cargando: false }) },
    '../../src/utils/permisos': permisos, '../../src/utils/etiquetas': etiquetas,
    '../../src/utils/fechas': fechas, '../../src/utils/dinero': dinero,
    '../../src/components/CodigoQr': { CodigoQr: 'CodigoQr' }, '../../src/components/DialogoAviso': { DialogoAviso: 'DialogoAviso' },
    '../../src/services/reservas': { reservasGuardadas: async () => { consultas++; return []; } },
  }).default;
  let vista;
  try {
    await act(async () => { vista = create(React.createElement(Pantalla)); });
    assert.equal(consultas, 0);
    assert.equal(boton(vista, 'Cancelar reserva'), undefined);
    await act(async () => { boton(vista, 'Ver agenda').props.onPress(); });
    assert.deepEqual(navegaciones, ['/agenda']);
  } finally { if (vista) await act(async () => { vista.unmount(); }); }
});
