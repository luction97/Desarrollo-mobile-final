import { forwardRef } from 'react';
import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';
import { numericTypography, typography, useTheme, type TextVariant } from '../../theme';

export interface TextProps extends NativeTextProps {
  variant?: TextVariant;
  tone?: 'text' | 'muted' | 'primary' | 'danger' | 'success' | 'warning';
  numeric?: boolean;
}

export const Text = forwardRef<NativeText, TextProps>(function Text(
  { variant = 'body', tone = 'text', numeric = false, style, ...props }, ref,
) {
  const { colors } = useTheme();
  return <NativeText ref={ref} {...props} style={[
    typography[variant], { color: colors[tone] }, numeric && numericTypography, style,
  ]} />;
});
