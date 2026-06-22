import { useMemo, type ReactNode } from 'react';
import { ThemeContext } from '@root/lib/ThemeContext';
import { lightTheme, darkTheme, type Theme } from '@root/lib/theme';
import { useTheme } from '@/lib/theme';

/**
 * Bridges web-app's own (Mantine/Tailwind) theme to the React Native
 * ThemeContext that the shared `components/primitives/*` consume via useTheme().
 *
 * The Expo app drives that context through ThemeProvider (AsyncStorage-backed
 * mode resolution). On web we instead derive the RN theme object directly from
 * web-app's existing light/dark state, so a single toggle keeps the DOM chrome
 * and the RN primitives in lockstep — no second source of truth, no AsyncStorage.
 *
 * Must be mounted INSIDE web-app's <ThemeProvider> (it reads useTheme()).
 */
export function RNThemeBridge({ children }: { children: ReactNode }) {
  const { isDark, mode, setMode } = useTheme();

  const value = useMemo(
    () => ({
      // darkTheme widens some literal types vs lightTheme; both satisfy Theme.
      theme: (isDark ? darkTheme : lightTheme) as Theme,
      isDark,
      mode: mode as 'light' | 'dark' | 'system',
      setMode: (m: 'light' | 'dark' | 'system') => setMode(m === 'system' ? 'light' : m),
    }),
    [isDark, mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
