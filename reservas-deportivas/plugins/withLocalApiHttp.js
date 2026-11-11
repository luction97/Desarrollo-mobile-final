const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const { isIP } = require('node:net');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

const RESOURCE = '@xml/local_api_network_security';

function createNetworkSecurityConfig(apiUrl) {
  const url = new URL(apiUrl);
  if (url.username || url.password) throw new Error('La URL de API no debe contener credenciales.');
  if (url.protocol === 'https:') return null;
  const host = url.hostname;
  const partes = host.split('.').map(Number);
  const privada = isIP(host) === 4 && (
    partes[0] === 10 ||
    (partes[0] === 172 && partes[1] >= 16 && partes[1] <= 31) ||
    (partes[0] === 192 && partes[1] === 168)
  );
  if (url.protocol !== 'http:' || !privada) {
    throw new Error('El preview HTTP requiere una IPv4 privada de la LAN; para otros destinos usá HTTPS.');
  }
  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">${host}</domain>
  </domain-config>
</network-security-config>
`;
}

function withLocalApiHttp(config, { apiUrl }) {
  const xml = createNetworkSecurityConfig(apiUrl);
  if (!xml) return config;

  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) throw new Error('No se encontró application en AndroidManifest.');
    application.$ ??= {};
    const existente = application.$['android:networkSecurityConfig'];
    if (existente && existente !== RESOURCE) {
      throw new Error('Existe otra política de red Android. Revisarla antes de reemplazarla.');
    }
    application.$['android:networkSecurityConfig'] = RESOURCE;
    return mod;
  });

  return withDangerousMod(config, ['android', async (mod) => {
    // Se ejecuta durante CNG; nunca se editan directorios nativos manualmente.
    const dir = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'local_api_network_security.xml'), xml, 'utf8');
    return mod;
  }]);
}

module.exports = withLocalApiHttp;
module.exports.createNetworkSecurityConfig = createNetworkSecurityConfig;
