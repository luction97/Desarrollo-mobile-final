const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

/** Carga un archivo TS del proyecto con dependencias controladas, sin red ni BD. */
function cargarModulo(archivo, dependencias) {
  const fuente = fs.readFileSync(path.join(__dirname, '..', '..', archivo), 'utf8');
  const { outputText } = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((nombre) => {
    if (Object.hasOwn(dependencias, nombre)) return dependencias[nombre];
    if (['react', 'react/jsx-runtime'].includes(nombre)) return require(nombre);
    throw new Error(`Dependencia sin controlar: ${nombre}`);
  }, modulo, modulo.exports);
  return modulo.exports;
}

module.exports = { cargarModulo };
