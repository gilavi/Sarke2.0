// Runtime i18n overlay: fetch the CMS-edited strings from Supabase and lay them
// over the bundled locale defaults. See lib/i18n.ts (bundled init) and
// components/UiStringsLoader.tsx (the launch-time loader that calls these).
//
// The bundled locales/*.json remain the synchronous baseline/fallback; this only
// overrides existing string keys, so an offline or failed fetch is harmless.

import i18n from './i18n';
import { supabase } from './supabase';
import { unflatten } from './i18nFlatten';

export type UiStringOverrides = {
  en: Record<string, unknown>;
  ka: Record<string, unknown>;
};

/**
 * Read every row from the public-read `ui_strings` table (anon key) and rebuild
 * nested `en` / `ka` resource trees. Throws on a Supabase error (the caller —
 * components/UiStringsLoader.tsx — treats a failed fetch as harmless).
 */
export async function fetchUiStrings(): Promise<UiStringOverrides> {
  const { data, error } = await supabase.from('ui_strings').select('key, en, ka');
  if (error) throw error;
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return { en: unflatten(rows, 'en'), ka: unflatten(rows, 'ka') };
}

/**
 * Cheap launch-time version probe: the newest `updated_at` in the table, fetched
 * as a single one-column row (order desc + limit 1 — no aggregate needed).
 *
 * `max(updated_at)` is a complete version tag for the table's contents because
 * the CMS is edit-only (keys are never created/deleted at runtime; new keys only
 * arrive via the insert-only seed script, which also stamps `updated_at` via the
 * column default) and the cms-texts edge function sets `updated_at` on every
 * save. Returns null for an empty table. Throws on a Supabase error — callers
 * fall back to the unconditional full fetch (the pre-version-gate behavior).
 */
export async function fetchUiStringsVersion(): Promise<string | null> {
  const { data, error } = await supabase
    .from('ui_strings')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const row = (data ?? [])[0] as { updated_at?: unknown } | undefined;
  return typeof row?.updated_at === 'string' ? row.updated_at : null;
}

/**
 * Deep-merge (overwrite) the overrides onto i18next's bundled resources. With
 * `react: { bindI18nStore: 'added' }` in lib/i18n.ts, this re-renders any mounted
 * components using useTranslation.
 */
export function applyOverrides(overrides: UiStringOverrides): void {
  i18n.addResourceBundle('en', 'translation', overrides.en, /* deep */ true, /* overwrite */ true);
  i18n.addResourceBundle('ka', 'translation', overrides.ka, /* deep */ true, /* overwrite */ true);
}
