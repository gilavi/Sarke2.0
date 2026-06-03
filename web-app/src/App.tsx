import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppRouter } from '@/app/router';

// HashRouter is required because GitHub Pages only honors 404.html at the
// site root, not in subdirectories like /Sarke2.0/app/. Hash routing keeps
// the entire URL after `#` client-side. Same pattern as web/hubble-sign.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="bottom-right" richColors />
      <AppRouter />
    </QueryClientProvider>
  );
}
