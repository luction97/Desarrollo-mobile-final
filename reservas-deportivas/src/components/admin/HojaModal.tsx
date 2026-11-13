import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Surface, Text, uiLayout } from '../ui';
import { borders, layout, radius, spacing, useTheme } from '../../theme';

interface HojaModalProps {
  visible: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  /** Acciones fijas al pie de la hoja (la acción principal y su alternativa). */
  pie?: ReactNode;
  scroll?: boolean;
}

import type { ReactNode } from 'react';

/**
 * Hoja inferior modal: el patrón que usan las apps móviles para formularios
 * y selectores. Evita pantallas intermedias y mantiene la acción principal visible.
 */
export function HojaModal({ visible, titulo, onCerrar, children, pie, scroll = true }: HojaModalProps) {
  const { colors } = useTheme();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.velo}>
      <View style={[styles.veloInterior, { backgroundColor: colors.scrim }]}>
        <Surface style={styles.hoja} accessibilityViewIsModal>
          <View style={uiLayout.row}>
            <Text variant="title" accessibilityRole="header" style={uiLayout.grow}>{titulo}</Text>
            <Button size="sm" variant="ghost" title="Cerrar" onPress={onCerrar} />
          </View>
          {scroll ? <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            {children}</ScrollView>
            : <View style={styles.contenido}>{children}</View>}
          {pie ? <View style={styles.pie}>{pie}</View> : null}
        </Surface>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'flex-end' },
  veloInterior: { flex: 1, justifyContent: 'flex-end' },
  hoja: {
    width: '100%', maxWidth: layout.formWidth, alignSelf: 'center',
    borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card,
    borderCurve: borders.curve, gap: spacing.md, paddingBottom: spacing.xl,
  },
  contenido: { gap: spacing.lg, paddingBottom: spacing.md },
  pie: { gap: spacing.sm },
});
