import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  toggleMode: () => void;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  isDark: false,
  toggleMode: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('hubble-theme') as ThemeMode) || 'light';
  });

  const isDark = mode === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('hubble-theme', mode);
  }, [isDark, mode]);

  const toggleMode = useCallback(() => setModeState((m) => (m === 'light' ? 'dark' : 'light')), []);
  const setMode = useCallback((m: ThemeMode) => setModeState(m), []);

  return <ThemeContext.Provider value={{ mode, isDark, toggleMode, setMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
