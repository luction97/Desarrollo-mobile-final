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
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
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
  ActivityIndicator: 'ActivityIndicator', Button: 'Button', ScrollView: 'ScrollView', Image: 'Image',
  Pressable: 'Pressable', Modal: props => props.visible ? React.createElement('Modal', props, props.children) : null, StyleSheet: { create: s => s },
};
const ahora = new Date('2099-01-15T09:00:00-03:00');
const futuro = { id: 'turno-prueba', espacioId: 'esp-02', fecha: '2099-01-15', inicio: '20:00', fin: '21:00', estado: 'libre', precio: 12000, motivoBloqueo: null };
const espacio = {
  id: 'esp-02', nombre: 'Cancha 2', deporteId: 'dep-futbol5', complejo: 'Polideportivo',
  capacidad: 10, precioPorHora: 12000, imagenes: [], videoUrl: null, reglas: '', activo: true,
};
const fechas = cargar('src/utils/fechas.ts', {});
const modeloCanchas = cargar('src/canchas/modelo.ts', {});
const imagenesCanchas = { fotoDeCancha: () => null, portadaDeEjemplo: () => null };

async function montar({ fallar = false, usuario = null, canchas = [espacio], params = {}, estado = 'libre' } = {}) {
  const navegaciones = [];
  const rutas = [];
  const consultas = [];
  const router = { setParams() {}, push: ruta => { rutas.push(ruta); navegaciones.push(typeof ruta === 'string' ? ruta : ruta.pathname); } };
  const pantalla = cargar('app/(tabs)/index.tsx', {
    'react-native': { ...nativos, FlatList: props => React.createElement('FlatList', props,
      props.ListHeaderComponent, !props.data.length && props.ListEmptyComponent) },
    '@react-native-vector-icons/ionicons': { default: 'Ionicons' },
    'expo-router': {
      useRouter: () => router,
      useFocusEffect: callback => React.useEffect(callback, [callback]),
      useLocalSearchParams: () => params,
    },
    '../../src/services/turnos': { consultarGrilla: async (espacioId, fecha) => {
      consultas.push(espacioId);
      if (fallar) throw new Error('No se pudo consultar la disponibilidad.');
      return { datos: [{ ...futuro, espacioId, fecha, estado }], local: false };
    } },
    '../../src/services/espacios': {
      obtenerEspacios: async () => ({ datos: canchas, local: false }),
      obtenerEspaciosLocales: async () => canchas,
      obtenerDeportesLocales: async () => null,
      obtenerDeportes: async () => [{ id: 'dep-futbol5', nombre: 'Fútbol 5' }, { id: 'dep-tenis', nombre: 'Tenis' }],
    },
    '../../src/canchas/modelo': modeloCanchas,
    '../../src/canchas/imagenes': imagenesCanchas,
    '../../src/services/reservas': { crearReserva: async () => assert.fail('El invitado no debe crear reservas') },
    '../../src/services/api': { ApiError: class ApiError extends Error {} },
    '../../src/services/preferencias': { default: { getItem: async () => null, setItem: async () => {} } },
    '../../src/context/AuthContext': { useAuth: () => ({ usuario, cargando: false, logout: async () => {} }) },
    '../../src/hooks/useSinRed': { useSinRed: () => false },
    '../../src/components/DialogoAviso': { DialogoAviso: 'DialogoAviso' },
    '../../src/components/favoritos': { FavoritoToggle: 'FavoritoToggle' },
    '../../src/components/ReservaDialog': { ReservaDialog: 'ReservaDialog' },
    '../../src/utils/fechas': fechas,
    '../../src/hooks/useHorarioActual': { useHorarioActual: () => ahora },
    '../../src/utils/dinero': cargar('src/utils/dinero.ts', {}),
    '../../src/utils/turnos': cargar('src/utils/turnos.ts', {}),
    '../../src/utils/permisos': cargar('src/utils/permisos.ts', {}),
    '../../src/utils/etiquetas': cargar('src/utils/etiquetas.ts', {}),
  }).default;
  let vista;
  await act(async () => { vista = create(React.createElement(pantalla)); });
  return { vista, navegaciones, consultas, rutas,
    cambiarUsuario: async nuevo => { usuario = nuevo; await act(async () => { vista.update(React.createElement(pantalla)); }); },
    recuperar: () => { fallar = false; },
    fila: turno => vista.root.findByType('FlatList').props.renderItem({ item: turno }),
    cerrar: async () => { await act(async () => vista.unmount()); },
  };
}

