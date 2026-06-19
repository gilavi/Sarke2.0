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
const SCAN_DIRS = ['app', 'components', 'features', 'lib', 'shims'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'ios', 'android', '.expo', 'dist', 'build']);
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

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
