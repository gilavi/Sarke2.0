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

const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname);
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
    name: 'mobile-only-photo-embed',
    pattern: /\bembedInspectionPhotos\b/,
    allow: ['lib/pdfShared.ts', 'lib/breathalyzerLogPdf.ts'],
    message:
      'embedInspectionPhotos only resolves mobile base64, so PDF photos render blank on the web dashboard. ' +
      'Inspection PDFs must go through the schema engine: resolveInspectionPhotos (lib/inspection/photos.ts) ' +
      'via renderInspectionPdf (lib/inspection/renderMobile.ts), which resolves signed URLs on web and base64 on mobile. ' +
      'See docs/primitives.md → "Inspection PDF engine".',
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
const selfPath = new URL(import.meta.url).pathname;

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    if (file === selfPath) continue;
    // The canonical owner is allowed to mention the legacy names in comments
    // or as soft-deprecation aliases; skip lib/imageUrl.ts and pdfLanguagePref.ts.
    const rel = relative(ROOT, file);
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
    const lines = body.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Bans target code, not prose — skip comment lines.
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
      for (const rule of RULES) {
        if (rule.allow && rule.allow.includes(rel)) continue;
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
