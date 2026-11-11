// Mantiene app.json como configuración base y aplica valores del entorno de build.
module.exports = ({ config }) => {
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  const preview = process.env.APP_VARIANT === 'preview';
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (preview && !apiUrl) {
    throw new Error('El perfil preview requiere EXPO_PUBLIC_API_URL.');
  }

  return {
    ...config,
    android: {
      ...config.android,
      ...(mapsKey ? {
        config: {
          ...config.android?.config,
          googleMaps: { ...config.android?.config?.googleMaps, apiKey: mapsKey },
        },
      } : {}),
    },
    plugins: [
      ...(config.plugins ?? []),
      ...(preview ? [['./plugins/withLocalApiHttp', { apiUrl }]] : []),
    ],
  };
};
