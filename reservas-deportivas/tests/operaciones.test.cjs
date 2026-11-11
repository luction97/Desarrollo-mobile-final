const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Ejecuta el código TypeScript real con dependencias controladas, sin red ni BD.
function cargar(archivo, dependencias) {
  const fuente = fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');
  const { outputText } = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((nombre) => {
    if (Object.hasOwn(dependencias, nombre)) return dependencias[nombre];
    throw new Error(`Dependencia sin controlar: ${nombre}`);
  }, modulo, modulo.exports);
  return modulo.exports;
}

test('ingreso envía código y cancha seleccionada, no una cancha fija', async () => {
  let peticion;
  const reserva = { estado: 'cumplida', ingresoEn: '2026-11-10T12:00:00-03:00' };
  const { operacionesService: servicio } = cargar('src/services/operaciones.ts', {
    './api': { api: { post: async (...args) => { peticion = args; return reserva; } } },
  });
  assert.equal(await servicio.registrarIngreso(' QR-PRUEBA ', 'esp-06'), reserva);
  assert.deepEqual(peticion, ['/ingresos', { codigoQr: 'QR-PRUEBA', espacioId: 'esp-06' }]);
});

test('ingreso incompleto no hace peticiones', async () => {
  const { operacionesService: servicio } = cargar('src/services/operaciones.ts', {
    './api': { api: { post: () => assert.fail('No debe llamar a la API') } },
  });
  await assert.rejects(servicio.registrarIngreso('QR', ''), /cancha/);
  await assert.rejects(servicio.registrarIngreso(' ', 'esp-02'), /código/);
});

test('errores de API se conservan para mostrarlos al operador', async () => {
  const error = Object.assign(new Error('Esa reserva es para otra cancha.'), { codigo: 'CODIGO_DE_OTRO_ESPACIO' });
  const { operacionesService: servicio } = cargar('src/services/operaciones.ts', {
    './api': { api: { post: async () => { throw error; } } },
  });
  await assert.rejects(servicio.registrarIngreso('QR', 'esp-03'), (err) => err === error);
});

test('bloqueo envía espacioIds como arreglo y motivo sin espacios', async () => {
  let peticion;
  const { operacionesService: servicio } = cargar('src/services/operaciones.ts', {
    './api': { api: { post: async (...args) => { peticion = args; } } },
  });
  await servicio.bloquearDia('esp-02', '2026-11-10', ' Lluvia ');
  assert.deepEqual(peticion, ['/bloqueos', { espacioIds: ['esp-02'], fecha: '2026-11-10', motivo: 'Lluvia' }]);
  await assert.rejects(servicio.bloquearDia('esp-02', '2026-11-10', ' '), /motivo/);
});

test('logout elimina token y usuario antes de finalizar', async () => {
  const eliminados = [];
  const { authService } = cargar('src/services/auth.ts', {
    './api': {},
    './storage': { storage: { deleteItem: async (clave) => { eliminados.push(clave); } } },
  });
  await authService.logout();
  assert.deepEqual(eliminados, ['token', 'usuario']);
});

test('el acceso del personal rechaza web: no simula biometría', async () => {
  const { autenticarPersonal } = cargar('src/services/biometria.ts', {
    'expo-local-authentication': {},
    'react-native': { Platform: { OS: 'web' } },
  });
  await assert.rejects(autenticarPersonal(), /dispositivo móvil/);
});

test('sin biometría configurada no se habilita el escáner', async () => {
  let solicitudes = 0;
  const { autenticarPersonal } = cargar('src/services/biometria.ts', {
    'expo-local-authentication': {
      hasHardwareAsync: async () => true,
      isEnrolledAsync: async () => false,
      authenticateAsync: async () => { solicitudes++; },
    },
    'react-native': { Platform: { OS: 'android' } },
  });
  await assert.rejects(autenticarPersonal(), /Configurá huella/);
  assert.equal(solicitudes, 0);
});

test('cancelar biometría devuelve false y el acceso no usa PIN como atajo', async () => {
  let opciones;
  const { autenticarPersonal } = cargar('src/services/biometria.ts', {
    'expo-local-authentication': {
      hasHardwareAsync: async () => true,
      isEnrolledAsync: async () => true,
      authenticateAsync: async (datos) => { opciones = datos; return { success: false, error: 'user_cancel' }; },
    },
    'react-native': { Platform: { OS: 'android' } },
  });
  assert.equal(await autenticarPersonal(), false);
  assert.equal(opciones.disableDeviceFallback, true);
});

