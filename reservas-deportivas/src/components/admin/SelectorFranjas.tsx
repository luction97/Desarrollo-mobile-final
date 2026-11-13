import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui';
import { spacing, useTheme } from '../../theme';

/** Las dieciséis franjas horarias de la jornada (08:00 a 24:00). */
export const FRANJAS_HORARIAS = Array.from({ length: 16 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`);
const CIERRE = '24:00';

interface SelectorFranjasProps {
  /** Inicio elegido, "HH:MM". */
  inicio: string | null;
  /** Fin elegido, "HH:MM". */
  fin: string | null;
  onChange: (inicio: string | null, fin: string | null) => void;
}

/**
 * Selección de franja horaria con toques: primero la hora de inicio y después
 * la de fin. Sin escribir horas a mano y con las franjas de la API a la vista.
 */
export function SelectorFranjas({ inicio, fin, onChange }: SelectorFranjasProps) {
  const { colors } = useTheme();

  const elegir = (franja: string) => {
    if (!inicio || (inicio && fin)) { onChange(franja, null); return; }
    if (franja <= inicio) { onChange(franja, null); return; }
    onChange(inicio, franja);
  };

  const enRango = (franja: string) => {
    if (!inicio || !fin) return false;
    return franja >= inicio && franja < fin;
  };

  return <View style={styles.contenedor}>
    <Text variant="caption" tone="muted">
      {inicio && !fin ? `Inicio ${inicio} · Elegí la hora de fin`
        : inicio && fin ? `${inicio}–${fin} · Tocá otra hora para cambiar el inicio`
          : 'Elegí la hora de inicio y después la de fin'}
    </Text>
    <View style={styles.grilla}>
      {[...FRANJAS_HORARIAS, CIERRE].map(franja => {
        const esInicio = inicio === franja;
        const esFin = fin === franja;
        const dentro = enRango(franja);
        const soloCierre = franja === CIERRE;
        const deshabilitada = soloCierre && (!inicio || !!fin);
        return <Pressable key={franja} accessibilityRole="button" disabled={deshabilitada}
          accessibilityLabel={`Franja de ${franja}`}
          accessibilityHint={soloCierre ? 'Solo como hora de fin' : undefined}
          accessibilityState={{ selected: esInicio || esFin, disabled: deshabilitada }}
          onPress={() => elegir(franja)}
          style={[styles.franja, {
            backgroundColor: esInicio || esFin ? colors.primary : dentro ? colors.primaryContainer : 'transparent',
            borderColor: esInicio || esFin ? colors.primary : colors.border,
            opacity: deshabilitada && !esFin ? 0.45 : 1,
          }]}>
          <Text variant="label" style={{ color: esInicio || esFin ? colors.onPrimary : colors.text }}>{franja}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.xs },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  franja: {
    width: '23%', minHeight: 44, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 12, paddingVertical: spacing.xs,
  },
});
