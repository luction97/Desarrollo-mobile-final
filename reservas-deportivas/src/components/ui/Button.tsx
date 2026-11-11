import { forwardRef, useState } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { borders, controlSizes, interaction, radius, useTheme, type ControlSize } from '../../theme';
import { Text } from './Text';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: ControlSize;
  loading?: boolean;
}

export const Button = forwardRef<View, ButtonProps>(function Button({
  title, variant = 'primary', size = 'md', loading = false, disabled = false,
  style, accessibilityLabel, accessibilityState, onFocus, onBlur, ...props
}, ref) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const unavailable = !!(disabled || loading);
  const variants = {
    primary: { backgroundColor: colors.primary, color: colors.onPrimary },
    secondary: { backgroundColor: colors.primaryContainer, color: colors.primary },
    ghost: { backgroundColor: colors.transparent, color: colors.primary },
    destructive: { backgroundColor: colors.danger, color: colors.onDanger },
  };
  const visual = variants[variant];
  const color = disabled ? colors.onDisabled : visual.color;

  return <Pressable ref={ref} {...props} accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? title}
    accessibilityState={{ ...accessibilityState, disabled: unavailable, busy: loading }}
    disabled={unavailable}
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={event => { setFocused(false); onBlur?.(event); }}
    style={state => [{
      ...controlSizes[size], borderRadius: radius.button, borderCurve: borders.curve,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: disabled ? colors.disabled : visual.backgroundColor,
      borderWidth: borders.focus,
      borderColor: focused ? colors.text : colors.transparent,
      opacity: state.pressed && !unavailable ? interaction.pressedOpacity : 1,
    }, typeof style === 'function' ? style(state) : style]}>
    {loading ? <ActivityIndicator color={color} accessible={false} /> :
      <Text variant="action" style={{ color, textAlign: 'center' }}>{title}</Text>}
  </Pressable>;
});
