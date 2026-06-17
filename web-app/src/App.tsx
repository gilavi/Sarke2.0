import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { MotionConfig } from 'framer-motion';
import { AppRouter } from '@/app/router';
import { isTransientError } from '@/lib/errors';

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
    // Mutations (slide add/remove/update, project/report/incident create, …) had no
    // retry at all - a single Wi-Fi blip on a construction site lost the write. Retry
    // ONLY transient network failures (never RLS/duplicate/validation, which would be
    // pointless and could double-apply a non-idempotent create), up to twice with a
    // short exponential backoff.
    mutations: {
      retry: (failureCount, error) => isTransientError(error) && failureCount < 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user" makes EVERY framer-motion component honor the OS
          prefers-reduced-motion setting automatically (transform/layout animations
          are skipped; opacity still fades). One switch for the whole app. */}
      <MotionConfig reducedMotion="user">
        <Toaster position="bottom-right" richColors />
        <AppRouter />
      </MotionConfig>
    </QueryClientProvider>
  );
}
