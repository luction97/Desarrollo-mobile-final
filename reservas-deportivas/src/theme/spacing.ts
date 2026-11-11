export const spacing = { none: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;
export type Spacing = keyof typeof spacing;

export const controlSizes = {
  sm: { minHeight: 48, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  md: { minHeight: 48, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  lg: { minHeight: 56, paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
} as const;
export type ControlSize = keyof typeof controlSizes;
