#!/usr/bin/env node
/**
 * Guardrail for the hand-mirrored inspection engine.
 *
 * The unified inspection engine (web-app/src/lib/inspection/ +
 * web-app/src/features/inspections/structured/) is HAND-MIRRORED from the Expo
 * app's lib/inspection/ so both platforms round-trip byte-identical acts (see
 * CLAUDE.md "Web codebases" and web-app/UNIFIED_INSPECTIONS_PLAN.md). Importing
 * the live mobile engine via `@root/lib/inspection/*` would silently couple web
 * to mobile and defeat the mirror — a divergence that only surfaces as a
 * corrupt PDF or a rejected equipment row in production.
 *
 * This bans `@root/lib/inspection` and `@root/lib/inspection/**` anywhere under
 * src/. It deliberately does NOT ban the sibling file `@root/lib/inspectionPdf-
 * Template` (an accepted cross-platform import): the match requires a `/` or a
 * closing quote right after "inspection", so "inspectionPdfTemplate" is safe.
 *
 * BLOCKING: wired as `npm run lint:inspection-guard` and required before the
 * prod deploy (deploy-web-app.yml) + on every push/PR (ci-web-app.yml). The
 * broad @root allowlist rule in eslint.config.js stays a *warning* on purpose
 * (several shared imports are accepted); this script is the one @root reach
 * that must hard-fail. If it fires, mirror the change into
 * web-app/src/lib/inspection/ instead of importing @root.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN = join(ROOT, 'src');
const EXTS = new Set(['.ts', '.tsx']);
// `@root/lib/inspection` followed by a subpath slash or the closing import
// quote (', ", `). Excludes `@root/lib/inspectionPdfTemplate`, `...Template`,
// etc. because those have a letter — not `/` or a quote — after "inspection".
const PATTERN = /@root\/lib\/inspection(?:\/|['"`])/;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
      continue;
    }
    const dot = entry.lastIndexOf('.');
    if (dot < 0 || !EXTS.has(entry.slice(dot))) continue;
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
          `${relative(ROOT, file)}:${i + 1}  banned import of the mobile inspection engine (@root/lib/inspection) — mirror it into web-app/src/lib/inspection/ instead`,
        );
        violations++;
      }
    });
}

if (violations > 0) {
  console.error(
    `\n✖ ${violations} inspection-engine import(s). web-app hand-mirrors the engine; it must not import @root/lib/inspection. See web-app/UNIFIED_INSPECTIONS_PLAN.md.`,
  );
  process.exit(1);
}
console.log('✓ no @root/lib/inspection imports (mirror intact)');
