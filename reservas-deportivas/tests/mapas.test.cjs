const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { createUiEnvironment } = require('./helpers/ui-environment.cjs');
const shared = createUiEnvironment();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function cargar(archivo, dependencias = {}) {
  const codigo = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', codigo)(nombre => {
    if (Object.hasOwn(dependencias, nombre)) return dependencias[nombre];
    if (['react', 'react/jsx-runtime'].includes(nombre)) return require(nombre);
    if (nombre === './ui') return shared.ui;
    if (nombre === '../theme') return shared.theme;
    if (nombre === '../utils/distancias') return distancias;
    throw new Error(`Dependencia sin controlar: ${nombre}`);
  }, modulo, modulo.exports);
  return modulo.exports;
}
const modelo = cargar('src/mapa/modelo.ts');
const distancias = cargar('src/utils/distancias.ts');
const p = { id: 'esp-01', nombre: 'Complejo municipal', latitud: -31.86, longitud: -59.02 };
const { crearDocumentoMapa } = cargar('src/mapa/documento.ts', {
  './modelo': modelo, '../../assets/leaflet/bundle.json': { default: require('../assets/leaflet/bundle.json') },
});

test('coordenadas inválidas no entran al mapa ni a enlaces externos', () => {
  for (const punto of [{ ...p, latitud: NaN }, { ...p, longitud: 181 }, { ...p, latitud: 90 }, { ...p, id: '' }]) {
    assert.equal(modelo.puntoValido(punto), false);
    assert.deepEqual(modelo.enlacesDestino(punto, 'android'), []);
  }
  assert.equal(modelo.puntoValido(p), true);
  assert.equal(modelo.coordenadasValidas({ latitud: 0, longitud: 0 }), true);
});

test('agrupa complejos coincidentes sin colapsar sedes con coordenadas diferentes', () => {
  const puntos = [p, { ...p, id: 'esp-02' }, { ...p, id: 'esp-03', longitud: -59.03 }];
  assert.equal(modelo.agruparComplejos(puntos).length, 2);
  assert.equal(modelo.puntosDeEspacios([{ id: p.id, nombre: 'Cancha', complejo: '—', coordenadas: p }])[0].nombre, 'Cancha');
});

test('puente valida estados, identificadores y enlaces; no abre URLs arbitrarias', () => {
  const leer = m => modelo.leerMensajeMapa(JSON.stringify(m), [p]);
  assert.deepEqual(leer({ tipo: 'seleccion', id: p.id }), { tipo: 'seleccion', id: p.id });
  assert.equal(leer({ tipo: 'seleccion', id: 'otro' }), null);
  assert.equal(leer({ tipo: 'enlace', url: 'javascript:alert(1)' }), null);
  assert.equal(leer({ tipo: 'enlace', url: 'https://www.openstreetmap.org.ejemplo.com' }), null);
  assert.equal(leer({ tipo: 'estado', estado: 'cualquier-cosa' }), null);
  assert.equal(modelo.leerMensajeMapa('x'.repeat(2049), [p]), null);
  assert.equal(modelo.leerMensajeMapa('no-json', [p]), null);
  assert.equal(leer({ tipo: 'enlace', url: modelo.ATRIBUCION_URL }).url, modelo.ATRIBUCION_URL);
});

test('HTML incorpora Leaflet, CSS e imágenes locales sin CDN, y escapa datos', () => {
  const html = crearDocumentoMapa([{ ...p, nombre: '</script><script>alert(1)</script>' }], null, true);
  assert.ok(html.includes('Leaflet 1.9.4'));
  assert.ok(html.includes('data:image/png;base64,'));
  assert.ok(html.includes('https://tile.openstreetmap.org/{z}/{x}/{y}.png'));
  assert.ok(html.includes('keepBuffer:0'));
  assert.ok(!/<script\s+src=|<link\s/i.test(html));
  assert.ok(!html.includes('</script><script>alert(1)'));
  assert.ok(html.includes('textContent=p.nombre'));
  assert.ok(html.includes('if(datos.sinRed){estado(\'error\');return;}'));
  assert.ok(html.includes('connect-src \'none\''));
});

test('Cómo llegar usa intents/plataforma y respaldo OSM, sin servicios de rutas', () => {
  const android = modelo.enlacesDestino({ ...p, nombre: 'Cancha & plaza (sur)' }, 'android');
  assert.ok(android[0].startsWith('geo:0,0?q=-31.86,-59.02('));
  assert.ok(android[0].includes('%26'));
  assert.ok(android[1].startsWith('https://www.openstreetmap.org/'));
  assert.ok(modelo.enlacesDestino(p, 'ios')[0].includes('daddr=-31.86,-59.02'));
  assert.equal(modelo.enlacesDestino(p, 'web').length, 1);
});

test('caché guarda solo puntos públicos y recupera sin red; tolera corrupción/fallos', async () => {
  let dato = 'invalido';
  const Storage = { getItem: async () => dato, setItem: async (_, valor) => { dato = valor; } };
  const servicio = cargar('src/services/mapas.ts', { './mapaStorage': { default: Storage }, '../mapa/modelo': modelo });
  assert.deepEqual(await servicio.obtenerPuntosLocales(), []);
  await servicio.guardarPuntosLocales([p]);
  assert.deepEqual(await servicio.obtenerPuntosLocales(), [p]);
  await servicio.guardarPuntosLocales([{ ...p, nombre: 'Nuevo nombre' }]);
  assert.equal((await servicio.obtenerPuntosLocales()).length, 1);
  assert.equal((await servicio.obtenerPuntosLocales())[0].nombre, 'Nuevo nombre');
  Storage.setItem = async () => { throw new Error('disco'); };
  await assert.doesNotReject(() => servicio.guardarPuntosLocales([p]));
});

