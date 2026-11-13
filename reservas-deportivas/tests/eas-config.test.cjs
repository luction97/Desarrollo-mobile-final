const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app.json').expo;
const eas = require('../eas.json');
const configure = require('../app.config');

function conEntorno(valores, tarea) {
  const anterior = {};
  for (const [clave, valor] of Object.entries(valores)) {
    anterior[clave] = process.env[clave];
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
  try { return tarea(); } finally {
    for (const [clave, valor] of Object.entries(anterior)) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
  }
}

test('preview es APK release con URL explícita y sin dev client', () => {
  assert.equal(eas.build.preview.android.buildType, 'apk');
  assert.equal(eas.build.preview.developmentClient, false);
  assert.equal(eas.build.preview.distribution, 'internal');
  assert.equal(eas.build.preview.node, '24.15.0');
  assert.equal(app.android.package, 'com.luction97.reservasdeportivas');
  assert.ok(app.android.permissions.includes('android.permission.RECORD_AUDIO'));
  assert.ok(!app.android.blockedPermissions?.includes('android.permission.RECORD_AUDIO'));
  const plugins = Object.fromEntries(app.plugins.filter(Array.isArray).map(([nombre, config]) => [nombre, config]));
  assert.equal(plugins['expo-camera'].recordAudioAndroid, true);
  assert.ok(plugins['expo-camera'].microphonePermission);
  assert.notEqual(plugins['expo-image-picker'].microphonePermission, false);
  assert.equal(eas.build.preview.environment, 'preview');
  assert.match(eas.build.preview.env.EXPO_PUBLIC_API_URL, /^https:\/\/[^/]+$/);
  conEntorno({ ...eas.build.preview.env, EXPO_PUBLIC_API_URL: 'https://api.example.org' }, () => {
    assert.equal(configure({ config: app }), app);
  });
});

test('preview sin URL falla temprano en lugar de generar localhost silenciosamente', () => {
  conEntorno({ APP_VARIANT: 'preview', EXPO_PUBLIC_API_URL: undefined }, () => {
    assert.throws(() => configure({ config: app }), /requiere EXPO_PUBLIC_API_URL/);
  });
});

test('preview y producción rechazan destinos locales, HTTP o credenciales', () => {
  for (const perfil of ['preview', 'production']) {
    for (const url of ['https://localhost', 'https://192.168.1.20', 'http://api.example.org', 'https://api.local', 'https://u:p@api.example.org']) {
      conEntorno({ APP_VARIANT: perfil, EXPO_PUBLIC_API_URL: url }, () => {
        assert.throws(() => configure({ config: app }), /dominio público HTTPS/);
      });
    }
  }
});

test('mapas no necesitan configuración ni claves de Google', () => {
  conEntorno({ APP_VARIANT: undefined, GOOGLE_MAPS_ANDROID_API_KEY: 'valor-de-prueba-no-valido' }, () => {
    const config = configure({ config: app });
    assert.equal(config.android.config?.googleMaps?.apiKey, undefined);
    assert.equal(app.android.config?.googleMaps?.apiKey, undefined);
  });
});
