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
 * nested `en` / `ka` resource trees. Throws on a Supabase error (React Query
 * handles retry/caching upstream).
 */
export async function fetchUiStrings(): Promise<UiStringOverrides> {
  const { data, error } = await supabase.from('ui_strings').select('key, en, ka');
  if (error) throw error;
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return { en: unflatten(rows, 'en'), ka: unflatten(rows, 'ka') };
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
