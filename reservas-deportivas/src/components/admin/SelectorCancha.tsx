import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Text } from '../ui';
import { nombreCorto } from '../../canchas/modelo';
import { spacing } from '../../theme';
import type { Espacio } from '../../tipos';

interface SelectorCanchaProps {
  espacios: Espacio[];
  seleccionado: string;
  onSelect: (id: string) => void;
  etiqueta?: string;
}

/**
 * Selector de cancha con chips horizontales: el personal cambia de cancha sin
 * salir de la tarea que está haciendo (fijas, tarifa, bloqueos).
 */
export function SelectorCancha({ espacios, seleccionado, onSelect, etiqueta = 'Cancha' }: SelectorCanchaProps) {
  if (!espacios.length) return null;
  return <View style={styles.contenedor}>
    <Text variant="label" tone="muted">{etiqueta}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {espacios.map(e => <Chip key={e.id} selected={e.id === seleccionado} onPress={() => onSelect(e.id)}>
        {nombreCorto(e)}
      </Chip>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.xs },
  chips: { gap: spacing.xs },
});
