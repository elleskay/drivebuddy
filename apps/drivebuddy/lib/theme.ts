// DriveBuddy design tokens - light theme. Centralises colours/spacing/radii so
// the UI stays consistent and themeable from one place.

export const colors = {
  bg: "#f5f7fb", // app background (soft off-white)
  surface: "#ffffff", // cards
  surfaceAlt: "#eef2f9", // subtle alt surface / chips
  border: "#e4e9f2",
  primary: "#2563eb", // blue-600 (good contrast on light)
  primaryDim: "#e8f0ff", // tinted primary surface
  text: "#0f172a", // slate-900
  textMuted: "#5b6b86", // slate-500-ish
  textDim: "#94a3b8", // slate-400
  danger: "#dc2626",
  success: "#16a34a",
  warning: "#d97706",
  skeleton: "#e6ebf3", // skeleton base
  skeletonHighlight: "#fbfdff", // sweeping sheen
} as const;

// Gradients (for hero, buttons, shimmer). LinearGradient `colors` expects an array.
export const gradients = {
  primary: ["#3b82f6", "#4f46e5"], // blue-500 -> indigo-600
  hero: ["#1d4ed8", "#4f46e5", "#7c3aed"], // blue -> indigo -> violet
} as const;

// Per-category accent colours for icons/chips (visual variety + glanceability).
export const accent = {
  erp: "#dc2626",
  fuel: "#16a34a",
  traffic: "#f59e0b",
  weather: "#0ea5e9",
  carpark: "#7c3aed",
  routine: "#2563eb",
  safety: "#ef4444",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 8, md: 12, lg: 14, pill: 22, round: 999 } as const;

// Soft elevation for cards on the light theme.
export const shadow = {
  shadowColor: "#0f172a",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;

// Minimum comfortable touch target (in-car glanceability; phone baseline >=48dp).
export const TOUCH_TARGET = 48;
