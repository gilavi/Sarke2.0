// Test stub for @root/lib/ThemeContext.
// The real module uses react-native (Appearance, Platform) which triggers
// react-native-web's StyleSheet injection — incompatible with jsdom.
// This stub returns a static light theme so components that call useTheme()
// get a valid theme object without any native-bridge overhead.
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { lightTheme } from '../lib/theme';

export const ThemeContext = {
  Provider: ({ children }: { children: ReactNode }) => children as JSX.Element,
  Consumer: ({ children }: { children: (v: typeof lightTheme) => ReactNode }) =>
    children(lightTheme) as JSX.Element,
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  return createElement('div', null, children);
}

export function useTheme() {
  return { theme: lightTheme, colorScheme: 'light' as const, setColorScheme: () => {} };
}
