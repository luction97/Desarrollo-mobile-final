import { View, type ViewProps } from 'react-native';
import { spacing } from '../../theme';

export function StateView({ style, ...props }: ViewProps) {
  return <View {...props} style={[{
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    padding: spacing.xxl, gap: spacing.lg,
  }, style]} />;
}
