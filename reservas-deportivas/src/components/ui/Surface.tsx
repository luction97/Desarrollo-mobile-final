import { View, type ViewProps } from 'react-native';
import { borders, radius, spacing, useTheme, type Spacing } from '../../theme';

export interface SurfaceProps extends ViewProps {
  variant?: 'plain' | 'outlined' | 'raised';
  padding?: Spacing;
}

export function Surface({ variant = 'plain', padding = 'lg', style, ...props }: SurfaceProps) {
  const { colors, shadows } = useTheme();
  return <View {...props} style={[{
    backgroundColor: colors.surface, padding: spacing[padding],
    borderRadius: radius.card, borderCurve: borders.curve,
    borderWidth: variant === 'plain' ? 0 : borders.thin,
    borderColor: colors.border,
  }, variant === 'raised' && { boxShadow: shadows.card }, style]} />;
}
