// Paleta de marca Club. No depende de APIs Color de versiones posteriores de Router.
export const lightColors = {
  background: '#F7F5EF', surface: '#FFFFFF', text: '#1C1F1A', muted: '#5C6157',
  border: '#DAD5C8', inputBorder: '#797D73', primary: '#1F5D3A', onPrimary: '#FFFFFF',
  primaryContainer: '#DCE9DF', accent: '#A8501F', onAccent: '#FFFFFF',
  danger: '#A32B22', onDanger: '#FFFFFF', dangerContainer: '#FBEAE7',
  success: '#2E6B43', successContainer: '#DCE9DF', warning: '#8A5A00', warningContainer: '#FAECCC',
  disabled: '#E6E3DA', onDisabled: '#5C6157', transparent: 'transparent',
  scrim: 'rgba(0,0,0,0.48)', media: '#000000', codeBackground: '#FFFFFF', codeForeground: '#000000',
} as const;

export type ThemeColors = { readonly [K in keyof typeof lightColors]: string };

export const darkColors = {
  background: '#12160F', surface: '#20291F', text: '#F5F7F0', muted: '#C6D0C2',
  border: '#6D7B68', inputBorder: '#8C9B87', primary: '#94D2A8', onPrimary: '#0B1A10',
  primaryContainer: '#233528', accent: '#D98A5C', onAccent: '#25150B',
  danger: '#F08A82', onDanger: '#2C1010', dangerContainer: '#40201E',
  success: '#7FBF95', successContainer: '#233528', warning: '#E0B15C', warningContainer: '#382B14',
  disabled: '#303A2F', onDisabled: '#A9B3A6', transparent: 'transparent',
  scrim: 'rgba(0,0,0,0.64)', media: '#000000', codeBackground: '#FFFFFF', codeForeground: '#000000',
} as const satisfies ThemeColors;
