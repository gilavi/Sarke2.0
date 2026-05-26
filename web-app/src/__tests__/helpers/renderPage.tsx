/**
 * Render a page/route component inside the providers it expects: MantineProvider
 * (via `@/test-utils`), a fresh QueryClient (retries off so rejected queries
 * surface immediately), and a MemoryRouter at the given route.
 */
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@/test-utils';

export function renderPage(ui: ReactElement, route = '/') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
