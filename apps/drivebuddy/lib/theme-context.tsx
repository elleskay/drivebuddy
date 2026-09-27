import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { secureGet, secureSet } from "./secure-storage";
import { themes, type Theme } from "./theme";

/** The user's Appearance choice. "system" follows the OS light/dark setting. */
export type Appearance = "system" | "light" | "dark";

const APPEARANCE_KEY = "drivebuddy.appearance";

interface ThemeState {
  theme: Theme;
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
  ready: boolean; // stored appearance loaded (avoids a light/dark flash on launch)
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [appearance, setAppearanceState] = useState<Appearance>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void secureGet(APPEARANCE_KEY)
      .then((v) => {
        if (v === "system" || v === "light" || v === "dark") setAppearanceState(v);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const setAppearance = useCallback((a: Appearance) => {
    setAppearanceState(a);
    void secureSet(APPEARANCE_KEY, a).catch(() => undefined);
  }, []);

  const scheme = appearance === "system" ? (system === "dark" ? "dark" : "light") : appearance;
  const value = useMemo(
    () => ({ theme: themes[scheme], appearance, setAppearance, ready }),
    [scheme, appearance, setAppearance, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeState(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function useTheme(): Theme {
  return useThemeState().theme;
}

export function useAppearance() {
  const { appearance, setAppearance, ready } = useThemeState();
  return { appearance, setAppearance, ready };
}

/**
 * Theme-aware StyleSheet factory. Styles are created once per palette and
 * cached, so switching light/dark is a lookup, not a re-create per render.
 *
 *   const useStyles = makeStyles((t) => ({ card: { backgroundColor: t.color.surface } }));
 *   const styles = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  // Intersected with NamedStyles (as StyleSheet.create's parameter is) so style
  // literals like flexDirection: "row" keep their literal types during inference.
  factory: (t: Theme) => T & StyleSheet.NamedStyles<T>,
): () => T {
  const cache = new Map<Theme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create<T>(factory(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}
