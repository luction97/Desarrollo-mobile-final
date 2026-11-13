import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Text, uiLayout } from './ui';
import { HojaModal } from './admin/HojaModal';

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

  return <HojaModal visible={visible} titulo="Filtros" onCerrar={onCerrar}
    pie={<View style={uiLayout.row}>
      <Button variant="ghost" title="Limpiar" onPress={limpiar} />
      <Button style={uiLayout.grow} title={`Ver ${total} ${total === 1 ? 'cancha' : 'canchas'}`}
        onPress={() => { onAplicar(borrador); onCerrar(); }} />
    </View>}>
    <Text variant="label" tone="muted">Deporte</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      <Chip accessibilityLabel="Todos los deportes" selected={borrador.deporte === 'todos'}
        onPress={() => setBorrador(actual => ({ ...actual, deporte: 'todos' }))}>Todos</Chip>
      {deportes.map(d => <Chip key={d.id} accessibilityLabel={d.nombre} selected={borrador.deporte === d.id}
        onPress={() => setBorrador(actual => ({ ...actual, deporte: d.id }))}>{d.nombre}</Chip>)}
    </ScrollView>
    <Text variant="label" tone="muted">Complejo</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {complejos.map(c => <Chip key={c} accessibilityLabel={c === 'todos' ? 'Todos los complejos' : c}
        selected={borrador.complejo === c}
        onPress={() => setBorrador(actual => ({ ...actual, complejo: c }))}>
        {c === 'todos' ? 'Todos los complejos' : c}
      </Chip>)}
    </ScrollView>
  </HojaModal>;
}

const styles = StyleSheet.create({
  chips: { gap: 4 },
});
