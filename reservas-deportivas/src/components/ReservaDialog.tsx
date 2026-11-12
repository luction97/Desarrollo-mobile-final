import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { Espacio, Turno } from '../tipos';
import { Button, Surface, Text, TextField, uiLayout } from './ui';
import { borders, layout, spacing, useTheme } from '../theme';
import { fechaLegible } from '../utils/fechas';
import { precioLegible } from '../utils/dinero';

interface Props {
  turno: Turno;
  espacio: Espacio;
  deporte: string;
  personasIniciales?: number;
  requiereIngreso?: boolean;
  cargando: boolean;
  error: string | null;
  onConfirmar: (cantidad: number) => void;
  onCerrar: () => void;
}

export function ReservaDialog({ turno, espacio, deporte, personasIniciales = 1, requiereIngreso, cargando, error, onConfirmar, onCerrar }: Props) {
  const { colors } = useTheme();
  const [cantidad, setCantidad] = useState(() => String(personasIniciales));
  const numero = Number(cantidad);
  const valido = Number.isInteger(numero) && numero >= 1 && numero <= espacio.capacidad;
  return <Modal visible transparent animationType="slide" accessibilityLabel="Confirmar reserva" onRequestClose={() => { if (!cargando) onCerrar(); }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.fondo, { backgroundColor: colors.scrim }]}>
      <Surface padding="none" accessibilityViewIsModal style={{ width: '100%', maxWidth: layout.dialogWidth, maxHeight: '100%' }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contenido}>
          <View style={uiLayout.row}>
            <Text variant="title" accessibilityRole="header" style={uiLayout.grow}>Tu reserva</Text>
            <Button title="Cerrar" variant="ghost" size="sm" disabled={cargando} onPress={onCerrar} />
          </View>
          <View style={styles.datos}>
            <Text variant="subtitle">{espacio.nombre}</Text>
            <Text variant="label" tone="muted">{deporte}</Text>
            <Text numeric variant="action">{fechaLegible(turno.fecha)} · {turno.inicio}–{turno.fin}</Text>
          </View>
          <View style={uiLayout.row}>
            <Button title="−" accessibilityLabel="Una persona menos" variant="secondary" disabled={cargando || numero <= 1}
              onPress={() => setCantidad(String(Math.max(1, (Number(cantidad) || 1) - 1)))} />
            <TextField label="Personas" keyboardType="number-pad" value={cantidad} onChangeText={setCantidad}
              editable={!cargando} containerStyle={uiLayout.grow} maxLength={4} />
            <Button title="+" accessibilityLabel="Una persona más" variant="secondary" disabled={cargando || numero >= espacio.capacidad}
              onPress={() => setCantidad(String(Math.min(espacio.capacidad, (Number(cantidad) || 0) + 1)))} />
          </View>
          <Text variant="label" tone="muted">Hasta {espacio.capacidad} personas</Text>
          <View style={[uiLayout.row, styles.total, { borderColor: colors.border }]}>
            <Text variant="label" tone="muted" style={uiLayout.grow}>Se paga en el lugar</Text>
            <Text numeric variant="title" tone="primary">{precioLegible(turno.precio)}</Text>
          </View>
          {error && <Text accessibilityRole="alert" selectable tone="danger">{error}</Text>}
          <Button title={requiereIngreso ? "Ingresar para reservar" : "Confirmar reserva"} loading={cargando} disabled={!valido} onPress={() => onConfirmar(numero)} />
        </ScrollView>
      </Surface>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  fondo: { flex: 1, padding: spacing.md, justifyContent: 'flex-end', alignItems: 'center' },
  contenido: { padding: spacing.lg, gap: spacing.md },
  datos: { gap: spacing.xs },
  total: { borderTopWidth: borders.thin, paddingTop: spacing.md },
});
