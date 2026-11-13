const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cargarModulo: cargar } = require('./helpers/cargar-modulo.cjs');

function almacenamiento() {
  const archivos = new Map();
  const preferencias = new Map();
  let incompleta = false;
  class Directory {
    constructor(raiz, nombre) { this.uri = raiz + '/' + nombre; }
    create() {}
  }
  class File {
    constructor(directorio, nombre) { this.uri = nombre ? directorio.uri + '/' + nombre : directorio; }
    get exists() { return archivos.has(this.uri); }
    get size() { return archivos.get(this.uri) ?? 0; }
    delete() { archivos.delete(this.uri); }
    copy(destino) { archivos.set(destino.uri, this.size); }
    static async downloadFileAsync(url, destino) {
      archivos.set(destino.uri, 128);
      if (incompleta) throw new Error('Se interrumpió la descarga.');
      return destino;
    }
  }
  const medios = cargar('src/services/medios.ts', {
    'expo-file-system': { Directory, File, Paths: { document: 'file:///documentos' } },
    './preferencias': { default: {
      getItem: async clave => preferencias.get(clave),
      setItem: async (clave, valor) => preferencias.set(clave, valor),
      removeItem: async clave => preferencias.delete(clave),
    } },
  });
  return { medios, archivos, preferencias, interrumpir: () => { incompleta = true; } };
}

test('recupera fotos y videos descargados y borra solamente el archivo seleccionado', async () => {
  const { medios, archivos } = almacenamiento();
  const foto = await medios.guardarDescarga('imagen', 'esp-1', 'https://ejemplo.test/foto.jpg');
  const video = await medios.guardarDescarga('video', 'esp-1', 'https://ejemplo.test/video.mp4');
  assert.equal(await medios.obtenerDescarga('imagen', 'esp-1', 'https://ejemplo.test/foto.jpg'), foto);
  assert.equal(await medios.obtenerDescarga('video', 'esp-1', 'https://ejemplo.test/video.mp4'), video);
  assert.equal(await medios.obtenerDescarga('video', 'esp-1', 'https://ejemplo.test/otro.mp4'), null);
  await medios.borrarDescarga('imagen', 'esp-1', 'https://ejemplo.test/foto.jpg');
  assert.equal(archivos.has(foto), false);
  assert.equal(archivos.has(video), true);
});

test('guarda el video grabado por el personal con la direccion del archivo subido', async () => {
  const { medios, archivos } = almacenamiento();
  archivos.set('file:///grabado.mp4', 2048);
  const uri = await medios.guardarVideoGrabado('esp-01', 'file:///grabado.mp4', 'https://ejemplo.test/videos/cancha.mp4');
  const guardado = await medios.obtenerVideoGrabado('esp-01');
  assert.equal(guardado?.url, 'https://ejemplo.test/videos/cancha.mp4');
  assert.equal(guardado?.uri, uri);
  assert.equal(archivos.has(uri), true);
  await medios.borrarVideoGrabado('esp-01');
  assert.equal(await medios.obtenerVideoGrabado('esp-01'), null);
  assert.equal(archivos.has(uri), false);
});

test('una descarga interrumpida no deja el parcial ni registra una descarga lista', async () => {
  const { medios, archivos, preferencias, interrumpir } = almacenamiento();
  interrumpir();
  await assert.rejects(medios.guardarDescarga('video', 'esp-1', 'https://ejemplo.test/video.mp4'), /interrumpió/);
  assert.equal(archivos.size, 0);
  assert.equal(preferencias.size, 0);
});
