const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { cargarModulo: cargar } = require('./helpers/cargar-modulo.cjs');
const { createUiEnvironment } = require('./helpers/ui-environment.cjs');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const entorno = createUiEnvironment();

const espacios = [
  { id: 'esp-01', nombre: 'Cancha 1 - Fútbol 5', deporteId: 'dep-futbol5', complejo: 'Polideportivo', precioPorHora: 12000 },
  { id: 'esp-02', nombre: 'Cancha 2 - Fútbol 5', deporteId: 'dep-futbol5', complejo: 'Polideportivo', precioPorHora: 15000 },
  { id: 'esp-03', nombre: 'Cancha de Tenis 1', deporteId: 'dep-tenis', complejo: 'Parque Berduc', precioPorHora: 9000 },
];

const dinero = { precioLegible: valor => `$${valor}` };

function cargarCalendario() {
  return cargar('src/components/admin/CalendarioCancha.tsx', {
    'react-native': { Pressable: 'Pressable', StyleSheet: { create: s => s }, View: 'View', Platform: { OS: 'android' } },
    '@react-native-vector-icons/ionicons': { default: 'Ionicons' },
    '../ui': entorno.ui, '../../theme': entorno.theme,
  });
}

const celdasDelCalendario = vista => vista.root.findAllByType('Pressable')
  .filter(n => /^\d+ de /.test(n.props.accessibilityLabel ?? ''));

test('el calendario elige el día con un toque y no deja fechas pasadas', async () => {
  const { CalendarioCancha } = cargarCalendario();
  let vista;
  try {
    await act(async () => { vista = create(React.createElement(CalendarioCancha, {
      valor: '2026-11-12', onChange: () => {}, minimo: '2026-11-12',
    })); });
    const celdas = celdasDelCalendario(vista);
    assert.ok(celdas.length >= 28);
    const pasada = celdas.find(n => n.props.accessibilityLabel.startsWith('11 de'));
    assert.equal(pasada?.props.accessibilityState.disabled, true);
    const elegida = celdas.find(n => n.props.accessibilityLabel.startsWith('12 de'));
    assert.equal(elegida?.props.accessibilityState.selected, true);
  } finally { if (vista) await act(async () => { vista.unmount(); }); }
});

test('el calendario avisa el día elegido y deja navegar de mes', async () => {
  const { CalendarioCancha } = cargarCalendario();
  let vista;
  let elegida = '';
  try {
    await act(async () => { vista = create(React.createElement(CalendarioCancha, {
      valor: '2026-11-12', onChange: fecha => { elegida = fecha; }, minimo: '2026-11-12',
    })); });
    const dia20 = celdasDelCalendario(vista).find(n => n.props.accessibilityLabel.startsWith('20 de'));
    await act(async () => { dia20.props.onPress(); });
    assert.equal(elegida, '2026-11-20');
    const anterior = vista.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel === 'Mes anterior');
    assert.ok(anterior);
    await act(async () => { anterior.props.onPress(); });
    const titulos = vista.root.findAllByType('NativeText').flatMap(n => n.props.children).filter(c => typeof c === 'string');
    assert.ok(titulos.some(texto => texto.includes('Octubre')), 'Se navega al mes anterior');
  } finally { if (vista) await act(async () => { vista.unmount(); }); }
});

