import '@mantine/core/styles.css';
// react-native-reanimated's worklets runtime reads `global` at module init,
// which doesn't exist in the browser. Alias it to globalThis before any lazy
// chunk pulls reanimated in (the shared primitives use it). Runs at app boot,
// before the first route loads.
(globalThis as typeof globalThis & { global?: unknown }).global ??= globalThis;
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { RNThemeBridge } from '@/lib/RNThemeBridge';
import { migrateLegacyStorage } from '@/lib/migrateLegacyStorage';
import '@/lib/i18n';
import './index.css';
import App from './App';

// Rebrand: carry legacy `sarke-*` localStorage keys over to `hubble-*` before
// anything reads them, so existing users keep their theme/lang/onboarding state.
migrateLegacyStorage();

const theme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand: [
      '#FFF3EE',
      '#FFE3D6',
      '#FFC4AC',
      '#FF9E78',
      '#FF7A47',
      '#FF5A1F',
      '#E84709',
      '#BE380C',
      '#972F11',
      '#421106',
    ],
  },
  primaryShade: { light: 5, dark: 4 },
  fontFamily: 'Inter, system-ui, sans-serif',
  defaultRadius: 'md',
  components: {
    Button: { defaultProps: { radius: 'md' } },
    TextInput: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md' } },
  },
});

function ThemedMantine({ children }: { children: ReactNode }) {
  const { isDark } = useTheme();
  return (
    <MantineProvider theme={theme} forceColorScheme={isDark ? 'dark' : 'light'}>
      {children}
    </MantineProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <ThemedMantine>
      <RNThemeBridge>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </RNThemeBridge>
    </ThemedMantine>
  </ThemeProvider>,
);
