import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUiStrings, applyOverrides } from '../lib/i18nOverlay';
import { logError } from '../lib/logError';

/**
 * Fetches the CMS string overrides on launch and overlays them on top of the
 * bundled i18n resources. Renders nothing.
 *
 * Mounted high in app/_layout.tsx (under QueryClientProvider + I18nextProvider)
 * so it runs app-wide and NOT gated on auth — the login screen needs strings too.
 * The bundled locales/*.json are the synchronous fallback, so a failed/offline
 * fetch is harmless; React Query's AsyncStorage persistence rehydrates the last
 * good overlay on the next cold start, then a background refetch pulls the latest
 * edits (visible on the next launch — see cms/AGENTS.md).
 */
export function UiStringsLoader() {
  const { data } = useQuery({
    queryKey: ['ui-strings'],
    queryFn: fetchUiStrings,
    staleTime: 0, // always revalidate on launch to pick up the latest CMS edits
    gcTime: 24 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!data) return;
    try {
      applyOverrides(data);
    } catch (e) {
      logError(e, 'UiStringsLoader.applyOverrides');
    }
  }, [data]);

  return null;
}
