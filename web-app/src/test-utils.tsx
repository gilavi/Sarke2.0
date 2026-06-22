/* eslint-disable react-refresh/only-export-components -- test helper, not a fast-refresh component module */
import type { ReactElement, ReactNode } from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ThemeProvider } from '@root/lib/ThemeContext';

function Providers({ children }: { children: ReactNode }) {
  // ThemeProvider from @root/lib/ThemeContext supplies the design-token
  // context consumed by shared ../components/primitives (useTheme()).
  // MantineProvider is required by web-app's own Mantine components.
  return (
    <ThemeProvider>
      <MantineProvider forceColorScheme="light">{children}</MantineProvider>
    </ThemeProvider>
  );
}

export function render(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return rtlRender(ui, { wrapper: Providers, ...options });
}

export * from '@testing-library/react';
