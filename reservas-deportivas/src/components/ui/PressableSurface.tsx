import { forwardRef } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { borders, controlSizes, interaction, radius, useTheme } from '../../theme';

export interface PressableSurfaceProps extends PressableProps {
  selected?: boolean;
}

export const PressableSurface = forwardRef<View, PressableSurfaceProps>(function PressableSurface({
  selected, disabled, accessibilityState, style, ...props
}, ref) {
  const { colors } = useTheme();
  return <Pressable ref={ref} {...props} accessibilityRole="button" disabled={disabled}
    accessibilityState={{ ...accessibilityState, disabled: !!disabled, ...(selected === undefined ? {} : { selected }) }}
    style={state => [{
      ...controlSizes.md, borderRadius: radius.card, borderCurve: borders.curve,
      backgroundColor: selected ? colors.primaryContainer : colors.surface,
      borderWidth: borders.thin, borderColor: selected ? colors.primary : colors.border,
      opacity: state.pressed && !disabled ? interaction.pressedOpacity : 1,
    }, typeof style === 'function' ? style(state) : style]} />;
});
