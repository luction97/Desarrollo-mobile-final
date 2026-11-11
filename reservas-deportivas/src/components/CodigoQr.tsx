import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { layout, radius, spacing, useTheme } from '../theme';

export function CodigoQr({ value, size = 'md' }: { value: string; size?: 'sm' | 'md' }) {
  const { colors } = useTheme();
  return <View style={{ alignSelf: 'center', padding: spacing.lg, borderRadius: radius.input, backgroundColor: colors.codeBackground }}>
    <QRCode value={value} size={size === 'sm' ? layout.compactCodeSize : layout.codeSize}
      color={colors.codeForeground} backgroundColor={colors.codeBackground} />
  </View>;
}
