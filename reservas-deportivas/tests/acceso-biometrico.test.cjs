const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { cargarModulo: cargar } = require('./helpers/cargar-modulo.cjs');
const { createUiEnvironment } = require('./helpers/ui-environment.cjs');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const entorno = createUiEnvironment();

const jugador = {
  id: 'usr-1', nombre: 'Jugador Demo', email: 'jugador@villaguay.demo.ar', telefono: '3435000000',
  rol: 'jugador', espaciosFavoritos: [], ausencias: 0, cancelacionesTardias: 0,
};

/**
 * Monta el AuthContext con la sesión, la biometría y las preferencias controladas.
 */
async function montarSesion({
  sesion = null, vigente = true, biometria = false, autenticacion = false,
  accesoActivado = false, ofertaHecha = false,
} = {}) {
  const llamadas = [];
  let cerrada = false;
  const preferencias = new Map();
  const { AuthProvider, useAuth } = cargar('src/context/AuthContext.tsx', {
    react: { ...React, default: React },
    'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
    '../hooks/useSinRed': { useSinRed: () => false },
    '../services/auth': {
      authService: {
        obtenerPerfil: async () => sesion,
        restaurarSesion: async () => { llamadas.push('restaurarSesion'); return { usuario: sesion, vigente }; },
        logout: async () => { cerrada = true; llamadas.push('logout'); },
        login: async (email, contrasena) => { llamadas.push(['login', email, contrasena]); return sesion ?? jugador; },
        registro: async () => sesion ?? jugador,
        actualizar: async () => undefined,
      },
    },
    '../services/biometria': {
      biometriaDisponible: async () => biometria,
      autenticarConBiometria: async () => { llamadas.push('biometria'); return autenticacion; },
    },
    '../services/accesoBiometrico': {
      accesoBiometricoActivado: async id => { llamadas.push(['acceso', id]); return accesoActivado; },
      activarAccesoBiometrico: async id => { llamadas.push(['activar', id]); },
      desactivarAccesoBiometrico: async id => { llamadas.push(['desactivar', id]); },
      marcarOfertaBiometrica: async id => { llamadas.push(['oferta', id]); },
      ofertaBiometricaHecha: async () => ofertaHecha,
    },
    '../services/favoritos': { favoritosService: {} },
    '../services/notificaciones': { notificacionesService: { registrarDispositivo: async () => false, cancelarTodos: async () => undefined } },
    '../services/reservas': { prepararRecordatoriosGuardados: async () => undefined },
    '../services/sesionEventos': { escucharSesionInvalidada: () => () => {} },
    '../utils/sesion': { debeBloquearSesion: () => false },
  });
  function Consumidor() { contexto = useAuth(); return null; }
  let contexto;
  let vista;
  await act(async () => { vista = create(React.createElement(AuthProvider, null, React.createElement(Consumidor))); });
  await act(async () => { await new Promise(resolve => setImmediate(resolve)); });
  return {
    get contexto() { return contexto; },
    llamadas,
    get cerrada() { return cerrada; },
    cerrar: async () => { if (vista) await act(async () => { vista.unmount(); }); },
  };
}

test('sin sesión guardada la app abre como invitado y no pide biometría', async () => {
  const caso = await montarSesion({ biometria: true });
  try {
    assert.equal(caso.contexto.cargando, false);
    assert.equal(caso.contexto.usuario, null);
    assert.equal(caso.contexto.pideReingreso, false);
    assert.equal(caso.contexto.ofreceBiometria, false);
  } finally { await caso.cerrar(); }
});

test('con sesión guardada sin acceso biométrico la app entra directo', async () => {
  const caso = await montarSesion({ sesion: jugador, vigente: true, biometria: true, accesoActivado: false });
  try {
    assert.equal(caso.contexto.usuario?.id, jugador.id);
    assert.equal(caso.contexto.pideReingreso, false);
    assert.equal(caso.contexto.accesoBiometrico, false);
  } finally { await caso.cerrar(); }
});

