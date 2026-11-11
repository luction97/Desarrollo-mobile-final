// El borde conserva la jerarquía si el runtime no soporta boxShadow.
export const shadows = {
  light: { card: '0 2px 8px rgba(28, 31, 26, 0.08)' },
  dark: { card: '0 2px 8px rgba(0, 0, 0, 0.24)' },
} as const;
