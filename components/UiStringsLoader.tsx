import { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyOverrides,
  fetchUiStrings,
  fetchUiStringsVersion,
  type UiStringOverrides,
} from '../lib/i18nOverlay';
import { logError } from '../lib/logError';

/**
 * Overlays the CMS string overrides on top of the bundled i18n resources at
 * launch. Renders nothing.
 *
 * Mounted high in app/_layout.tsx (under I18nextProvider) so it runs app-wide
 * and NOT gated on auth — the login screen needs strings too. The bundled
 * locales/*.json are the synchronous fallback, so a failed/offline fetch is
 * harmless.
 *
 * Version-gated to avoid re-downloading the whole ~1,700-key table (a few
 * hundred kB) on every cold start:
 *   1. re-apply the last good overlay from AsyncStorage immediately (offline-safe);
 *   2. after first interactions, probe max(updated_at) — one tiny row;
 *   3. only when it differs from the cached version (a CMS edit landed), pull
 *      the full table, apply it, and persist it alongside the new version.
 * If the probe fails, fall back to the unconditional full fetch (the old
 * behavior), so a CMS edit still arrives on the next launch (see cms/AGENTS.md).
 */
export function UiStringsLoader() {
  useEffect(() => {
    void syncUiStrings();
  }, []);

  return null;
}

/** AsyncStorage record: last applied overlay + the max(updated_at) it matched. */
const OVERLAY_CACHE_KEY = 'hubble.uiStringsOverlay.v1';

type CachedOverlay = { version: string | null; overrides: UiStringOverrides };

async function readCachedOverlay(): Promise<CachedOverlay | null> {
  try {
    const raw = await AsyncStorage.getItem(OVERLAY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedOverlay | null;
    const o = parsed?.overrides;
    if (!o || typeof o.en !== 'object' || o.en === null || typeof o.ka !== 'object' || o.ka === null) {
      return null;
    }
    return parsed;
  } catch {
    return null; // corrupt cache → behave like a first launch (full fetch)
  }
}

async function syncUiStrings(): Promise<void> {
  // 1. Re-apply the last good overlay right away — no network, offline-safe.
  const cached = await readCachedOverlay();
  if (cached) {
    try {
      applyOverrides(cached.overrides);
    } catch (e) {
      logError(e, 'UiStringsLoader.applyOverrides');
    }
  }

  // 2. Keep the network probe out of the first-paint window — the boot radio
  //    belongs to the session bootstrap and the Home queries.
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });

  // 3. Cheap version gate: one single-row request instead of the full table.
  let version: string | null = null;
  let probeOk = false;
  try {
    version = await fetchUiStringsVersion();
    probeOk = true;
  } catch {
    // Probe failed (offline / transient) → fall through to the full fetch,
    // which fails just as harmlessly offline. Single attempt per launch: a
    // missed edit simply arrives on the next launch.
  }
  if (probeOk && cached && version === cached.version) return; // up to date

  // 4. Something changed (or no local copy yet): pull the whole table.
  let overrides: UiStringOverrides;
  try {
    overrides = await fetchUiStrings();
  } catch {
    return; // offline/failed fetch is harmless — bundled + cached overlay stand
  }
  try {
    applyOverrides(overrides);
  } catch (e) {
    logError(e, 'UiStringsLoader.applyOverrides');
    return; // don't persist an overlay we couldn't apply
  }
  try {
    const record: CachedOverlay = { version: probeOk ? version : null, overrides };
    await AsyncStorage.setItem(OVERLAY_CACHE_KEY, JSON.stringify(record));
  } catch {
    // Cache-write failure is harmless — the next launch just refetches.
  }
}
