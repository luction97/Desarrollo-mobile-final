import { View, type ViewProps } from 'react-native';
import { radius, spacing, useTheme } from '../../theme';
import { Text } from './Text';

export interface BadgeProps extends Omit<ViewProps, 'children'> {
  children: string;
  variant?: 'neutral' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'neutral', size = 'md', style, ...props }: BadgeProps) {
  const { colors } = useTheme();
  const variants = {
    neutral: { backgroundColor: colors.background, color: colors.muted },
    success: { backgroundColor: colors.successContainer, color: colors.success },
    warning: { backgroundColor: colors.warningContainer, color: colors.warning },
    danger: { backgroundColor: colors.dangerContainer, color: colors.danger },
  };
  const visual = variants[variant];
  return <View {...props} style={[{
    alignSelf: 'flex-start', flexShrink: 1, borderRadius: radius.full,
    paddingVertical: spacing.xs, paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
    backgroundColor: visual.backgroundColor,
  }, style]}>
    <Text variant={size === 'sm' ? 'caption' : 'label'} style={{ color: visual.color }}>{children}</Text>
  </View>;
}
