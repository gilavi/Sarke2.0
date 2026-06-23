import { AppState, type AppStateStatus } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

// gcTime must be >= the persister's maxAge so persisted queries survive their
// rehydration. 30 minutes lets the projects tab feel instant even after the
// app has been backgrounded for a long lunch break.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      // Refetch STALE queries when the app returns to the foreground (see the
      // focusManager binding below). Gated by staleTime, so anything fetched in
      // the last 5 min is reused — in-app tab-switching never triggers a refetch
      // (no AppState change) and stays instant.
      refetchOnWindowFocus: true,
    },
  },
});

// Bridge React Native's AppState to React Query's focusManager. Without this the
// library never learns the app refocused, so `refetchOnWindowFocus` is a no-op on
// native. With it, reopening the app refreshes stale lists/details — the safety
// net that complements explicit invalidateRecordLists() calls after mutations.
focusManager.setEventListener(handleFocus => {
  const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
    handleFocus(status === 'active');
  });
  return () => sub.remove();
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  // Throttle disk writes - react-query fires updates on every fetch, and
  // serializing the cache to AsyncStorage on every keystroke would be
  // wasteful. 1s coalesces bursts.
  throttleTime: 5_000,
  key: 'hubble.rq.cache.v1',
});

// Bump on cache-shape changes so a stale persisted blob from a previous
// version doesn't poison the new schema.
const CACHE_BUSTER = 'sdk54-v2';

// Bind once at module load. The hook variant (`PersistQueryClientProvider`)
// would gate render until rehydration completes, which we don't want - better
// to render with empty data and swap in cached data the moment it's ready.
persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000,
  buster: CACHE_BUSTER,
});
