import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Mapa } from '../src/components/Mapa';
import { Button, ScrollScreen, Text } from '../src/components/ui';
import { useSinRed } from '../src/hooks/useSinRed';
import { agruparComplejos, puntosDeEspacios, type PuntoMapa } from '../src/mapa/modelo';
import { obtenerEspacios, obtenerEspaciosLocales } from '../src/services/espacios';
import { obtenerPuntosLocales, guardarPuntosLocales } from '../src/services/mapas';

export default function MapaScreen() {
  const [puntos, setPuntos] = useState<PuntoMapa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const sinRed = useSinRed();

  useFocusEffect(useCallback(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    async function cargar() {
      const cache = await obtenerEspaciosLocales().catch(() => []);
      const guardados = puntosDeEspacios(cache.filter(e => e.activo));
      if (!guardados.length) guardados.push(...await obtenerPuntosLocales());
      if (!activo) return;
      setPuntos(agruparComplejos(guardados));
      try {
        if (sinRed) return;
        const { datos, local } = await obtenerEspacios();
        const ubicaciones = puntosDeEspacios(datos.filter(e => e.activo));
        if (!activo) return;
        setPuntos(agruparComplejos(ubicaciones));
        if (!local) void guardarPuntosLocales(ubicaciones);
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : 'No pudimos cargar los complejos.');
      } finally {
        if (activo) setCargando(false);
      }
    }
    void cargar();
    return () => { activo = false; };
  }, [intento, sinRed]));

  return <ScrollScreen>
    {error && <>
      <Text tone="danger" accessibilityRole="alert">{error}</Text>
      <Button title="Reintentar" variant="secondary" onPress={() => setIntento(n => n + 1)} />
    </>}
    {cargando && !puntos.length ? <ActivityIndicator accessibilityLabel="Cargando complejos" />
      : !error || puntos.length > 0 ? <Mapa puntos={puntos} /> : null}
  </ScrollScreen>;
}