test('invitado elige la cantidad antes de iniciar sesión', async () => {
  const caso = await montar();
  try {
    await act(async () => { caso.fila(futuro).props.onPress(); });
    const dialogo = caso.vista.root.findByType('ReservaDialog').props;
    assert.equal(dialogo.requiereIngreso, true);
    assert.equal(dialogo.turno.id, futuro.id);
    assert.deepEqual(caso.navegaciones, []);
  } finally { await caso.cerrar(); }
});

const otraCancha = { ...espacio, id: 'esp-03', nombre: 'Cancha 3', deporteId: 'dep-tenis', complejo: 'Club' };
const jugador = { id: 'usr-prueba', nombre: 'Jugador', rol: 'jugador', espaciosFavoritos: [otraCancha.id] };
const boton = (vista, nombre) => vista.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel === nombre);
const tarjetas = vista => vista.root.findAllByType('Pressable').filter(n => n.props.accessibilityLabel?.startsWith('Ver horarios de '));
const textoVisible = vista => vista.root.findAllByType('NativeText').flatMap(n => n.props.children).flat(Infinity).filter(v => typeof v === 'string').join(' ');
const abrirCatalogo = async vista => {
  const abrir = vista.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel?.startsWith('Cambiar cancha'));
  await act(async () => { abrir.props.onPress(); });
};

test('la selección de cancha cierra el catálogo y actualiza la grilla sin remontarla', async () => {
  const caso = await montar({ canchas: [espacio, otraCancha] });
  try {
    const lista = caso.vista.root.findByType('FlatList');
    assert.equal(tarjetas(caso.vista).length, 0);
    await abrirCatalogo(caso.vista);
    assert.equal(tarjetas(caso.vista)[0].props.accessibilityState.selected, true);
    assert.equal(tarjetas(caso.vista)[1].props.accessibilityState.selected, false);
    await act(async () => { tarjetas(caso.vista)[1].props.onPress(); });
    assert.equal(tarjetas(caso.vista).length, 0);
    assert.equal(lista, caso.vista.root.findByType('FlatList'));
    assert.equal(lista.props.data[0].espacioId, otraCancha.id);
    assert.ok(boton(caso.vista, 'Cambiar cancha. Actual: Cancha 3'));
    const dias = caso.vista.root.findAllByType('Pressable').filter(n => / \d{2}\/\d{2}\/\d{4}$/.test(n.props.accessibilityLabel));
    await act(async () => { dias[1].props.onPress(); });
    assert.equal(lista, caso.vista.root.findByType('FlatList'));
    assert.equal(caso.consultas.at(-1), otraCancha.id);
    await abrirCatalogo(caso.vista);
    assert.equal(tarjetas(caso.vista)[1].props.accessibilityState.selected, true);
  } finally { await caso.cerrar(); }
});

test('Solo favoritos filtra el selector sin cambiar el turno que se está consultando', async () => {
  const caso = await montar({ usuario: jugador, canchas: [espacio, otraCancha] });
  try {
    await abrirCatalogo(caso.vista);
    await act(async () => { boton(caso.vista, 'Solo favoritos').props.onPress(); });
    assert.deepEqual(tarjetas(caso.vista).map(t => t.props.accessibilityLabel), ['Ver horarios de Cancha 3']);
    assert.equal(caso.consultas.at(-1), espacio.id);
    assert.equal(boton(caso.vista, 'Solo favoritos').props.accessibilityState.selected, true);
    await caso.cambiarUsuario({ ...jugador, espaciosFavoritos: [] });
    assert.equal(tarjetas(caso.vista).length, 0);
    assert.equal(caso.vista.root.findByType('FlatList').props.data[0].espacioId, espacio.id);
    assert.ok(textoVisible(caso.vista).includes('Todavía no tenés favoritas'));
    await act(async () => { boton(caso.vista, 'Ver todas las canchas').props.onPress(); });
    assert.equal(tarjetas(caso.vista).length, 2);
  } finally { await caso.cerrar(); }
});

