const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tmpdir } = require('node:os');
const app = require('../app.json').expo;
const eas = require('../eas.json');
const configure = require('../app.config');
const { createNetworkSecurityConfig } = require('../plugins/withLocalApiHttp');

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
  assert.ok(app.android.blockedPermissions.includes('android.permission.RECORD_AUDIO'));
  assert.ok(!app.android.permissions.includes('android.permission.RECORD_AUDIO'));
  conEntorno(eas.build.preview.env, () => {
    const config = configure({ config: app });
    const plugin = config.plugins.find((p) => Array.isArray(p) && p[0] === './plugins/withLocalApiHttp');
    assert.equal(plugin[1].apiUrl, eas.build.preview.env.EXPO_PUBLIC_API_URL);
  });
});

test('preview sin URL falla temprano en lugar de generar localhost silenciosamente', () => {
  conEntorno({ APP_VARIANT: 'preview', EXPO_PUBLIC_API_URL: undefined }, () => {
    assert.throws(() => configure({ config: app }), /requiere EXPO_PUBLIC_API_URL/);
  });
});

test('otros perfiles no habilitan la excepción HTTP del preview', () => {
  conEntorno({ APP_VARIANT: undefined }, () => {
    assert.ok(!configure({ config: app }).plugins.some((p) => Array.isArray(p) && p[0] === './plugins/withLocalApiHttp'));
  });
});

test('mapas no necesitan configuración ni claves de Google', () => {
  conEntorno({ APP_VARIANT: undefined, GOOGLE_MAPS_ANDROID_API_KEY: 'valor-de-prueba-no-valido' }, () => {
    const config = configure({ config: app });
    assert.equal(config.android.config?.googleMaps?.apiKey, undefined);
    assert.equal(app.android.config?.googleMaps?.apiKey, undefined);
  });
});

test('HTTP solo para el host IPv4 privado indicado, sin subdominios ni permiso global', () => {
  for (const host of ['192.168.0.249', '10.0.2.2', '172.16.0.1', '172.31.255.254']) {
    const xml = createNetworkSecurityConfig(`http://${host}:3000`);
    assert.ok(xml.includes('<base-config cleartextTrafficPermitted="false" />'));
    assert.ok(xml.includes(`<domain includeSubdomains="false">${host}</domain>`));
    assert.equal((xml.match(/<domain /g) ?? []).length, 1);
  }
});

test('rechaza destinos HTTP públicos, loopback del teléfono y credenciales en URL', () => {
  for (const url of ['http://example.com', 'http://8.8.8.8', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://172.32.0.1', 'ftp://192.168.0.249', 'http://usr:clave@192.168.0.249:3000', 'https://usr:clave@example.com']) {
    assert.throws(() => createNetworkSecurityConfig(url));
  }
  assert.equal(createNetworkSecurityConfig('https://example.com'), null);
});

test('plugin apunta al XML, lo escribe durante CNG y no reemplaza otra política', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../plugins/withLocalApiHttp.js'), 'utf8');
  const mods = {};
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', source)((name) => {
    if (name === 'expo/config-plugins') return {
      withAndroidManifest(config, callback) { mods.manifest = callback; return config; },
      withDangerousMod(config, [platform, callback]) { assert.equal(platform, 'android'); mods.write = callback; return config; },
    };
    return require(name);
  }, modulo, modulo.exports);
  modulo.exports({}, { apiUrl: 'http://192.168.0.249:3000' });
  const manifest = { modResults: { manifest: { application: [{ $: {} }] } } };
  mods.manifest(manifest);
  assert.equal(manifest.modResults.manifest.application[0].$['android:networkSecurityConfig'], '@xml/local_api_network_security');
  assert.equal(manifest.modResults.manifest.application[0].$['android:usesCleartextTraffic'], undefined);
  assert.throws(() => mods.manifest({ modResults: { manifest: { application: [{ $: { 'android:networkSecurityConfig': '@xml/otra' } }] } } }), /otra política/);

  const base = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Temp/opencode') : tmpdir();
  const dir = fs.mkdtempSync(path.join(base, 'reservas-network-test-'));
  try {
    await mods.write({ modRequest: { platformProjectRoot: dir } });
    const xml = fs.readFileSync(path.join(dir, 'app/src/main/res/xml/local_api_network_security.xml'), 'utf8');
    assert.equal(xml, createNetworkSecurityConfig('http://192.168.0.249:3000'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
