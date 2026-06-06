// DriveBuddy design tokens. Centralises the colours/spacing/radii that were
// previously repeated as literals across screens, so the UI stays consistent and
// is themeable from one place. The palette is the existing in-car dark theme
// (high contrast, dark for night driving) - just named.

export const colors = {
  bg: "#0b1220",
  surface: "#131c2e",
  surfaceAlt: "#101a2c",
  border: "#243049",
  primary: "#4f8cff",
  primaryDim: "#16223a",
  text: "#e7eefc",
  textMuted: "#9fb0d0",
  textDim: "#5a6b8c",
  danger: "#e5484d",
  success: "#22c55e",
  warning: "#e0a106",
  skeleton: "#1b2740",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 8, md: 12, lg: 14, pill: 22, round: 999 } as const;

// Minimum comfortable touch target (in-car glanceability; phone baseline >=48dp).
export const TOUCH_TARGET = 48;
