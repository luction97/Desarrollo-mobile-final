import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import type { Espacio, Turno } from '../tipos';
import { Button, Surface, Text, TextField, uiLayout } from './ui';
import { layout, spacing, useTheme } from '../theme';
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
  return <Modal visible transparent animationType="none" accessibilityLabel="Confirmar reserva" onRequestClose={() => { if (!cargando) onCerrar(); }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.scrim, padding: spacing.xxl, justifyContent: 'center', alignItems: 'center' }}>
      <Surface padding="none" accessibilityViewIsModal style={{ width: '100%', maxWidth: layout.dialogWidth, maxHeight: '100%' }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.xxl, gap: spacing.lg }}>
          <Text variant="title" accessibilityRole="header">{espacio.nombre}</Text>
          <Text tone="muted">{deporte}</Text>
          <Text numeric variant="action">{fechaLegible(turno.fecha)} · {turno.inicio}–{turno.fin}</Text>
          <Text numeric variant="title" tone="primary">{precioLegible(turno.precio)}</Text>
          <Text variant="label" tone="muted">Se paga en el lugar</Text>
          <View style={uiLayout.row}>
            <Button title="−" accessibilityLabel="Una persona menos" variant="secondary" disabled={cargando || numero <= 1}
              onPress={() => setCantidad(String(Math.max(1, (Number(cantidad) || 1) - 1)))} />
            <TextField label="Personas" keyboardType="number-pad" value={cantidad} onChangeText={setCantidad}
              editable={!cargando} containerStyle={uiLayout.grow} maxLength={4} />
            <Button title="+" accessibilityLabel="Una persona más" variant="secondary" disabled={cargando || numero >= espacio.capacidad}
              onPress={() => setCantidad(String(Math.min(espacio.capacidad, (Number(cantidad) || 0) + 1)))} />
          </View>
          <Text variant="label" tone="muted">Hasta {espacio.capacidad} personas</Text>
          {error && <Text accessibilityRole="alert" selectable tone="danger">{error}</Text>}
          <Button title={requiereIngreso ? "Ingresar para reservar" : "Confirmar reserva"} loading={cargando} disabled={!valido} onPress={() => onConfirmar(numero)} />
          <Button title="Ahora no" variant="ghost" disabled={cargando} onPress={onCerrar} />
        </ScrollView>
      </Surface>
    </KeyboardAvoidingView>
  </Modal>;
}
