# Primitives — canonical owners

This is the index of cross-cutting helpers that have a **single canonical owner**. If you need behavior that one of these primitives covers, use the listed export. Don't reach for the underlying RN/Expo/Supabase API directly, and don't add a parallel helper next to it — fix the canonical one.

The single most common bug pattern in this repo (see [BUG_REPORT.md](../BUG_REPORT.md)) is the same primitive getting reinvented in two or three places, each with a slightly different default. Every duplicate is a future bug.

`scripts/check-primitives.mjs` enforces a small subset of these via `npm run lint`. Whenever an entry below would benefit from automated enforcement, add a rule there.

## Storage images

One file: [lib/imageUrl.ts](../lib/imageUrl.ts). Three exports, named by purpose so picking the right name picks the right defaults:

| Use case | Function | Returns | On failure |
|---|---|---|---|
| RN `<Image>` display | `imageForDisplay(bucket, path)` | signed URL (or data URL fallback, or public URL) | never throws |
| Photo embedded in PDF HTML | `pdfPhotoEmbed(bucket, path, opts?)` | resized JPEG `data:` URL (1200px / q0.7), disk-cached | throws |
| Signature embedded in PDF or signature canvas | `signatureAsDataUrl(bucket, path)` | byte-exact `data:` URL | throws |

**Don't** add a fourth export. If you think you need one, you almost certainly want `pdfPhotoEmbed` with custom `opts`. The previous four-export version of this file caused the P1 "PDFs silently used unreachable signed URLs" bug because the wrong-default `getStorageImageDataUrl` was easy to call by accident.

## Keyboard handling

Three patterns, documented in detail in [README.md](../README.md#keyboard-handling--the-three-patterns). One library: `react-native-keyboard-controller` (must be imported from there, **never** from `react-native`).

| Surface | Wrapper |
|---|---|
| Full-screen forms (auth, settings, new-X screens) | `<KeyboardAwareScreen>` from [components/layout/KeyboardSafeArea.tsx](../components/layout/KeyboardSafeArea.tsx) |
| Bottom sheets with text inputs | `<SheetLayout>` body + `useSheetKeyboardMargin()` on the card from [lib/useSheetKeyboardMargin.ts](../lib/useSheetKeyboardMargin.ts) |
| Inspection wizard (custom layout) | `KeyboardAvoidingView` from `react-native-keyboard-controller` with `keyboardVerticalOffset = insets.top + measured headerH` |

**Don't** wrap a sheet in `KeyboardAvoidingView` — the inner `KeyboardAwareScrollView` already lifts content, and stacking the two causes the overshoot bug. **Don't** roll a hand-listener `keyboardWillShow`/`Hide` — both have happened in this repo and both broke the keyboard sync.

## PDF language preference

One file: [lib/pdfLanguagePref.ts](../lib/pdfLanguagePref.ts). Exports `savePdfLanguage`, `loadStoredPdfLanguage`. Don't `AsyncStorage.setItem('pdf_language', ...)` directly — there used to be a duplicate writer in `lib/i18n.ts` that drifted. The check script blocks direct AsyncStorage access to that key.

## Date formatting

One file: [lib/formatDate.ts](../lib/formatDate.ts). `lib/locale.ts` was deleted on 2026-05-02; do not resurrect it. `app/(tabs)/home.tsx` and `app/(tabs)/more.tsx` have small i18n-aware inline formatters for relative-time labels — that's intentional, they're tied to the i18n hook in those screens. If you need a generic absolute-date formatter, use `formatShortDateTime` here.

## Toast / error messages

- User-facing error → wrap in `friendlyError()` from [lib/errorMap.ts](../lib/errorMap.ts) before passing to `toast.error()`.
- Toast hook: `useToast()` from [lib/toast.tsx](../lib/toast.tsx).

## Storage bucket names

Always reference via `STORAGE_BUCKETS.x` from [lib/supabase.ts](../lib/supabase.ts). Never inline string literals like `'incident-photos'` — bucket renames have to ripple through the whole codebase otherwise.

## Adding a new primitive

If you're about to add a util in `lib/` or a wrapper in `components/`:

1. Search this file and `lib/` for an existing canonical owner. If one exists and is wrong, **fix it** — don't add a sibling.
2. If you genuinely need a new primitive, give it a single canonical owner, name it by purpose (not implementation), and add a row here.
3. If the new primitive can be misused by reaching for the underlying API (RN, Expo, Supabase), add a rule to `scripts/check-primitives.mjs`.
