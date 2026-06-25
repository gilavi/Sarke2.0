import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, type Theme } from './theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

// Default left undefined to avoid a module-init cycle: lib/theme.ts re-exports
// useTheme from this file, so eagerly reading lightTheme here would TDZ-fail
// on web. ThemeProvider always wraps consumers, so the default is never read.
// Exported so non-app surfaces (e.g. the design-system Storybook) can provide a
// controlled theme value directly without going through ThemeProvider's
// AsyncStorage-backed mode resolution.
export const ThemeContext = createContext<ThemeContextValue>(undefined as unknown as ThemeContextValue);

// Key bumped from the legacy 'theme_dark' so any device that persisted dark
// under the old dark-by-default scheme starts fresh on the new light default.
// (Changing only the resolver default left those devices stuck on dark — the
// root of the "it won't switch to light" reports.) Users can still opt into
// dark via the toggle; that writes the new key.
const STORAGE_KEY = 'theme_mode_v2';

// Exported for testing: the default must stay 'light' (the toggle is OFF unless
// the user explicitly turns dark on). Regressing this to 'dark' is the bug this
// guards against.
export function resolveMode(stored: string | null): ThemeMode {
  if (stored === 'true') return 'dark';
  if (stored === 'false') return 'light';
  return 'light';
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return Appearance.getColorScheme() === 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [loaded, setLoaded] = useState(false);
  // Bumped by the OS appearance listener so `isDark` recomputes when the
  // system flips light/dark while the app is open. Plain `setModeState((m) => m)`
  // is bailed out by React (same reference), so it wouldn't re-render.
  const [systemTick, setSystemTick] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      setModeState(resolveMode(val));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      if (mode === 'system') {
        setSystemTick((t) => t + 1);
      }
    });
    return () => sub.remove();
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    const stored = next === 'dark' ? 'true' : next === 'light' ? 'false' : null;
    if (stored) {
      AsyncStorage.setItem(STORAGE_KEY, stored);
    } else {
      AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // systemTick is intentionally part of the deps so a system-theme change
  // recomputes isDark even though `mode` itself didn't change.
  const isDark = useMemo(() => resolveIsDark(mode), [mode, systemTick]);
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  const value = useMemo(
    () => ({ theme, isDark, mode, setMode }),
    [theme, isDark, mode, setMode]
  );

  if (!loaded) {
    // prevent flash: render children with light theme until preference loads
    return (
      <ThemeContext.Provider value={value as ThemeContextValue}>{children}</ThemeContext.Provider>
    );
  }

  return <ThemeContext.Provider value={value as ThemeContextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