test('con acceso biométrico activo la app pide el reingreso y no abre la sesión', async () => {
  const caso = await montarSesion({ sesion: jugador, vigente: true, biometria: true, accesoActivado: true });
  try {
    assert.equal(caso.contexto.usuario, null);
    assert.equal(caso.contexto.usuarioGuardado?.id, jugador.id);
    assert.equal(caso.contexto.pideReingreso, true);
    assert.equal(caso.contexto.accesoBiometrico, true);
    assert.ok(!caso.llamadas.includes('biometria'), 'No se pide la huella al abrir, sólo se ofrece el botón');
  } finally { await caso.cerrar(); }
});

test('la biometría abre una sesión vigente y, si falla, no abre nada', async () => {
  const caso = await montarSesion({ sesion: jugador, vigente: true, biometria: true, accesoActivado: true, autenticacion: true });
  try {
    await act(async () => { await caso.contexto.desbloquear(); });
    assert.equal(caso.contexto.usuario?.id, jugador.id);
    assert.equal(caso.contexto.pideReingreso, false);
  } finally { await caso.cerrar(); }

  const fallido = await montarSesion({ sesion: jugador, vigente: true, biometria: true, accesoActivado: true, autenticacion: false });
  try {
    const ok = await fallido.contexto.desbloquear();
    assert.equal(ok, false);
    assert.equal(fallido.contexto.usuario, null);
    assert.equal(fallido.contexto.pideReingreso, true);
  } finally { await fallido.cerrar(); }
});

test('un token vencido borra la sesión y exige credenciales', async () => {
  const caso = await montarSesion({ sesion: jugador, vigente: false, biometria: true, accesoActivado: true });
  try {
    assert.equal(caso.contexto.usuario, null);
    assert.equal(caso.contexto.usuarioGuardado, null);
    assert.equal(caso.contexto.pideReingreso, false);
  } finally { await caso.cerrar(); }
});

test('la biometría no abre una sesión vencida', async () => {
  const caso = await montarSesion({ sesion: jugador, vigente: false, biometria: true, accesoActivado: true, autenticacion: true });
  try {
    const ok = await caso.contexto.desbloquear();
    assert.equal(ok, false);
    assert.equal(caso.contexto.usuario, null);
    assert.equal(caso.contexto.pideReingreso, false);
  } finally { await caso.cerrar(); }
});

test('tras ingresar se ofrece una sola vez activar el acceso biométrico', async () => {
  const caso = await montarSesion({ biometria: true });
  try {
    await act(async () => { await caso.contexto.login('jugador@villaguay.demo.ar', 'Villaguay2026'); });
    assert.equal(caso.contexto.usuario?.id, jugador.id);
    assert.equal(caso.contexto.ofreceBiometria, true);
    await act(async () => { await caso.contexto.resolverOferta(false); });
    assert.equal(caso.contexto.ofreceBiometria, false);
    assert.ok(caso.llamadas.some(([nombre]) => nombre === 'oferta'));
    assert.ok(!caso.llamadas.some(([nombre]) => nombre === 'activar'));
  } finally { await caso.cerrar(); }
});

test('activar la oferta guarda la preferencia y deja el acceso biométrico activo', async () => {
  const caso = await montarSesion({ biometria: true, autenticacion: true });
  try {
    await act(async () => { await caso.contexto.login('jugador@villaguay.demo.ar', 'Villaguay2026'); });
    await act(async () => { await caso.contexto.resolverOferta(true); });
    assert.equal(caso.contexto.accesoBiometrico, true);
    assert.ok(caso.llamadas.some(([nombre]) => nombre === 'activar'));
  } finally { await caso.cerrar(); }
});

test('sin biometría en el dispositivo no se ofrece nada y la sesión sigue siendo normal', async () => {
  const caso = await montarSesion({ biometria: false });
  try {
    await act(async () => { await caso.contexto.login('jugador@villaguay.demo.ar', 'Villaguay2026'); });
    assert.equal(caso.contexto.usuario?.id, jugador.id);
    assert.equal(caso.contexto.ofreceBiometria, false);
  } finally { await caso.cerrar(); }
});

