import type { TextStyle, ViewStyle } from "react-native";

// DriveBuddy design tokens. Light and dark palettes share one semantic shape, so
// components read `theme.color.surface` rather than hex values and the whole app
// re-themes from this file. ThemeProvider (lib/theme-context.tsx) picks the
// palette from the system setting or the user's Appearance choice in Settings.

export type Scheme = "light" | "dark";

/** Geist, loaded in app/_layout.tsx. One family per weight so Android renders the right cut. */
export const font = {
  regular: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  bold: "Geist_700Bold",
} as const;

/** Brand accent: an electric lime that reads like an instrument-cluster highlight. */
const LIME = "#C6F135";

export interface Palette {
  bg: string;
  surface: string; // cards, list groups
  surfaceMuted: string; // inputs, segmented tracks, secondary buttons
  surfaceStrong: string; // pressed / selected neutral
  border: string; // hairlines
  borderStrong: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string; // fills (buttons, active states)
  onAccent: string; // text/icons on an accent fill
  accentSoft: string; // tinted wells and chips
  accentInk: string; // accent used as text/icon on bg (contrast-safe per scheme)
  focus: string; // input focus ring
  danger: string; // text/icons
  dangerSolid: string; // destructive button fill
  onDanger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  success: string;
  successSoft: string;
  info: string;
  infoSoft: string;
  skeleton: string;
  shimmer: string;
  tabBar: string;
  plate: string; // Singapore number plate chip
  onPlate: string;
}

const light: Palette = {
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceMuted: "#EDEFF2",
  surfaceStrong: "#E2E5E9",
  border: "#E4E6EA",
  borderStrong: "#D3D7DD",
  text: "#0B0C0E",
  textSecondary: "#5A616B",
  textTertiary: "#8A9099",
  accent: LIME,
  onAccent: "#0B0C0E",
  accentSoft: "#EEFBC2",
  accentInk: "#4D7C0F",
  focus: "#0B0C0E",
  danger: "#DC2626",
  dangerSolid: "#DC2626",
  onDanger: "#FFFFFF",
  dangerSoft: "#FDECEC",
  warning: "#B45309",
  warningSoft: "#FEF3C7",
  success: "#15803D",
  successSoft: "#DCFCE7",
  info: "#0369A1",
  infoSoft: "#E0F2FE",
  skeleton: "#E6E8EC",
  shimmer: "rgba(255,255,255,0.9)",
  tabBar: "#FFFFFF",
  plate: "#0B0C0E",
  onPlate: "#FFFFFF",
};

const dark: Palette = {
  bg: "#0A0B0D",
  surface: "#141518",
  surfaceMuted: "#1C1E22",
  surfaceStrong: "#272A2F",
  border: "#212328",
  borderStrong: "#30333A",
  text: "#F4F5F6",
  textSecondary: "#A1A7B0",
  textTertiary: "#6B717A",
  accent: LIME,
  onAccent: "#0B0C0E",
  accentSoft: "rgba(198,241,53,0.14)",
  accentInk: LIME,
  focus: LIME,
  danger: "#FF6B6B",
  dangerSolid: "#DC2626",
  onDanger: "#FFFFFF",
  dangerSoft: "rgba(255,107,107,0.14)",
  warning: "#FBBF24",
  warningSoft: "rgba(251,191,36,0.14)",
  success: "#4ADE80",
  successSoft: "rgba(74,222,128,0.14)",
  info: "#38BDF8",
  infoSoft: "rgba(56,189,248,0.14)",
  skeleton: "#1A1C20",
  shimmer: "rgba(255,255,255,0.07)",
  tabBar: "#16181B",
  plate: "#050506",
  onPlate: "#F4F5F6",
};

/** Per-category hues for icon wells and chips (glanceability). */
export type Category =
  | "erp"
  | "fuel"
  | "traffic"
  | "weather"
  | "carpark"
  | "routine"
  | "safety"
  | "neutral";

const categoryLight: Record<Category, string> = {
  erp: "#DC2626",
  fuel: "#059669",
  traffic: "#D97706",
  weather: "#0284C7",
  carpark: "#7C3AED",
  routine: "#2563EB",
  safety: "#E11D48",
  neutral: "#5A616B",
};

const categoryDark: Record<Category, string> = {
  erp: "#F87171",
  fuel: "#34D399",
  traffic: "#FBBF24",
  weather: "#38BDF8",
  carpark: "#A78BFA",
  routine: "#60A5FA",
  safety: "#FB7185",
  neutral: "#A1A7B0",
};

export interface Theme {
  scheme: Scheme;
  color: Palette;
  category: Record<Category, string>;
  /** Elevation for floating elements only (tab bar). Cards stay flat with hairlines. */
  float: ViewStyle;
}

export const themes: Record<Scheme, Theme> = {
  light: {
    scheme: "light",
    color: light,
    category: categoryLight,
    float: {
      shadowColor: "#0B0C0E",
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  },
  dark: {
    scheme: "dark",
    color: dark,
    category: categoryDark,
    float: {
      shadowColor: "#000000",
      shadowOpacity: 0.5,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
  },
};

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;

/** Type scale. Tight tracking on large sizes; letterSpacing is in points, not em. */
export const type = {
  hero: { fontFamily: font.bold, fontSize: 60, lineHeight: 66, letterSpacing: -2.4 },
  display: { fontFamily: font.bold, fontSize: 38, lineHeight: 44, letterSpacing: -1.4 },
  title1: { fontFamily: font.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.9 },
  title2: { fontFamily: font.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  title3: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, letterSpacing: -0.1 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 16, lineHeight: 23, letterSpacing: -0.2 },
  callout: { fontFamily: font.medium, fontSize: 15, lineHeight: 21, letterSpacing: -0.1 },
  subhead: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  subheadStrong: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, letterSpacing: -0.1 },
  footnote: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  overline: {
    fontFamily: font.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Minimum comfortable touch target (in-car glanceability; phone baseline >=48dp). */
export const TOUCH_TARGET = 48;

/** "#RRGGBB" + alpha -> "rgba(...)". Used for tinted icon wells. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
