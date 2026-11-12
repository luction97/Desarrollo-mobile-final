const oyentes = new Set<() => void>();
let cola = Promise.resolve();

export function cambiarSesion<T>(cambio: () => Promise<T>): Promise<T> {
  const tarea = cola.then(cambio);
  cola = tarea.then(() => undefined, () => undefined);
  return tarea;
}

export function escucharSesionInvalidada(oyente: () => void) {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}

export function invalidarSesion() {
  oyentes.forEach(oyente => oyente());
}
