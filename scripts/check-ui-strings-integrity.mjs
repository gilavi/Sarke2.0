#!/usr/bin/env node
// scripts/check-ui-strings-integrity.mjs
//
// Reads the LIVE public.ui_strings table (via the public anon key — the table
// is public-read, see lib/i18nOverlay.ts) and flags rows whose `ka` value looks
// like Latin-transliterated Georgian rather than actual Georgian script. This is
// the exact corruption signature found in 2026-07 (an undocumented manual paste
// into the Supabase Dashboard SQL editor turned e.g. "სამუშაო მანძილი" into
// "SAMUShaO MANZILI") — 137 of 287 `inspections.*` keys were affected.
//
// Needs live network access, so it is NOT wired into `npm run lint`. Run it
// ad hoc before/after applying a seed-ui-strings.mjs upsert to confirm the live
// table actually holds correct values before code starts reading them via t().
//
//   node scripts/check-ui-strings-integrity.mjs                    # inspections.* only
//   node scripts/check-ui-strings-integrity.mjs --all               # whole table
//   node scripts/check-ui-strings-integrity.mjs --prefix inspections.sn

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// Public, non-secret values — same ones hardcoded in app.config.ts's PRODUCTION
// block and used by the app itself for the anon-key overlay fetch.
const SUPABASE_URL = 'https://seskuthiopywrgntsgfw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OF_L2E27-Uv8MMw87fWfSA_znD7moYY';

const GEO = /[Ⴀ-ჿ]/;

const args = process.argv.slice(2);
const all = args.includes('--all');
const prefixIdx = args.indexOf('--prefix');
const prefix = prefixIdx >= 0 ? args[prefixIdx + 1] : (all ? '' : 'inspections.');

/** Flatten a nested i18n object to dotted-path → string entries (string leaves only). */
function flatten(obj, prefixPath = '', out = {}) {
  if (obj === null || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = prefixPath ? `${prefixPath}.${k}` : k;
    if (v !== null && typeof v === 'object') flatten(v, key, out);
    else if (typeof v === 'string') out[key] = v;
  }
  return out;
}

/** Heuristic: a `ka` value that contains zero Georgian-script characters (and
 * is non-empty) is almost certainly a transliteration-corrupted row, not a
 * legitimate Georgian string. */
function looksCorrupted(value) {
  return typeof value === 'string' && value.trim() !== '' && !GEO.test(value);
}

async function main() {
  const kaAll = flatten(JSON.parse(readFileSync(join(repoRoot, 'locales/ka.json'), 'utf8')));
  const enAll = flatten(JSON.parse(readFileSync(join(repoRoot, 'locales/en.json'), 'utf8')));

  const url = `${SUPABASE_URL}/rest/v1/ui_strings?select=key,ka,en&key=like.${encodeURIComponent(prefix)}*&order=key`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if (!res.ok) {
    console.error(`✗ Failed to read ui_strings: HTTP ${res.status}`);
    process.exit(1);
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) {
    console.error('✗ Unexpected response:', JSON.stringify(rows));
    process.exit(1);
  }

  const corrupted = [];
  const placeholderMismatch = [];
  const placeholders = (v) => (v.match(/{{\s*[\w.]+\s*}}/g) ?? []).map((t) => t.replace(/\s+/g, '')).sort();

  for (const row of rows) {
    if (looksCorrupted(row.ka)) corrupted.push(row);
    const enPh = placeholders(row.en ?? '');
    const kaPh = placeholders(row.ka ?? '');
    if (JSON.stringify(enPh) !== JSON.stringify(kaPh)) placeholderMismatch.push(row);
  }

  console.log(`Checked ${rows.length} live row(s) matching prefix "${prefix || '(all)'}"`);

  if (corrupted.length === 0 && placeholderMismatch.length === 0) {
    console.log('✓ No corruption or placeholder mismatches found.');
    return;
  }

  if (corrupted.length) {
    console.error(`\n✗ ${corrupted.length} row(s) look corrupted (ka value has no Georgian script):`);
    for (const r of corrupted.slice(0, 50)) {
      const bundled = kaAll[r.key];
      console.error(`  ${r.key}\n    live:    ${JSON.stringify(r.ka)}\n    bundled: ${JSON.stringify(bundled ?? '(no matching bundled key)')}`);
    }
    if (corrupted.length > 50) console.error(`  ...and ${corrupted.length - 50} more`);
  }

  if (placeholderMismatch.length) {
    console.error(`\n✗ ${placeholderMismatch.length} row(s) have mismatched {{placeholder}} tokens between live en/ka:`);
    for (const r of placeholderMismatch.slice(0, 20)) console.error(`  ${r.key}`);
  }

  console.error(
    '\nFix: regenerate a scoped upsert (node scripts/seed-ui-strings.mjs --reset --prefix ' +
      `"${prefix || ''}") and apply it via the authed CLI (supabase db query --linked --yes --file <sql>), ` +
      'then re-run this check.',
  );
  process.exit(1);
}

main();
