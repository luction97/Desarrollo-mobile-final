const fs = require('node:fs');
const path = require('node:path');

const root = path.dirname(require.resolve('leaflet/package.json'));
const target = path.join(__dirname, '../assets/leaflet');
fs.mkdirSync(target, { recursive: true });
const javascript = fs.readFileSync(path.join(root, 'dist/leaflet.js'), 'utf8')
  .replace(/\/\/# sourceMappingURL=.*$/gm, '');
const css = fs.readFileSync(path.join(root, 'dist/leaflet.css'), 'utf8')
  .replace(/url\(images\/([^)]+)\)/g, (_, name) =>
    `url(data:image/png;base64,${fs.readFileSync(path.join(root, 'dist/images', name)).toString('base64')})`);
const content = JSON.stringify({ version: require('leaflet/package.json').version, javascript, css });
const file = path.join(target, 'bundle.json');
if (process.argv.includes('--check')) {
  if (fs.readFileSync(file, 'utf8') !== content) throw new Error('Regenerar assets de Leaflet.');
} else {
  fs.writeFileSync(file, content);
  fs.copyFileSync(path.join(root, 'LICENSE'), path.join(target, 'LICENSE'));
}