test('WebView conserva caché HTTP, identifica la app y no permite archivos ni navegación remota', () => {
  const { VisorMapa } = cargar('src/components/mapa/VisorMapa.tsx', {
    'react-native-webview': { WebView: 'WebView' }, '../../mapa/modelo': modelo,
    '../../theme/colors': shared.theme,
  });
  const vista = VisorMapa({ html: '<html/>', onMensaje() {}, onError() {} });
  assert.equal(vista.props.cacheEnabled, true);
  assert.equal(vista.props.cacheMode, 'LOAD_DEFAULT');
  assert.ok(vista.props.applicationNameForUserAgent.includes('Deporturnos/'));
  assert.equal(vista.props.geolocationEnabled, false);
  assert.equal(vista.props.allowFileAccess, false);
  assert.equal(vista.props.mixedContentMode, 'never');
  assert.equal(vista.props.onShouldStartLoadWithRequest({ url: 'https://ejemplo.com' }), false);
  assert.equal(vista.props.onShouldStartLoadWithRequest({ url: 'about:blank' }), true);
});

test('permiso denegado mantiene mapa/datos y Cómo llegar; la ubicación solo se pide al tocar', async () => {
  let solicitudes = 0;
  const abiertos = [];
  const { Mapa } = cargar('src/components/Mapa.tsx', {
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: s => s },
      Platform: { OS: 'android' }, Linking: { openURL: async url => { abiertos.push(url); }, openSettings: async () => {} } },
    'expo-location': { requestForegroundPermissionsAsync: async () => { solicitudes++; return { status: 'denied', canAskAgain: false }; } },
    'expo-network': { useNetworkState: () => ({ isConnected: false }) },
    '../mapa/documento': { crearDocumentoMapa: () => '<html/>' }, '../mapa/modelo': modelo,
    './mapa/VisorMapa': { VisorMapa: 'VisorMapa' },
  });
  let vista;
  try {
    await act(async () => { vista = create(React.createElement(Mapa, { puntos: [p] })); });
    assert.equal(solicitudes, 0);
    const boton = texto => vista.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel.includes(texto));
    await act(async () => { await boton('Mostrar mi ubicación').props.onPress(); });
    assert.equal(solicitudes, 1);
    assert.equal(vista.root.findAllByType('VisorMapa').length, 1);
    assert.ok(JSON.stringify(vista.toJSON()).includes('Ubicación no autorizada'));
    assert.ok(JSON.stringify(vista.toJSON()).includes('Sin conexión'));
    assert.ok(boton('Abrir ajustes'));
    await act(async () => { await boton('Cómo llegar').props.onPress(); });
    assert.ok(abiertos[0].startsWith('geo:'));
  } finally { if (vista) await act(async () => vista.unmount()); }
});

test('ubicación permitida llega al visor y se puede ocultar; no cambia los puntos del dominio', async () => {
  let posicion;
  const { Mapa } = cargar('src/components/Mapa.tsx', {
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: s => s },
      Platform: { OS: 'android' }, Linking: {} },
    'expo-location': { requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
      hasServicesEnabledAsync: async () => true, Accuracy: { Balanced: 3 },
      getCurrentPositionAsync: async () => ({ coords: { latitude: -31.8, longitude: -59.1 } }) },
    'expo-network': { useNetworkState: () => ({ isConnected: true }) },
    '../mapa/documento': { crearDocumentoMapa: (_, u) => { posicion = u; return '<html/>'; } },
    '../mapa/modelo': modelo, './mapa/VisorMapa': { VisorMapa: 'VisorMapa' },
  });
  let vista;
  const original = { ...p };
  try {
    await act(async () => { vista = create(React.createElement(Mapa, { puntos: [p] })); });
    const boton = texto => vista.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel.includes(texto));
    await act(async () => { await boton('Mostrar mi ubicación').props.onPress(); });
    assert.deepEqual(posicion, { latitud: -31.8, longitud: -59.1 });
    assert.deepEqual(p, original);
    await act(async () => { boton('Ocultar mi ubicación').props.onPress(); });
    assert.equal(posicion, null);
  } finally { if (vista) await act(async () => vista.unmount()); }
});

test('sin handler geo usa respaldo web; si ambos fallan conserva coordenadas y comunica error', async () => {
  const abiertos = [];
  let fallarTodo = false;
  const { Mapa } = cargar('src/components/Mapa.tsx', {
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: s => s },
      Platform: { OS: 'android' }, Linking: { openURL: async url => {
        abiertos.push(url); if (url.startsWith('geo:') || fallarTodo) throw new Error('sin handler');
      } } },
    'expo-location': {}, 'expo-network': { useNetworkState: () => ({ isConnected: true }) },
    '../mapa/documento': { crearDocumentoMapa: () => '<html/>' }, '../mapa/modelo': modelo,
    './mapa/VisorMapa': { VisorMapa: 'VisorMapa' },
  });
  let vista;
  try {
    await act(async () => { vista = create(React.createElement(Mapa, { puntos: [p] })); });
    const boton = () => vista.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel.includes('Cómo llegar'));
    await act(async () => { await boton().props.onPress(); });
    assert.equal(abiertos.length, 2);
    assert.ok(abiertos[1].startsWith('https://www.openstreetmap.org/'));
    fallarTodo = true;
    await act(async () => { await boton().props.onPress(); });
    assert.ok(JSON.stringify(vista.toJSON()).includes('No se pudo abrir una aplicación de mapas'));
    assert.ok(JSON.stringify(vista.toJSON()).includes('-31.860000'));
  } finally { if (vista) await act(async () => vista.unmount()); }
});
