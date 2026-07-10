#!/usr/bin/env node
// Lightweight guardrail against the "duplicate primitive" failure mode:
// each entry below names a (regex, message) pair that, if matched in any
// source file under app/ components/ lib/ shims/, fails the lint step.
//
// Use this for a small set of HIGH-CONFIDENCE bans — wrong-default helpers
// that have already caused bugs, or imports that consistently get reached
// for instead of the canonical wrapper. Keep the list short. If a rule
// gets noisy, fix the underlying duplication instead of adding allow-lists.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath (not `new URL(...).pathname`) so this resolves to a NATIVE path
// on every OS. The old `decodeURIComponent(new URL('..', …).pathname)` produced
// `/C:/…/` on Windows, which `path.join` turned into the invalid `\C:\…` — every
// readdirSync then threw ENOENT and walk() silently scanned zero files, making
// the whole guardrail a no-op on Windows (it only ever ran on Linux CI).
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_DIRS = ['app', 'components', 'features', 'hooks', 'lib', 'shims', 'locales'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'ios', 'android', '.expo', 'dist', 'build']);
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json']);

const RULES = [
  {
    name: 'bare-KeyboardAvoidingView',
    pattern: /from\s+['"]react-native['"][^;]*\bKeyboardAvoidingView\b|\bKeyboardAvoidingView\b[^;]*from\s+['"]react-native['"]/,
    message:
      'Import KeyboardAvoidingView from "react-native-keyboard-controller", not "react-native". The bare RN version does not coordinate with the keyboard-aware sheet/scroll wrappers — see README "Keyboard handling".',
  },
  {
    name: 'bare-RefreshControl',
    // Single-line `import { … RefreshControl … } from 'react-native'`. The
    // canonical owner (components/primitives/RefreshControl.tsx) is allow-listed.
    pattern: /import\s*\{[^}]*\bRefreshControl\b[^}]*\}\s*from\s+['"]react-native['"]/,
    allow: ['components/primitives/RefreshControl.tsx'],
    message:
      'Import RefreshControl from "components/primitives", not "react-native". The themed primitive owns the refreshing state + haptic + brand tint — see docs/primitives.md → "Pull-to-refresh".',
  },
  {
    name: 'direct-slide-image-field',
    // Member access on the legacy single-photo slide fields via a `slide`/`s`
    // receiver. A report slide holds 1–2 photos in `images`; the legacy
    // image_path/annotated_image_path only mirror images[0], so reading them
    // directly silently sees just the first photo. The canonical owner
    // (lib/reportSlides.ts) is allow-listed. Reads of a `SlideImage` (e.g.
    // `img.image_path`) are fine — only `slide.`/`s.` receivers are banned.
    pattern: /\b(?:slide|s)\.(?:image_path|annotated_image_path)\b/,
    allow: ['lib/reportSlides.ts'],
    message:
      'Read report-slide photos via lib/reportSlides.ts (slideImages / slideImagePath / slideImagePaths), ' +
      'not slide.image_path / slide.annotated_image_path — those legacy fields only mirror the first of up to 2 photos. ' +
      'See docs/primitives.md → "Report slide photos + layout".',
  },
  {
    name: 'legacy-image-helper',
    pattern: /\b(getStorageImageDataUrl|getStorageImageDataUrlStrict|getStorageImageResizedDataUrl|getStorageImageDisplayUrl)\b/,
    message:
      'Legacy image helper. Use one of: imageForDisplay (RN <Image>), pdfPhotoEmbed (PDF photos), signatureAsDataUrl (PDF/canvas signatures). See docs/primitives.md.',
  },
  {
    name: 'pdfLanguage-direct-asyncStorage',
    pattern: /AsyncStorage\.(set|get|remove)Item\(\s*['"]pdf_language['"]/,
    message:
      'Use lib/pdfLanguagePref.ts (savePdfLanguage / loadStoredPdfLanguage) instead of touching the AsyncStorage key directly.',
  },
  {
    name: 'direct-image-picker',
    pattern: /ImagePicker\.(launchCameraAsync|launchImageLibraryAsync)\s*\(/,
    message:
      'Call usePhotoPicker().pickPhotoWithAnnotation() instead of invoking ImagePicker directly. ' +
      'Only hooks/usePhotoPicker.ts and app/photo-picker.tsx may call ImagePicker directly. ' +
      'See docs/primitives.md → "Mobile photo picker + annotation".',
  },
  {
    name: 'direct-record-create-in-screen',
    // Document flows must write through saveRecordThroughOutbox (lib/outbox)
    // so offline saves queue instead of failing. Direct create/update calls on
    // the record apis are allowed only inside lib/ (registry, documents
    // duplicate/reopen, services) — never in screens/components/features.
    pattern: /\b(ordersApi|briefingsApi|riskAssessmentApi|breathalyzerLogApi)\.(create|update|patch|patchEntries|patchDeviceSerial|close)\s*\(/,
    allowPrefixes: ['lib/'],
    message:
      'Write records through saveRecordThroughOutbox (lib/outbox) instead of calling the record api ' +
      'directly from a screen — direct writes fail offline instead of queueing. See docs/primitives.md → "Offline write outbox".',
  },
  {
    name: 'inline-list-load-guard',
    // The pre-offline-mode skeleton recipe `(q.isFetching || !q.isFetched)`.
    // With onlineManager wired (lib/queryClient.ts), an offline query with no
    // cache is fetchStatus 'paused' → the inline guard shows a skeleton
    // forever. The canonical owner adds the missing 'offline' state.
    pattern: /\w+\.isFetching\s*\|\|\s*!\w+\.isFetched/,
    allow: ['hooks/useListLoadState.ts'],
    message:
      'Use useListLoadState / listsLoadState (hooks/useListLoadState.ts) instead of the inline ' +
      '"(q.isFetching || !q.isFetched)" guard — the inline recipe hangs on an offline paused query. ' +
      'See docs/primitives.md → "List load state".',
  },
  {
    name: 'mixed-script-georgian',
    // Latin letters spliced INSIDE a Georgian word — the signature of a botched
    // case-sensitive find/replace (shipped as 'სERIული ნომERი' in the excavator
    // flow, v1.2.1). Georgian text may legitimately sit next to Latin across a
    // space/hyphen ("PDF-ის"), but a Georgian letter immediately followed by
    // Latin letters and another Georgian letter is always corruption.
    pattern: /[ა-ჰ][A-Za-z]+[ა-ჰ]/,
    message:
      'Latin letters embedded inside a Georgian word — almost certainly a corrupted find/replace. ' +
      'Restore the Georgian spelling (e.g. "სერიული ნომერი", not "სERIული ნომERი").',
  },
  {
    name: 'remote-avatar-service',
    pattern: /api\.dicebear\.com/,
    message:
      'Render user identity via components/UserAvatar.tsx (local deterministic initials disc), not a remote ' +
      'avatar service — boot-critical chrome must not depend on an external host, and it renders blank offline. ' +
      'See docs/primitives.md → "User avatar".',
  },
  {
    name: 'hand-rolled-inspection-route',
    // Equipment-type detail routes must come from routeForInspection
    // (lib/inspectionRouting.ts). Hand-rolled `/inspections/<type>/${id}`
    // dispatch has drifted twice (app/history.tsx, then the per-project
    // "all inspections" list): a 3-type inline switch silently mis-routes the
    // other equipment types to the generic detail screen. Flow-internal
    // navigation inside app/inspections/** (e.g. …/done) is allowed.
    pattern: /\/inspections\/(bobcat|excavator|general-equipment|cargo-platform|safety-net|mobile-ladder|fall-protection|lifting-accessories|forklift)\/\$\{/,
    allow: ['lib/inspectionRouting.ts'],
    allowPrefixes: ['app/inspections/'],
    message:
      'Build inspection detail hrefs with routeForInspection (lib/inspectionRouting.ts), not an inline ' +
      '`/inspections/<type>/${id}` literal — hand-rolled dispatch has repeatedly missed newer equipment types. ' +
      'See docs/primitives.md → "Inspection detail routing".',
  },
  {
    name: 'mobile-only-photo-embed',
    pattern: /\bembedInspectionPhotos\b/,
    allow: ['lib/pdfShared.ts', 'lib/breathalyzerLogPdf.ts'],
    message:
      'embedInspectionPhotos only resolves mobile base64, so PDF photos render blank on the web dashboard. ' +
      'Inspection PDFs must go through the schema engine: resolveInspectionPhotos (lib/inspection/photos.ts) ' +
      'via renderInspectionPdf (lib/inspection/renderMobile.ts), which resolves signed URLs on web and base64 on mobile. ' +
      'See docs/primitives.md → "Inspection PDF engine".',
  },
  {
    name: 'raw-error-toast',
    // toast.error() must receive a localized string: a t('…') key or a
    // friendlyError(e, fallback) mapping (lib/errorMap.ts). A bare caught error,
    // a toErrorMessage() call, a String(e), or a `…${toErrorMessage(e)}`
    // template leaks raw English / Postgres text into the Georgian UI — the
    // exact "same primitive, different defaults" class primitives.md warns of.
    // t('…')-keyed calls (even with a { detail } param) and plain string
    // literals are allowed because the anchored group only fires on the raw
    // forms that immediately follow `toast.error(`.
    pattern: /toast\.error\(\s*(`|toErrorMessage\s*\(|String\s*\(|(?:e|err|error|ex)\s*[),])/,
    message:
      'Route user-facing errors through friendlyError(e, fallback) (lib/errorMap.ts) before toast.error — ' +
      'a bare error / toErrorMessage() / String(e) / template literal surfaces raw untranslated text in the ' +
      'Georgian UI. t(\'…\') keys and string literals are fine. See docs/primitives.md → "User-facing errors".',
  },
  {
    name: 'raw-rn-text',
    // Raw react-native <Text> ships no Dynamic Type cap and no theme ink color,
    // so it breaks in dark mode and overflows at large accessibility sizes.
    // Render through the A11yText primitive instead:
    //   import { A11yText as Text } from '.../components/primitives/A11yText';
    // Scoped to the UI layers; A11yText itself is the only allowed raw consumer.
    // wholeFile so multi-line `import { … Text … }` blocks are caught too.
    wholeFile: true,
    onlyPrefixes: ['app/', 'features/', 'components/'],
    allow: ['components/primitives/A11yText.tsx'],
    pattern: /import\s*\{[^}]*\bText\b[^}]*\}\s*from\s+['"]react-native['"]/,
    message:
      'Render text via the A11yText primitive (import { A11yText as Text } from ".../components/primitives/A11yText"), ' +
      'not raw react-native Text — the raw primitive has no Dynamic Type cap and no theme color, so it breaks in ' +
      'dark mode and at large font sizes. See docs/primitives.md → "Accessible text (A11yText)".',
  },
];

function* walk(dir) {
  let entries;
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
      if (dot >= 0 && EXTS.has(name.slice(dot))) yield full;
    }
  }
}

let violations = 0;
const selfPath = fileURLToPath(import.meta.url);

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    if (file === selfPath) continue;
    // The canonical owner is allowed to mention the legacy names in comments
    // or as soft-deprecation aliases; skip lib/imageUrl.ts and pdfLanguagePref.ts.
    // Normalize to forward slashes so the path-based allow-lists below (and the
    // per-rule allow/allowPrefixes/onlyPrefixes) match on Windows too, where
    // relative() returns backslash-separated paths.
    const rel = relative(ROOT, file).split('\\').join('/');
    if (
      rel === 'lib/imageUrl.ts' ||
      rel === 'lib/pdfLanguagePref.ts' ||
      rel === 'lib/projectLogo.ts' ||
      rel === 'hooks/usePhotoPicker.ts' ||
      rel === 'app/photo-picker.tsx'
    ) continue;

    let body;
    try {
      body = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    // Whole-file rules run once against the full body so multi-line import
    // blocks (e.g. `import {\n  Text,\n} from 'react-native'`) are caught, which
    // a per-line scan would miss.
    for (const rule of RULES) {
      if (!rule.wholeFile) continue;
      if (rule.allow && rule.allow.includes(rel)) continue;
      if (rule.onlyPrefixes && !rule.onlyPrefixes.some((p) => rel.startsWith(p))) continue;
      if (rule.allowPrefixes && rule.allowPrefixes.some((p) => rel.startsWith(p))) continue;
      const m = rule.pattern.exec(body);
      if (m) {
        const lineNo = body.slice(0, m.index).split('\n').length;
        console.error(`${rel}:${lineNo}  [${rule.name}] ${rule.message}`);
        console.error(`    ${m[0].split('\n').join(' ').trim()}`);
        violations++;
      }
    }

    const lines = body.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Bans target code, not prose — skip comment lines.
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
      for (const rule of RULES) {
        if (rule.wholeFile) continue;
        if (rule.allow && rule.allow.includes(rel)) continue;
        if (rule.onlyPrefixes && !rule.onlyPrefixes.some((p) => rel.startsWith(p))) continue;
        if (rule.allowPrefixes && rule.allowPrefixes.some((p) => rel.startsWith(p))) continue;
        if (rule.pattern.test(line)) {
          console.error(`${rel}:${i + 1}  [${rule.name}] ${rule.message}`);
          console.error(`    ${line.trim()}`);
          violations++;
        }
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} primitive violation${violations === 1 ? '' : 's'}. See docs/primitives.md.`);
  process.exit(1);
}
console.log('check-primitives: ok');
