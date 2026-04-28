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
const ThemeContext = createContext<ThemeContextValue>(undefined as unknown as ThemeContextValue);

const STORAGE_KEY = 'theme_dark';

function resolveMode(stored: string | null): ThemeMode {
  if (stored === 'true') return 'dark';
  if (stored === 'false') return 'light';
  return 'system';
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return Appearance.getColorScheme() === 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      setModeState(resolveMode(val));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (mode === 'system') {
        // force re-render by toggling state — actual value computed in isDark
        setModeState((m) => (m === 'system' ? 'system' : m));
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

  const isDark = useMemo(() => resolveIsDark(mode), [mode]);
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
