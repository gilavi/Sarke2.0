import { QueryClient } from '@tanstack/react-query';
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
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  // Throttle disk writes — react-query fires updates on every fetch, and
  // serializing the cache to AsyncStorage on every keystroke would be
  // wasteful. 1s coalesces bursts.
  throttleTime: 1_000,
  key: 'sarke.rq.cache.v1',
});

// Bump on cache-shape changes so a stale persisted blob from a previous
// version doesn't poison the new schema.
const CACHE_BUSTER = 'sdk54-v1';

// Bind once at module load. The hook variant (`PersistQueryClientProvider`)
// would gate render until rehydration completes, which we don't want — better
// to render with empty data and swap in cached data the moment it's ready.
persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000,
  buster: CACHE_BUSTER,
});