test('las franjas horarias se eligen con dos toques y sin escribir horas', async () => {
  const { SelectorFranjas, FRANJAS_HORARIAS } = cargar('src/components/admin/SelectorFranjas.tsx', {
    'react-native': { Pressable: 'Pressable', StyleSheet: { create: s => s }, View: 'View', Platform: { OS: 'android' } },
    '../ui': entorno.ui, '../../theme': entorno.theme,
  });
  assert.equal(FRANJAS_HORARIAS.length, 16);
  assert.equal(FRANJAS_HORARIAS[0], '08:00');
  assert.equal(FRANJAS_HORARIAS[15], '23:00');

  let inicio = null;
  let fin = null;
  let vista;
  const props = () => ({
    inicio, fin,
    onChange: (nuevoInicio, nuevoFin) => { inicio = nuevoInicio; fin = nuevoFin; },
  });
  const redibujar = async () => {
    await act(async () => { vista.update(React.createElement(SelectorFranjas, props())); });
  };
  try {
    await act(async () => { vista = create(React.createElement(SelectorFranjas, props())); });
    const franja = hora => vista.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel === `Franja de ${hora}`);
    await act(async () => { franja('18:00').props.onPress(); });
    await redibujar();
    assert.equal(inicio, '18:00');
    assert.equal(fin, null);
    await act(async () => { franja('20:00').props.onPress(); });
    await redibujar();
    assert.equal(inicio, '18:00');
    assert.equal(fin, '20:00');
    await act(async () => { franja('09:00').props.onPress(); });
    await redibujar();
    assert.equal(inicio, '09:00');
    assert.equal(fin, null);
  } finally { if (vista) await act(async () => { vista.unmount(); }); }
});

test('el selector de cancha muestra la elegida y abre la hoja con la lista', async () => {
  const { SelectorCancha } = cargar('src/components/admin/SelectorCancha.tsx', {
    'react-native': { Pressable: 'Pressable', StyleSheet: { create: s => s }, View: 'View', Platform: { OS: 'android' } },
    '@react-native-vector-icons/ionicons': { default: 'Ionicons' },
    '../ui': entorno.ui, '../../theme': entorno.theme, './HojaModal': { HojaModal: 'HojaModal' },
    '../../canchas/modelo': { nombreCorto: espacio => espacio.nombre.split(' - ')[0] },
    '../../utils/dinero': dinero,
  });
  let vista;
  try {
    await act(async () => { vista = create(React.createElement(SelectorCancha, {
      espacios, seleccionados: ['esp-02'], onChange: () => {}, multiple: true,
    })); });
    const boton = vista.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel === 'Cancha: Cancha 2');
    assert.ok(boton, 'Se ve la cancha elegida en un solo botón');
    assert.equal(vista.root.findAllByType('HojaModal').length, 1);
  } finally { if (vista) await act(async () => { vista.unmount(); }); }
});

test('el botón de guardar el precio sólo se habilita con un importe válido y distinto', async () => {
  const { PanelTarifa } = cargar('src/components/admin/PanelTarifa.tsx', {
    'react-native': { StyleSheet: { create: s => s }, View: 'View', Platform: { OS: 'android' } },
    '../ui': entorno.ui, '../../theme': entorno.theme, './SelectorCancha': { SelectorCancha: 'SelectorCancha' },
    './HojaModal': { HojaModal: 'HojaModal' }, '../DialogoAviso': { DialogoAviso: 'DialogoAviso' },
    '../../services/operaciones': { operacionesService: {} },
    '../../services/espacios': { guardarEspacioActualizado: async () => undefined },
    '../../services/api': { ApiError: class ApiError extends Error {} },
    '../../utils/dinero': dinero,
  });
  let vista;
  try {
    await act(async () => { vista = create(React.createElement(PanelTarifa, { espacios, puedeCambiar: true })); });
    const boton = () => vista.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel === 'Guardar precio');
    assert.equal(boton()?.props.accessibilityState.disabled, true);
    const campo = vista.root.findAllByType('TextInput').find(n => n.props.accessibilityLabel === 'Nuevo precio por hora');
    assert.ok(campo);
    await act(async () => { campo.props.onChangeText('20000'); });
    assert.equal(boton()?.props.accessibilityState.disabled, false);
    await act(async () => { campo.props.onChangeText('12000'); });
    assert.equal(boton()?.props.accessibilityState.disabled, true, 'El mismo precio no es un cambio');
    await act(async () => { campo.props.onChangeText('0'); });
    assert.equal(boton()?.props.accessibilityState.disabled, true);
  } finally { if (vista) await act(async () => { vista.unmount(); }); }
});
