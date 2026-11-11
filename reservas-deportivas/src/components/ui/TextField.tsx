import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { borders, controlSizes, radius, spacing, typography, useTheme, type ControlSize } from '../../theme';
import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  variant?: 'default' | 'error';
  size?: ControlSize;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({
  label, variant = 'default', size = 'md', containerStyle, style,
  editable = true, readOnly = false, onFocus, onBlur, accessibilityLabel, accessibilityState, ...props
}, ref) {
  const { colors, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  const unavailable = !editable || readOnly;
  return <View style={[{ gap: spacing.sm }, containerStyle]}>
    <Text variant="label">{label}</Text>
    <TextInput ref={ref} placeholderTextColor={colors.muted} selectionColor={colors.primary}
      underlineColorAndroid={colors.transparent} keyboardAppearance={scheme}
      {...props} editable={editable} readOnly={readOnly}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ ...accessibilityState, disabled: unavailable }}
      aria-invalid={variant === 'error'}
      onFocus={event => { setFocused(true); onFocus?.(event); }}
      onBlur={event => { setFocused(false); onBlur?.(event); }}
      style={[typography.body, {
        ...controlSizes[size], borderRadius: radius.input, borderCurve: borders.curve,
        borderWidth: borders.focus,
        borderColor: variant === 'error' ? colors.danger : focused ? colors.primary : colors.inputBorder,
        backgroundColor: unavailable ? colors.disabled : colors.surface,
        color: unavailable ? colors.onDisabled : colors.text,
      }, style]} />
  </View>;
});
