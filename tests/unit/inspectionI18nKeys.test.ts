import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flatten } from '../../lib/i18nFlatten';
import en from '../../locales/en.json';
import ka from '../../locales/ka.json';

// There is no i18next TypeScript key-safety in this repo, and a typo'd key
// silently renders the raw key string at runtime (including on a generated
// legal PDF). This statically scans every `t('inspections.…')` /
// `i18n.t('inspections.…')` string-literal call site in the equipment-
// inspection surfaces and asserts each key actually exists in BOTH locale
// files — the static counterpart to i18nParity.test.ts, which only checks
// the two locale files agree with each other, not that code references are
// valid.

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

// Same scope as the i18n-CMS migration: wizard screens, question catalogs,
// PDF schemas, and the shared PDF engine.
const SCAN_DIRS = ['app/inspections', 'lib/inspection', 'types'];
const SKIP_DIRS = new Set(['node_modules', '.git', '__tests__', '__mocks__']);
const EXTS = new Set(['.ts', '.tsx']);

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      yield* walk(full);
    } else if (st.isFile()) {
      const dot = name.lastIndexOf('.');
      if (dot >= 0 && EXTS.has(name.slice(dot)) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) {
        yield full;
      }
    }
  }
}

// Matches `t('inspections.foo')`, `t("inspections.foo")`, `i18n.t('inspections.foo')` —
// string-literal keys only. Dynamic keys (template literals with `${...}`)
// can't be statically verified and are intentionally not matched.
const CALL_RE = /\bi18n\.t\(\s*['"](inspections\.[\w.]+)['"]|(?<!i18n\.)\bt\(\s*['"](inspections\.[\w.]+)['"]/g;

// Question-catalog entries (checklist items etc.) resolve their label at
// render/generation time via `t(entry.labelKey)` rather than a literal call —
// but `labelKey`/`descriptionKey` is itself always written as a literal string
// property right next to the entry's id, by convention (see types/safetyNet.ts
// for the reference shape). Match that literal-property pattern too, so
// catalog labels stay just as statically verifiable as direct t() calls.
const PROP_RE = /\b(?:labelKey|descriptionKey)\s*:\s*['"](inspections\.[\w.]+)['"]/g;

function findKeyRefs(source: string): string[] {
  const keys: string[] = [];
  for (const m of source.matchAll(CALL_RE)) {
    keys.push(m[1] ?? m[2]);
  }
  for (const m of source.matchAll(PROP_RE)) {
    keys.push(m[1]);
  }
  return keys;
}

const flatEn = flatten(en);
const flatKa = flatten(ka);

describe('inspection i18n key references resolve to real keys', () => {
  const refs: { key: string; file: string }[] = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(repoRoot, dir))) {
      const rel = relative(repoRoot, file);
      const src = readFileSync(file, 'utf8');
      for (const key of findKeyRefs(src)) refs.push({ key, file: rel });
    }
  }

  it('found at least one t(\'inspections.…\') call site (sanity check the scan itself works)', () => {
    expect(refs.length).toBeGreaterThan(0);
  });

  it('every referenced key exists in locales/en.json', () => {
    const missing = refs.filter((r) => !(r.key in flatEn));
    expect(missing).toEqual([]);
  });

  it('every referenced key exists in locales/ka.json', () => {
    const missing = refs.filter((r) => !(r.key in flatKa));
    expect(missing).toEqual([]);
  });
});
