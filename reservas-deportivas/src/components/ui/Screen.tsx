import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { borders, layout, spacing, useTheme } from '../../theme';

export interface ScreenProps extends ViewProps {
  topInset?: boolean;
}

export function Screen({ topInset = false, style, children, ...props }: ScreenProps) {
  const { colors } = useTheme();
  return <SafeAreaView {...props} edges={topInset ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}
    style={[{ flex: 1, backgroundColor: colors.background }, style]}>
    <View style={uiLayout.frame}>{children}</View>
  </SafeAreaView>;
}

export function ScrollScreen({ contentContainerStyle, style, ...props }: ScrollViewProps) {
  const { colors } = useTheme();
  return <Screen>
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled"
      {...props} style={[{ backgroundColor: colors.background }, style]}
      contentContainerStyle={[uiLayout.scrollContent, contentContainerStyle]} />
  </Screen>;
}

export const uiLayout = StyleSheet.create({
  frame: { flex: 1, width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center' },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.xxl },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md },
  section: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: borders.thin },
  grow: { flex: 1, minWidth: 0 },
  inset: { padding: spacing.xl, gap: spacing.lg },
});