test('biometría válida confirma la identidad del personal', async () => {
  const { autenticarPersonal } = cargar('src/services/biometria.ts', {
    'expo-local-authentication': {
      hasHardwareAsync: async () => true,
      isEnrolledAsync: async () => true,
      authenticateAsync: async () => ({ success: true }),
    },
    'react-native': { Platform: { OS: 'android' } },
  });
  assert.equal(await autenticarPersonal(), true);
});

test('pantalla: restringe roles, selecciona cancha y evita escaneos duplicados', async () => {
  const React = require('react');
  const { create, act } = require('react-test-renderer');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const espacio = { id: 'esp-06', nombre: 'Cancha de prueba', complejo: 'Complejo', activo: true };
  let usuario = { id: 'usr-prueba', rol: 'jugador' };
  const permisos = { granted: true };
  const consultarPermiso = async () => permisos;
  let solicitudes = 0;
  let confirmar;
  let proximoError = null;
  let cambiarEstado;
  const vibraciones = [];
  const Screen = cargar('app/scanner.tsx', {
    'react': React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', Button: 'Button', FlatList: 'FlatList',
      Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View', Linking: {},
      AppState: { addEventListener: (_evento, callback) => { cambiarEstado = callback; return { remove() {} }; } },
      StyleSheet: { create: (datos) => datos, hairlineWidth: 1 },
    },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [permisos, consultarPermiso, consultarPermiso] },
    'expo-haptics': {
      NotificationFeedbackType: { Success: 'success', Error: 'error' },
      notificationAsync: async (tipo) => { vibraciones.push(tipo); },
    },
    'expo-router': { useFocusEffect: (callback) => React.useEffect(callback, [callback]) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../src/context/AuthContext': { useAuth: () => ({ usuario, cargando: false }) },
    '../src/services/biometria': { autenticarPersonal: async () => true },
    '../src/services/operaciones': {
      operacionesService: {
        obtenerEspacios: async () => [espacio],
        registrarIngreso: (codigo, cancha) => {
          solicitudes++;
          assert.equal(codigo, 'QR-PRUEBA');
          assert.equal(cancha, espacio.id);
          if (proximoError) return Promise.reject(proximoError);
          return new Promise((resolve) => { confirmar = resolve; });
        },
      },
    },
  }).default;

  let pantalla;
  try {
    await act(async () => { pantalla = create(React.createElement(Screen)); });
    assert.equal(pantalla.root.findAllByType('CameraView').length, 0);
    assert.equal(pantalla.root.findAllByType('FlatList').length, 0);

    usuario = { ...usuario, rol: 'encargado' };
    await act(async () => { pantalla.update(React.createElement(Screen)); });
    await act(async () => {
      pantalla.root.findByType('FlatList').props.renderItem({ item: espacio }).props.onPress();
    });
    const habilitar = () => pantalla.root.findAllByType('Button').find((b) => b.props.title === 'Confirmar identidad y escanear');
    await act(async () => { await habilitar().props.onPress(); });
    const escanear = pantalla.root.findByType('CameraView').props.onBarcodeScanned;
    let primero;
    await act(async () => {
      primero = escanear({ data: 'QR-PRUEBA' });
      await escanear({ data: 'QR-PRUEBA' });
    });
    assert.equal(solicitudes, 1);
    assert.deepEqual(vibraciones, []); // No anuncia éxito al leer el QR.
    assert.equal(pantalla.root.findAllByType('CameraView').length, 0);

    await act(async () => {
      confirmar({ estado: 'cumplida', ingresoEn: '2026-11-10T12:00:00-03:00' });
      await primero;
    });
    assert.deepEqual(vibraciones, ['success']);
    assert.equal(pantalla.root.findAllByType('CameraView').length, 0);
    assert.ok(habilitar()); // Reautenticación antes del próximo escaneo.

    await act(async () => { await habilitar().props.onPress(); });
    assert.equal(pantalla.root.findAllByType('CameraView').length, 1);
    await act(async () => { cambiarEstado('background'); });
    assert.equal(pantalla.root.findAllByType('CameraView').length, 0);
    await act(async () => { cambiarEstado('active'); });
    assert.ok(habilitar());

    proximoError = new Error('Esa reserva es para otra cancha.');
    await act(async () => { await habilitar().props.onPress(); });
    await act(async () => {
      await pantalla.root.findByType('CameraView').props.onBarcodeScanned({ data: 'QR-PRUEBA' });
    });
    assert.deepEqual(vibraciones, ['success', 'error']);
    assert.equal(pantalla.root.findByProps({ accessibilityRole: 'alert' }).props.children, proximoError.message);
    assert.equal(pantalla.root.findAllByType('CameraView').length, 0);
  } finally {
    if (pantalla) await act(async () => { pantalla.unmount(); });
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
