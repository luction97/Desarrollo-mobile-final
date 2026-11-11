const oyentes = new Set<() => void>();

export function escucharSesionInvalidada(oyente: () => void) {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}

export function invalidarSesion() {
  oyentes.forEach(oyente => oyente());
}
