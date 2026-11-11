import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Image, ActivityIndicator, ScrollView } from 'react-native';
import { Button, Chip, PressableSurface, Screen, StateView, Text, uiLayout } from '../src/components/ui';
import { layout, radius, spacing, useTheme } from '../src/theme';
import { useRouter } from 'expo-router';
import { obtenerEspacios, obtenerDeportes } from '../src/services/espacios';
import type { Deporte } from '../src/tipos';
import { Espacio } from '../src/tipos';
import { Mapa } from '../src/components/Mapa';
import { agruparComplejos, puntosDeEspacios, PuntoMapa } from '../src/mapa/modelo';
import { guardarPuntosLocales, obtenerPuntosLocales } from '../src/services/mapas';
import { seleccionarCanchasDeEjemplo } from '../src/canchas/modelo';
import { fotoDeCancha } from '../src/canchas/imagenes';

export default function CatalogoScreen() {
  const { colors } = useTheme();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [filtroDeporte, setFiltroDeporte] = useState<string>('todos');
  const [filtroComplejo, setFiltroComplejo] = useState<string>('todos');
  const [cargando, setCargando] = useState(true);
  const [puntosLocales, setPuntosLocales] = useState<PuntoMapa[]>([]);
  const [errorCarga, setErrorCarga] = useState(false);
  const [desdeCache, setDesdeCache] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      const locales = await obtenerPuntosLocales();
      if (!activo) return;
      setPuntosLocales(locales);
      try {
        const resultado = await obtenerEspacios();
        const data = seleccionarCanchasDeEjemplo(resultado.datos);
        if (!activo) return;
        setEspacios(data);
        setDesdeCache(resultado.local);
        setErrorCarga(false);
        const disponibles = await obtenerDeportes();
        if (activo) setDeportes(disponibles);
        const puntos = puntosDeEspacios(data);
        void guardarPuntosLocales(puntos);
        setPuntosLocales(puntos);
      } catch {
        if (activo) { setErrorCarga(true); setDesdeCache(false); }
      } finally {
        if (activo) setCargando(false);
      }
    };
    void cargar();
    return () => { activo = false; };
  }, []);

  const complejosDisponibles = [
    'todos', 
    ...new Set(
      espacios
        .map(e => e.complejo)
        .filter(c => c && c.trim() !== '' && c !== '—' && c !== '-')
    )
  ];

  const espaciosFiltrados = espacios.filter(e => {
    const cumpleDeporte = filtroDeporte === 'todos' || e.deporteId === filtroDeporte;
    const cumpleComplejo = filtroComplejo === 'todos' || e.complejo === filtroComplejo;
    return cumpleDeporte && cumpleComplejo;
  });

  return (
    <Screen>
      
      <View style={styles.filters}>
      <Text variant="label" tone="muted">Filtrar por deporte</Text>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {['todos', ...new Set(espacios.map(e => e.deporteId))].map(dep => (
            <Chip
              key={dep} 
              selected={filtroDeporte === dep}
              onPress={() => setFiltroDeporte(dep)}
            >
              {dep === 'todos' ? 'Todos' : deportes.find(d => d.id === dep)?.nombre ?? dep.replace('dep-', '').toUpperCase()}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <Text variant="label" tone="muted">Filtrar por complejo</Text>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {complejosDisponibles.map(comp => (
            <Chip
              key={comp} 
              selected={filtroComplejo === comp}
              onPress={() => setFiltroComplejo(comp)}
            >
              {comp === 'todos' ? 'Todos' : comp}
            </Chip>
          ))}
        </ScrollView>
      </View>
      </View>

      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={uiLayout.listContent}
        data={espaciosFiltrados}
        keyExtractor={item => item.id}
        ListHeaderComponent={<View style={uiLayout.section}>
          {cargando && <ActivityIndicator accessibilityLabel="Consultando catálogo" color={colors.primary} />}
          {desdeCache && <Text tone="warning">Sin conexión. Mostramos el catálogo guardado; el mapa usa las ubicaciones descargadas.</Text>}
          {errorCarga && <Text tone="danger">No se pudo consultar el catálogo. El mapa muestra únicamente coordenadas guardadas anteriormente.</Text>}
          <Button variant="secondary" accessibilityRole="button" accessibilityState={{ expanded: mostrarMapa }}
            onPress={() => setMostrarMapa(v => !v)} title={mostrarMapa ? 'Ocultar mapa de complejos' : 'Ver mapa de complejos'} />
          {mostrarMapa && <Mapa puntos={agruparComplejos(errorCarga || desdeCache || cargando ? puntosLocales : puntosDeEspacios(espaciosFiltrados))} />}
        </View>}
        ListEmptyComponent={!cargando ? <StateView><Text tone="muted">{errorCarga ? 'Catálogo no disponible. Podés consultar las ubicaciones guardadas.' : 'No hay espacios que coincidan con los filtros.'}</Text></StateView> : null}
        renderItem={({ item }) => {
          const foto = fotoDeCancha(item);
          return (
            <PressableSurface
              style={styles.card}
              onPress={() => router.push({ pathname: '/espacio/[id]', params: { id: item.id } })}
            >
              {foto && <Image source={foto} style={styles.image} accessibilityLabel={`Foto de ${item.nombre}`} />}
              <View style={styles.info}>
                <Text variant="subtitle">{item.nombre}</Text>

                <Text variant="label" tone="muted">
                  {item.complejo && item.complejo !== '—' ? `${item.complejo} • ` : ''}
                  {item.superficie || 'Superficie no especificada'}
                </Text>
                <Text variant="label" tone="muted">{item.iluminacion ? 'Con iluminación' : 'Sin iluminación'}</Text>

                <Text numeric variant="action" tone="primary">
                  {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(item.precioPorHora)} / hora
                </Text>
              </View>
            </PressableSurface>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { padding: spacing.xl, gap: spacing.sm },
  filterRow: { alignItems: 'center', gap: spacing.sm },
  card: { padding: spacing.none, overflow: 'hidden', borderRadius: radius.card },
  image: { width: '100%', aspectRatio: layout.mediaRatio },
  info: { padding: spacing.lg, gap: spacing.sm },
});
