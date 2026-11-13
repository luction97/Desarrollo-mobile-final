import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { PressableSurface, Text, uiLayout } from '../ui';
import { HojaModal } from './HojaModal';
import { nombreCorto } from '../../canchas/modelo';
import { precioLegible } from '../../utils/dinero';
import { spacing, useTheme } from '../../theme';
import type { Espacio } from '../../tipos';

interface SelectorCanchaProps {
  espacios: Espacio[];
  /** Canchas elegidas. */
  seleccionados: string[];
  onChange: (ids: string[]) => void;
  etiqueta?: string;
  /** Permite elegir varias canchas (bloqueos). */
  multiple?: boolean;
}

/**
 * Selector compacto de cancha: muestra la elección en un solo botón y abre
 * una hoja con la lista completa, sin tiras horizontales recortadas.
 */
export function SelectorCancha({ espacios, seleccionados, onChange, etiqueta = 'Cancha', multiple = false }: SelectorCanchaProps) {
  const { colors } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const elegidas = espacios.filter(e => seleccionados.includes(e.id));
  const resumen = elegidas.length === 0
    ? 'Elegí una cancha'
    : elegidas.length === 1 ? nombreCorto(elegidas[0])
      : `${elegidas.length} canchas`;

  const alternar = (id: string) => {
    if (!multiple) { onChange([id]); setAbierto(false); return; }
    onChange(seleccionados.includes(id) ? seleccionados.filter(actual => actual !== id) : [...seleccionados, id]);
  };

  return <View style={styles.contenedor}>
    <Text variant="label" tone="muted">{etiqueta}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${etiqueta}: ${resumen}`}
      onPress={() => setAbierto(true)} style={[styles.boton, { borderColor: colors.border }]}>
      <Text variant="label" style={uiLayout.grow}>{resumen}</Text>
      <Ionicons name="chevron-down" size={spacing.lg} color={colors.primary} />
    </Pressable>

    <HojaModal visible={abierto} titulo={etiqueta} onCerrar={() => setAbierto(false)}
      pie={multiple ? <PressableSurface accessibilityRole="button" accessibilityLabel="Confirmar canchas"
        selected onPress={() => setAbierto(false)} style={styles.confirmar}>
        <Text variant="label" tone="primary">Listo</Text>
      </PressableSurface> : undefined}>
      <View style={styles.lista}>
        {espacios.map(espacio => {
          const elegida = seleccionados.includes(espacio.id);
          return <PressableSurface key={espacio.id} accessibilityRole="button" selected={elegida}
            accessibilityLabel={`Elegir ${nombreCorto(espacio)}`}
            onPress={() => alternar(espacio.id)} style={styles.fila}>
            <View style={uiLayout.grow}>
              <Text variant="label">{nombreCorto(espacio)}</Text>
              <Text variant="caption" tone="muted">
                {espacio.complejo && espacio.complejo !== '—' ? `${espacio.complejo} · ` : ''}{precioLegible(espacio.precioPorHora)}/h
              </Text>
            </View>
            {elegida && <Ionicons name={multiple ? 'checkmark-circle' : 'checkmark'} size={spacing.xl} color={colors.primary} />}
          </PressableSurface>;
        })}
      </View>
    </HojaModal>
  </View>;
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.xs },
  boton: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    minHeight: 48,
  },
  lista: { gap: spacing.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  confirmar: { alignItems: 'center', paddingVertical: spacing.md },
});
