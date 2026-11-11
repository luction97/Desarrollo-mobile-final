import { useRef } from 'react';
import { AccessibilityInfo, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Surface, Text } from './ui';
import { layout, spacing, useTheme } from '../theme';

interface DialogoAvisoProps {
  titulo: string;
  mensaje?: string;
  detalle?: string;
  accionPrincipal: string;
  accionSecundaria?: string;
  destructivo?: boolean;
  onConfirmar: () => void;
  onCerrar: () => void;
}

export function DialogoAviso({ titulo, mensaje, detalle, accionPrincipal, accionSecundaria, destructivo = false, onConfirmar, onCerrar }: DialogoAvisoProps) {
  const principal = useRef<View>(null);
  const { colors } = useTheme();

  return <Modal transparent visible accessibilityLabel={titulo} animationType="none" onRequestClose={onCerrar}
    onShow={() => {
      principal.current?.focus();
      if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility([titulo, mensaje, detalle].filter(Boolean).join('. '));
    }}>
    <View style={[styles.fondo, { backgroundColor: colors.scrim }]}>
      <Surface padding="none" accessibilityViewIsModal style={styles.dialogo}>
        <ScrollView bounces={false} contentContainerStyle={styles.contenido}>
          <Text variant="title" accessibilityRole="header">{titulo}</Text>
          {mensaje && <Text tone="muted" accessibilityLiveRegion="polite">{mensaje}</Text>}
          {detalle && <View style={styles.detalle}>
            <Text numeric variant="action">{detalle}</Text>
          </View>}
          <View style={styles.acciones}>
            <Button ref={principal} variant={destructivo ? 'destructive' : 'primary'} title={accionPrincipal} onPress={onConfirmar} />
            {accionSecundaria && <Button variant="ghost" title={accionSecundaria} onPress={onCerrar} />}
          </View>
        </ScrollView>
      </Surface>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  dialogo: { width: '100%', maxWidth: layout.dialogWidth, maxHeight: '100%', overflow: 'hidden' },
  contenido: { padding: spacing.xxl, gap: spacing.lg },
  detalle: { paddingVertical: spacing.sm },
  acciones: { gap: spacing.sm, paddingTop: spacing.sm },
});
