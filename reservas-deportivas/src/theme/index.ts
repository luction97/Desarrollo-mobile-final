import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from './colors';
import { shadows } from './shadows';

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './radius';
export * from './shadows';
export * from './motion';
export * from './layout';

export type ThemeScheme = 'light' | 'dark';
export interface Theme {
  readonly scheme: ThemeScheme;
  readonly colors: ThemeColors;
  readonly shadows: { readonly card: string };
}

export const themes: Readonly<Record<ThemeScheme, Theme>> = {
  light: { scheme: 'light', colors: lightColors, shadows: shadows.light },
  dark: { scheme: 'dark', colors: darkColors, shadows: shadows.dark },
};

export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
