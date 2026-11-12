import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Surface, Text, uiLayout } from './ui';
import { borders, layout, radius, spacing, useTheme } from '../theme';

/** Opciones de filtrado por deporte y complejo. */
export interface OpcionesFiltro {
  deporte: string;
  complejo: string;
}

interface FiltrosCanchaProps {
  visible: boolean;
  deportes: { id: string; nombre: string }[];
  complejos: string[];
  canchas: { deporteId: string; complejo: string }[];
  seleccion: OpcionesFiltro;
  onAplicar: (seleccion: OpcionesFiltro) => void;
  onCerrar: () => void;
}

/**
 * Hoja inferior de filtros: se abre sobre la pantalla y aplica al confirmar,
 * como los filtros de las aplicaciones móviles comerciales. Los cambios en borrador
 * no alteran la lista hasta que se confirma.
 */
export function FiltrosCancha({ visible, deportes, complejos, canchas, seleccion, onAplicar, onCerrar }: FiltrosCanchaProps) {
  const { colors } = useTheme();
  const [borrador, setBorrador] = useState<OpcionesFiltro>(seleccion);

  useEffect(() => { if (visible) setBorrador(seleccion); }, [visible, seleccion]);

  const total = canchas.filter(c =>
    (borrador.deporte === 'todos' || c.deporteId === borrador.deporte) &&
    (borrador.complejo === 'todos' || c.complejo === borrador.complejo)).length;

  const limpiar = () => {
    const vacio = { deporte: 'todos', complejo: 'todos' };
    setBorrador(vacio);
    onAplicar(vacio);
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
    <View style={[styles.velo, { backgroundColor: colors.scrim }]}>
      <Surface style={styles.hoja} accessibilityViewIsModal>
        <View style={uiLayout.row}>
          <Text variant="title" accessibilityRole="header" style={uiLayout.grow}>Filtros</Text>
          <Button size="sm" variant="ghost" title="Cerrar" onPress={onCerrar} />
        </View>
        <ScrollView contentContainerStyle={styles.opciones} showsVerticalScrollIndicator={false}>
          <Text variant="label" tone="muted">Deporte</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal} accessibilityLabel="Filtrar por deporte">
            <Chip accessibilityLabel="Todos los deportes" selected={borrador.deporte === 'todos'}
              onPress={() => setBorrador(actual => ({ ...actual, deporte: 'todos' }))}>Todos</Chip>
            {deportes.map(d => <Chip key={d.id} accessibilityLabel={d.nombre} selected={borrador.deporte === d.id}
              onPress={() => setBorrador(actual => ({ ...actual, deporte: d.id }))}>{d.nombre}</Chip>)}
          </ScrollView>
          <Text variant="label" tone="muted">Complejo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal} accessibilityLabel="Filtrar por complejo">
            {complejos.map(c => <Chip key={c} accessibilityLabel={c === 'todos' ? 'Todos los complejos' : c}
              selected={borrador.complejo === c}
              onPress={() => setBorrador(actual => ({ ...actual, complejo: c }))}>
              {c === 'todos' ? 'Todos los complejos' : c}
            </Chip>)}
          </ScrollView>
        </ScrollView>
        <View style={uiLayout.row}>
          <Button variant="ghost" title="Limpiar" onPress={limpiar} />
          <Button style={uiLayout.grow} title={`Ver ${total} ${total === 1 ? 'cancha' : 'canchas'}`}
            onPress={() => { onAplicar(borrador); onCerrar(); }} />
        </View>
      </Surface>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'flex-end' },
  hoja: {
    width: '100%', maxWidth: layout.formWidth, alignSelf: 'center',
    borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card,
    borderCurve: borders.curve, gap: spacing.md, paddingBottom: spacing.xl,
  },
  opciones: { gap: spacing.sm, paddingBottom: spacing.md },
  horizontal: { gap: spacing.xs },
});
