#!/usr/bin/env node
/**
 * Guardrail for the web-app no-shadow rule: borders and backgrounds provide
 * separation, not box-shadows. Bans Tailwind `shadow-*` / `drop-shadow-*`
 * utility classes anywhere under src/.
 *
 * The only sanctioned `shadow-` usages are react-three-fiber light props in
 * Scene3D.tsx (shadow-mapSize, shadow-camera-*, shadow-bias, …), which are
 * three.js config, not CSS — that file is skipped.
 *
 * Wired into `npm run lint`. If this gets in the way, fix the offending markup
 * (use a border/background), don't loosen the rule.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// `new URL('..', import.meta.url).pathname` yields a leading-slash, percent-encoded
// path that breaks on Windows (`/C:/…` → `path.join` produces `C:\C:\…`). `fileURLToPath`
// decodes correctly and handles drive letters on every platform.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN = join(ROOT, 'src');
const SKIP_FILES = new Set(['Scene3D.tsx']); // react-three-fiber shadow-* light props
const EXTS = new Set(['.ts', '.tsx']);
const PATTERN = /shadow-/;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
      continue;
    }
    const dot = entry.lastIndexOf('.');
    if (dot < 0 || !EXTS.has(entry.slice(dot))) continue;
    if (SKIP_FILES.has(entry)) continue;
    yield full;
  }
}

let violations = 0;
for (const file of walk(SCAN)) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (PATTERN.test(line)) {
        console.error(
          `${relative(ROOT, file)}:${i + 1}  banned shadow-* utility — use a border/background for separation`,
        );
        violations++;
      }
    });
}

if (violations > 0) {
  console.error(
    `\n✖ ${violations} shadow-* violation(s). The web-app uses borders/backgrounds for separation, not shadows. See docs/primitives.md.`,
  );
  process.exit(1);
}
console.log('✓ no shadow-* violations');
