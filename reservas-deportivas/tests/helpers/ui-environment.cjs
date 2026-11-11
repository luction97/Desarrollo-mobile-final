const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function createUiEnvironment(scheme = 'light') {
  const cache = new Map();
  const native = {
    Text: 'NativeText', View: 'View', TextInput: 'TextInput', Pressable: 'Pressable',
    ScrollView: 'UiScrollView', ActivityIndicator: 'ActivityIndicator',
    StyleSheet: { create: styles => styles }, useColorScheme: () => scheme,
  };
  function load(file) {
    const base = path.resolve(__dirname, '../..', file);
    const resolved = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]
      .find(p => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!resolved) throw new Error(`Archivo no encontrado: ${file}`);
    if (cache.has(resolved)) return cache.get(resolved);
    const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const module = { exports: {} };
    cache.set(resolved, module.exports);
    new Function('require', 'exports', code)(name => {
      if (name === 'react-native') return native;
      if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      if (name.startsWith('.')) return load(path.resolve(path.dirname(resolved), name));
      throw new Error(`Dependencia inesperada: ${name}`);
    }, module.exports);
    return module.exports;
  }
  return { theme: load('src/theme'), ui: load('src/components/ui') };
}

module.exports = { createUiEnvironment };
