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

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN_DIRS = ['app', 'components', 'lib', 'shims'];
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
      'Call usePhotoWithLocation().pickPhotoWithAnnotation() instead of invoking ImagePicker directly. ' +
      'Only hooks/usePhotoWithLocation.ts and app/photo-picker.tsx may call ImagePicker directly. ' +
      'See docs/primitives.md → "Mobile photo picker + annotation".',
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
      rel === 'hooks/usePhotoWithLocation.ts' ||
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
      for (const rule of RULES) {
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