test('favoritos se combina con deporte y complejo y solo consulta la cancha al confirmarla', async () => {
  const caso = await montar({ usuario: jugador, canchas: [espacio, otraCancha] });
  try {
    await abrirCatalogo(caso.vista);
    await act(async () => { boton(caso.vista, 'Solo favoritos').props.onPress(); });
    assert.ok(boton(caso.vista, 'Fútbol 5'), JSON.stringify(caso.vista.root.findAllByType('Pressable').map(n => n.props.accessibilityLabel)));
    await act(async () => { boton(caso.vista, 'Fútbol 5').props.onPress(); });
    assert.equal(tarjetas(caso.vista).length, 0);
    assert.equal(caso.vista.root.findByType('FlatList').props.data[0].espacioId, espacio.id);
    assert.ok(textoVisible(caso.vista).includes('No hay canchas con estos filtros'));
    await act(async () => { boton(caso.vista, 'Ver todas las canchas').props.onPress(); });
    await act(async () => { boton(caso.vista, 'Club').props.onPress(); });
    assert.equal(tarjetas(caso.vista).length, 1);
    await act(async () => { tarjetas(caso.vista)[0].props.onPress(); });
    assert.equal(caso.consultas.at(-1), otraCancha.id);
  } finally { await caso.cerrar(); }
});

test('cerrar sesión quita el filtro privado y vuelve a mostrar todas las canchas', async () => {
  const caso = await montar({ usuario: jugador, canchas: [espacio, otraCancha] });
  try {
    await abrirCatalogo(caso.vista);
    await act(async () => { boton(caso.vista, 'Solo favoritos').props.onPress(); });
    await caso.cambiarUsuario(null);
    assert.equal(boton(caso.vista, 'Solo favoritos'), undefined);
    assert.equal(tarjetas(caso.vista).length, 2);
  } finally { await caso.cerrar(); }
});

test('el personal consulta horarios sin ofrecerle reservar como jugador', async () => {
  for (const rol of ['administrador', 'encargado']) {
    const caso = await montar({ usuario: { ...jugador, rol } });
    try {
      assert.equal(caso.fila(futuro).props.disabled, true);
      await act(async () => { caso.fila(futuro).props.onPress(); });
      assert.equal(caso.vista.root.findAllByType('ReservaDialog').length, 0);
    } finally { await caso.cerrar(); }
  }
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

test('cerrar la reserva conserva la grilla y la selección', async () => {
  const caso = await montar();
  try {
    const grilla = caso.vista.root.findByType('FlatList').props.data;
    await act(async () => { caso.fila(futuro).props.onPress(); });
    await act(async () => { caso.vista.root.findByType('ReservaDialog').props.onCerrar(); });
    assert.equal(caso.vista.root.findAllByType('ReservaDialog').length, 0);
    assert.deepEqual(caso.navegaciones, []);
    assert.deepEqual(caso.vista.root.findByType('FlatList').props.data, grilla);
  } finally { await caso.cerrar(); }
});

const intencion = { espacioId: espacio.id, fecha: futuro.fecha, turnoId: futuro.id, personas: '4' };

test('confirmar como invitado lleva turno y personas al login sin reservar', async () => {
  const caso = await montar();
  try {
    await act(async () => { caso.fila(futuro).props.onPress(); });
    await act(async () => { caso.vista.root.findByType('ReservaDialog').props.onConfirmar(4); });
    assert.deepEqual(caso.rutas, [{ pathname: '/login', params: intencion }]);
  } finally { await caso.cerrar(); }
});

test('volver con sesión recupera la cantidad y el turno si sigue libre', async () => {
  const caso = await montar({ usuario: jugador, params: intencion });
  try {
    const dialogo = caso.vista.root.findByType('ReservaDialog').props;
    assert.equal(dialogo.turno.id, futuro.id);
    assert.equal(dialogo.personasIniciales, 4);
    assert.deepEqual(caso.navegaciones, []);
  } finally { await caso.cerrar(); }
});

test('volver con sesión no recupera un turno que ya se ocupó', async () => {
  const caso = await montar({ usuario: jugador, params: intencion, estado: 'reservado' });
  try {
    assert.equal(caso.vista.root.findAllByType('ReservaDialog').length, 0);
    assert.equal(caso.vista.root.findByType('DialogoAviso').props.titulo, 'Elegí otro horario');
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
