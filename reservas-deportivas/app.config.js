// Mantiene app.json como configuración base y aplica valores del entorno de build.
module.exports = ({ config }) => {
  const perfil = process.env.APP_VARIANT;
  if (perfil === 'preview' || perfil === 'production') {
    const valor = process.env.EXPO_PUBLIC_API_URL?.trim();
    if (!valor) throw new Error(`El perfil ${perfil} requiere EXPO_PUBLIC_API_URL.`);
    const url = URL.canParse(valor) ? new URL(valor) : null;
    const dominio = url?.hostname ?? '';
    if (url?.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || !dominio.includes('.') || /^[\d.]+$/.test(dominio) || /\.(localhost|local|internal)\.?$/i.test(dominio)) {
      throw new Error(`El perfil ${perfil} requiere un dominio público HTTPS para la API.`);
    }
  }

  return config;
};
