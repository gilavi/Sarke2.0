import { AppState, type AppStateStatus } from 'react-native';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { watchNetwork } from './network';

// gcTime must be >= the persister's maxAge so persisted queries survive their
// rehydration. 7 days keeps last-fetched lists renderable through a week of
// offline field work (offline mode) while still letting dead data age out.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
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

// Bridge NetInfo to React Query's onlineManager (network state has one owner:
// lib/network.ts — don't wire NetInfo to react-query anywhere else). Offline,
// queries PAUSE (fetchStatus 'paused') instead of burning their 2 retries and
// erroring: cached data keeps rendering and paused fetches resume on
// reconnect. Screens must use hooks/useListLoadState to tell "paused with no
// cache" (offline state) apart from a genuine first fetch (skeleton).
onlineManager.setEventListener((setOnline) => watchNetwork(setOnline));

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  // Throttle disk writes - react-query fires updates on every fetch, and
  // serializing the cache to AsyncStorage on every keystroke would be
  // wasteful. 5s coalesces bursts.
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
  // Matches gcTime (7 days). No CACHE_BUSTER bump needed for maxAge/gcTime
  // changes: both are read from live options at restore time — the dehydrated
  // blob shape is unchanged.
  maxAge: 7 * 24 * 60 * 60 * 1000,
  buster: CACHE_BUSTER,
  dehydrateOptions: {
    // Persist only settled successful data. Error/pending states would waste
    // the ~6MB Android AsyncStorage budget and rehydrate as junk.
    //
    // 'ui-strings' is excluded: the CMS overlay (a few hundred kB — the single
    // biggest entry the blob ever held) has its own version-gated AsyncStorage
    // cache in components/UiStringsLoader.tsx and no longer flows through
    // React Query; this guard drops the legacy entry left by blobs persisted
    // from older builds. Do NOT exclude the record/list keys here: their
    // persisted copies ARE the offline data source for Home/History and what
    // makes the non-forced boot warm-up in lib/apiHooks.ts a network no-op.
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' && query.queryKey[0] !== 'ui-strings',
  },
});
