import { Pressable, type PressableProps } from 'react-native';
import { controlSizes, interaction, radius, useTheme } from '../../theme';
import { Text } from './Text';

export interface ChipProps extends Omit<PressableProps, 'children'> {
  children: string;
  selected: boolean;
}

export function Chip({ children, selected, style, disabled, accessibilityState, ...props }: ChipProps) {
  const { colors } = useTheme();
  return <Pressable {...props} disabled={disabled} accessibilityRole="button"
    accessibilityState={{ ...accessibilityState, selected, disabled: !!disabled }}
    style={state => [{
      ...controlSizes.sm, borderRadius: radius.full, justifyContent: 'center',
      backgroundColor: disabled ? colors.disabled : selected ? colors.primary : colors.surface,
      opacity: state.pressed && !disabled ? interaction.pressedOpacity : 1,
    }, typeof style === 'function' ? style(state) : style]}>
    <Text variant="label" style={{ color: disabled ? colors.onDisabled : selected ? colors.onPrimary : colors.muted }}>{children}</Text>
  </Pressable>;
}
