/**
 * Test render helper. Component tests render Mantine components, which require a
 * MantineProvider in the tree. This wraps @testing-library/react's `render` so
 * tests get the provider for free, then re-exports the rest of the RTL API.
 *
 *   import { render, screen } from '@/test-utils';
 */
/* eslint-disable react-refresh/only-export-components -- test helper, not a fast-refresh component module */
import type { ReactElement, ReactNode } from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

function Providers({ children }: { children: ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

export function render(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return rtlRender(ui, { wrapper: Providers, ...options });
}

export * from '@testing-library/react';