test('cerrar sesión borra la sesión y vuelve al ingreso tradicional', async () => {
  const caso = await montarSesion({ sesion: jugador, vigente: true, biometria: true, accesoActivado: true });
  try {
    await act(async () => { await caso.contexto.logout(); });
    assert.equal(caso.cerrada, true);
    assert.equal(caso.contexto.usuario, null);
    assert.equal(caso.contexto.usuarioGuardado, null);
    assert.equal(caso.contexto.pideReingreso, false);
    assert.equal(caso.contexto.accesoBiometrico, false);
  } finally { await caso.cerrar(); }
});


test('el acceso biométrico se puede activar y desactivar desde la cuenta', async () => {
  const caso = await montarSesion({ sesion: jugador, vigente: true, biometria: true, autenticacion: true });
  try {
    let ok = false;
    await act(async () => { ok = await caso.contexto.activarAcceso(); });
    assert.equal(ok, true);
    assert.equal(caso.contexto.accesoBiometrico, true);
    await act(async () => { await caso.contexto.desactivarAcceso(); });
    assert.equal(caso.contexto.accesoBiometrico, false);
    assert.ok(caso.llamadas.some(([nombre]) => nombre === 'desactivar'));
  } finally { await caso.cerrar(); }
});

test('la pantalla de ingreso ofrece el reingreso con biometría y no muestra los campos', async () => {
  const casos = await montarSesion({ sesion: jugador, vigente: true, biometria: true, accesoActivado: true });
  try {
    const Pantalla = cargar('app/login.tsx', {
      react: { ...React, default: React },
      'react-native': { KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' }, ScrollView: 'ScrollView', StyleSheet: { create: s => s }, View: 'View', Image: 'Image' },
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
      'expo-router': { useLocalSearchParams: () => ({}), useRouter: () => ({ replace() {}, push() {} }) },
      '../assets/branding/icon_app-reservas_deportivas_1024.png': 1,
      '../src/components/ui': entorno.ui, '../src/theme': entorno.theme,
      '../src/context/AuthContext': { useAuth: () => casos.contexto },
    }).default;
    let vista;
    await act(async () => { vista = create(React.createElement(Pantalla)); });
    const texto = JSON.stringify(vista.toJSON());
    assert.ok(texto.includes('Bienvenido de nuevo'));
    assert.ok(texto.includes('Ingresar con huella o rostro'));
    assert.ok(texto.includes('Usar contra'));
    assert.ok(!texto.includes('Iniciar sesi'), 'En el reingreso no se muestran los campos');
    await act(async () => { vista.unmount(); });
  } finally { await casos.cerrar(); }
});

test('la pantalla de ingreso tradicional muestra el formulario y ningún botón biométrico', async () => {
  const casos = await montarSesion({ biometria: true });
  try {
    const Pantalla = cargar('app/login.tsx', {
      react: { ...React, default: React },
      'react-native': { KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' }, ScrollView: 'ScrollView', StyleSheet: { create: s => s }, View: 'View', Image: 'Image' },
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
      'expo-router': { useLocalSearchParams: () => ({}), useRouter: () => ({ replace() {}, push() {} }) },
      '../assets/branding/icon_app-reservas_deportivas_1024.png': 1,
      '../src/components/ui': entorno.ui, '../src/theme': entorno.theme,
      '../src/context/AuthContext': { useAuth: () => casos.contexto },
    }).default;
    let vista;
    await act(async () => { vista = create(React.createElement(Pantalla)); });
    const texto = JSON.stringify(vista.toJSON());
    assert.ok(texto.includes('Iniciar sesi'));
    assert.ok(texto.includes('Ingresar'));
    assert.ok(texto.includes('Crear cuenta'));
    assert.ok(!texto.includes('huella'), 'El primer ingreso no ofrece biometría');
    await act(async () => { vista.unmount(); });
  } finally { await casos.cerrar(); }
});
