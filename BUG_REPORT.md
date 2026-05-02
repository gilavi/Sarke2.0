# Sarke 2.0 — Manual Test Pass + Fixes

**Tester:** Claude (iOS Simulator, iPhone 17, iOS 26.4 via Expo Go)
**Date:** 2026-04-25
**Build:** main @ `1ebe2f8`
**Account:** Giorgi Kheladze (gilavi2000@gmail.com)

## Summary

One real bug found — a **P0** infinite redirect loop between the wizard and the inspection-detail screen — root-caused and fixed. The other items in my initial pass turned out to be either downstream effects of the loop, simulator artifacts, or a misobservation. No code changes needed for the rest.

## P0 — Wizard ↔ detail-screen ping-pong loop · FIXED

**Repro:** From Home, tap "გააგრძელე დრაფტი" (or any draft in Recent activity).
**Symptom:** Wizard shows skeletons forever (>25s, never resolves). Bottom tab bar disappears. App appears frozen.

**Root cause:** When the user finishes an inspection, `saveConclusionAndGo` writes a `{status: 'completed', completed_at: …}` patch into the offline queue and stashes a copy at `@offline:questionnaire:<id>` for optimistic UI. If that flush failed (network blip, app killed, etc.), the patch survived but the server row stayed `draft`.

On the next open, the wizard's `load()` overlaid this stale patch on the server row:

```ts
const qMerged: Inspection = { ...q, ...(localPatch ?? {}) };
```

That flipped local `status` to `'completed'`, which fired `<CompletedRedirect>` → `router.replace('/inspections/{id}')`. The detail screen then loaded the same row from the server, saw `status === 'draft'`, and called `router.replace('/inspections/{id}/wizard')`. Loop. Each cycle takes a few seconds; the user sees skeletons the whole time.

This was masked by the screen mounting/unmounting so fast that the safety 15s timeout kept getting reset, and Metro showed no errors because each individual load() returned cleanly.

**Fix** in [app/inspections/[id]/wizard.tsx](app/inspections/[id]/wizard.tsx): strip `status` and `completed_at` from the local patch before merging — those fields are server-canonical, and the queue's flush worker is responsible for getting the server to agree. Other fields (`conclusion_text`, `is_safe_for_use`, `harness_name`) still overlay so the user sees their unsynced edits.

```ts
const safePatch = localPatch ? { ...localPatch } : null;
if (safePatch) {
  delete (safePatch as Partial<Inspection>).status;
  delete (safePatch as Partial<Inspection>).completed_at;
}
const qMerged: Inspection = { ...q, ...(safePatch ?? {}) };
```

**Verified:** Simulator, after fix — Continue draft → wizard loads in ~1s on q1/17 with the previously-tapped "კი" highlighted. Stepped to q7/17 (scaffold radio), tapped a row, opened exit modal, saved as draft, back to home. Recent activity bumps to "8 სთ. წინ". Clean round-trip, no loops, no skeleton-stuck states.

## P1-1 — Empty `კითხვარი` screen on back · resolved by P0 fix

This was the wizard rendering its `if (!step)` "შინაარსი ვერ ჩაიტვირთა" branch after a stale stepIndex restored from AsyncStorage indexed past an empty `steps` array — itself a downstream effect of the load loop never reaching the questions/template fetch. With P0 fixed, `steps` is always populated by the time loading=false, so this branch no longer triggers.

## P2-1 — Radio selection invisible · misobservation, no bug

The scaffold-radio (`statusOption` style) and the harness chips both render a clear selected state (red/green border, filled icon, tinted text). I misread an earlier screenshot. Verified at q7 post-fix — selection is obvious.

## P0-2 — Layout shift on Cmd+R · simulator artifact, not a bug

The "content shifted off the right edge" I noted was the iOS Simulator window itself moving on the macOS desktop between screenshots, not in-app rendering. Inside the device frame the layout is correct.

## P1 — Add-participant sheet covered by keyboard + double handle bar · resolved 2026-04-28

**Repro:** Project detail → "მონაწილეები" section → tap an empty role slot (e.g. "ხარაჩოს ზედამხედველი"). The bottom sheet opens with the name input autofocused.

**Symptoms:**
1. Two horizontal grab-handle bars stacked at the top of the sheet, looking like an action sheet inside an action sheet.
2. The iOS keyboard covers the entire sheet — header, input, and "ხელმოწერა →" button all hidden.

**Root cause:**
1. Both `BottomSheet` (the provider's `sheetCard`) and `SheetLayout` rendered their own `handleBar` view, so `RoleSlotSheet` (which uses `SheetLayout` inside `BottomSheet.content`) showed both.
2. `BottomSheet`'s wrapper is `position: 'absolute'; bottom: 0` inside an RN `<Modal>`. RN Modals don't auto-resize for the keyboard on iOS, and `RoleSlotSheet` overrides `SheetLayout`'s default `KeyboardAwareScrollView` with `BottomSheetScrollView` (needed for swipe-down dismiss). Result: nothing in the chain pushes the sheet above the keyboard.

**Fix:**
- `components/SheetLayout.tsx`: added `showHandle` prop (default `true`) to opt out of the duplicate handle.
- `components/RoleSlotSheet.tsx`: passes `showHandle={false}`.
- `components/BottomSheet.tsx`: subscribed to `keyboardWillShow`/`keyboardWillHide` and animated a translateY offset on the sheet wrapper equal to `max(0, keyboardHeight - insets.bottom)`, so every form sheet (not just `RoleSlotSheet`) lifts above the keyboard with the matching iOS keyboard duration.

## P2-1 — Keyboard overlapping inputs across the app · resolved 2026-04-27

**Repro:** Inspection wizard → final `დასკვნა` step → tap the conclusion textarea on a short-viewport device (iPhone SE). The soft keyboard covers the input and the bottom action buttons. Same class of issue reported on auth screens, project modals, certificate signer name, and the harness comment field.

**Root cause:** Each screen reimplemented `KeyboardAvoidingView` with ad-hoc offsets, and several had no handling at all. The wizard's inner RN `ScrollView` did not auto-scroll the focused multiline input above the keyboard.

**Fix:** Adopted `react-native-keyboard-controller` globally. Added `<KeyboardProvider>` at the root (`app/_layout.tsx`), introduced a shared `components/KeyboardAwareScreen.tsx` (exports `KeyboardAwareScreen` + `KeyboardAwareScroll`), and migrated all existing `KeyboardAvoidingView` import sites to the library version (drop-in API). Wizard's inner `ScrollView` swapped for the lib's `KeyboardAwareScrollView` so the conclusion textarea now scrolls into view automatically. Certificate creation screen wrapped similarly.

## P3-1 — Accent-picker over question header · simulator hardware-keyboard quirk

The `À Á Â Ä …` strip rendering inside the conclusion text input is the macOS hardware-keyboard accent helper that the iOS Simulator forwards to the focused field. On a real device the soft keyboard appears instead and there's no overlap. No app change needed.

## Other note — `expo-haptics` version drift

Metro's compatibility warning still stands: `expo-haptics@55.0.14 - expected version: ~15.0.8`. Unrelated to the loop, but worth pinning to the SDK-aligned version next time `package.json` is touched.

## Files changed

- [app/inspections/[id]/wizard.tsx](app/inspections/[id]/wizard.tsx) — strip server-canonical fields from the local-patch overlay.
- [app/inspections/[id].tsx](app/inspections/[id].tsx) — comment update only, explaining why the bounce-to-wizard is now safe to keep.

## P1 — PDF embed silently used unreachable signed URLs · resolved 2026-04-29

**Repro:** Generate an incident or inspection PDF where the signature/photo data-URL fetch fails (e.g. transient Hermes blob bug or a slow signed-URL handshake).

**Symptom:** The PDF rendered with broken `<img>` tags. The user saw a finished-looking ოქმი but with missing photo and signature placeholders, with no error surfaced.

**Root cause:** `getStorageImageDataUrl` is intentionally tolerant — its 6th-and-last fallback is to return the raw signed URL string. That's fine for in-app `<Image>` display (the network layer fetches it), but `expo-print`'s WebView can't fetch Supabase signed URLs at render time, so the image silently fails. The strict variant `getStorageImageDataUrlStrict` exists exactly for this case but the new-incident, incident-detail, and inspection-detail PDF flows all called the loose variant.

**Fix:** Switched all PDF-embed call sites to `getStorageImageDataUrlStrict`. The wrapping `.catch(...)` blocks now correctly fire when no data-URL strategy worked, so missing assets are dropped from the PDF rather than embedded as unfetchable URLs.

## P2 — Briefing sign screen `setBriefing` after unmount · resolved 2026-04-29

**Repro:** Open a briefing's signing flow, then quickly back-tap before the initial `briefingsApi.getById` resolves.

**Fix:** Added a `cancelled` flag in [app/briefings/[id]/sign.tsx](app/briefings/[id]/sign.tsx) so the late `setBriefing` call no-ops when the component is gone.

## Files changed (2026-04-29)

- [app/incidents/new.tsx](app/incidents/new.tsx), [app/incidents/[id].tsx](app/incidents/[id].tsx), [app/inspections/[id].tsx](app/inspections/[id].tsx) — switched PDF-bound image fetches to the strict variant.
- [app/briefings/[id]/sign.tsx](app/briefings/[id]/sign.tsx) — cancel briefing fetch on unmount.

## P0 — Offline photo capture silently dropped · resolved 2026-04-30

**Repro:** Inspection wizard, no/intermittent network, take a photo on any photo-eligible question.

**Symptom:** Toast says "ფოტოს ასატვირთად საჭიროა ინტერნეტი" and the photo is gone. No queue, no local save. PDF rendered later is missing those photos with no recovery path.

**Root cause:** [app/inspections/[id]/wizard.tsx](app/inspections/[id]/wizard.tsx) `doUpload()` early-returned when `!offline.isOnline`. The offline queue handled answer/inspection upserts but had no photo op kind, so photos couldn't be deferred.

**Fix:** Added `photo_upload` queue op in [lib/offline.tsx](lib/offline.tsx). On enqueue we copy the picker's URI into a stable cache dir under `documentDirectory/offline-photos/` so OS eviction can't lose it. The flush worker uploads via `storageApi.uploadFromUri`, inserts the `answer_photos` row, then deletes the staged file. The wizard's `doUpload` now branches: online → live path; offline → enqueue + optimistic local-file thumbnail. Toast text updated to "ფოტო შენახულია — აიტვირთება ქსელის დაბრუნებისას".

## P1 — PDF photos bloated HTML payload (WKWebView freezes) · resolved 2026-04-30

**Repro:** Generate an inspection / incident / report PDF with 4+ photos.

**Symptom:** PDF generation hung 10–30s on the JS thread; on report-heavy projects WKWebView would freeze or OOM mid-render.

**Root cause:** [lib/imageUrl.ts](lib/imageUrl.ts) ships `getStorageImageResizedDataUrl` (1200px / JPEG 0.7 + on-disk cache, ~10× smaller payload), but only `app/certificates/new.tsx` called it. Inspections, incidents, and reports still inlined full-resolution iPhone JPEGs (~2 MB of base64 each).

**Fix:** Switched photo embeds to the resized helper in [app/inspections/[id].tsx](app/inspections/[id].tsx), [app/incidents/new.tsx](app/incidents/new.tsx), [app/incidents/[id].tsx](app/incidents/[id].tsx), [app/reports/[id].tsx](app/reports/[id].tsx), [app/reports/[id]/success.tsx](app/reports/[id]/success.tsx). Signatures stay on `getStorageImageDataUrlStrict` — they're already small PNGs and need byte-exact rendering.

## P3 — Duplicate `pdf_language` AsyncStorage writers · resolved 2026-04-30

**Root cause:** Both [lib/i18n.ts](lib/i18n.ts) and [lib/pdfLanguagePref.ts](lib/pdfLanguagePref.ts) exported `savePdfLanguage` writing the same key. Only the `pdfLanguagePref` variants were imported anywhere; the i18n.ts copies were dead code with divergence risk.

**Fix:** Removed `loadStoredPdfLanguage` and `savePdfLanguage` from [lib/i18n.ts](lib/i18n.ts). `pdfLanguagePref.ts` is now the sole owner of the `pdf_language` key.

## P3 — `app/signature.tsx` invalid Stack option · resolved 2026-04-30

`animationEnabled` is not a valid `Stack.Screen` option in expo-router v6. Removed it; the screen's modal animation is set on the root Stack via `animation: 'fade'`. Closes the only `npm run typecheck` error.

## Files changed (2026-04-30)

- [lib/offline.tsx](lib/offline.tsx) — added `photo_upload` op kind, `enqueuePhotoUpload`, staging dir.
- [app/inspections/[id]/wizard.tsx](app/inspections/[id]/wizard.tsx) — `doUpload` enqueues offline instead of dropping.
- [app/inspections/[id].tsx](app/inspections/[id].tsx), [app/incidents/new.tsx](app/incidents/new.tsx), [app/incidents/[id].tsx](app/incidents/[id].tsx), [app/reports/[id].tsx](app/reports/[id].tsx), [app/reports/[id]/success.tsx](app/reports/[id]/success.tsx) — switched photo embeds to `getStorageImageResizedDataUrl`.
- [lib/i18n.ts](lib/i18n.ts) — removed duplicate `pdf_language` accessors.
- [app/signature.tsx](app/signature.tsx) — drop invalid `animationEnabled` Stack option.

## P0 — Web bundle crashed at boot with `WorkletsError` · resolved 2026-04-30

**Repro:** `npx expo start --web` → open in browser → red error overlay before login renders:

> `[Worklets] createSerializableObject should never be called in JSWorklets.`

Stack: `cloneWorklet → cloneObjectProperties → createSerializableNative → createSerializableObject (JSWorklets)` — fired from `node_modules/react-native-worklets/lib/module/threads.js:131` at module-init. Same error reported upstream as [reanimated#8285](https://github.com/software-mansion/react-native-reanimated/issues/8285).

**Root cause:** `react-native-worklets@0.5.1` decides between web-mode and native-mode `createSerializable` once at module-init, by reading `globalThis.__RUNTIME_KIND === RuntimeKind.ReactNative` inside `lib/module/PlatformChecker/index.js`. That global is seeded later (in the same package's `runtimeKind.ts`), so on the web bundle PlatformChecker evaluates first, the check fails, `SHOULD_BE_USE_WEB` stays `false`, and `createSerializable` falls through to the native path. The native path calls into a JSWorklets stub whose only behavior is to throw. Result: every Reanimated-using component (i.e. the entire app) crashes before any screen mounts.

**Fix:** Override the broken module on web only, via Metro's `resolveRequest`.

- New shim [shims/worklets-platform-checker.web.ts](shims/worklets-platform-checker.web.ts) — bypasses the runtime-kind dance and reads `Platform.OS` directly, so `SHOULD_BE_USE_WEB` is `true` whenever we're on web.
- [metro.config.js](metro.config.js) — when `platform === 'web'` and the importer lives inside `react-native-worklets`, redirect `./PlatformChecker` (and `./PlatformChecker/index`) to the shim. iOS/Android resolution is untouched.
- Defense-in-depth: [lib/polyfills.ts](lib/polyfills.ts) and [index.js](index.js) also pre-seed `globalThis.__RUNTIME_KIND = 1`. The Metro shim is the load-bearing fix; the global pre-seed protects us if a future worklets release loads `PlatformChecker` from a path the regex doesn't catch.
- Also added [shims/react-native-keyboard-controller.tsx](shims/react-native-keyboard-controller.tsx) — passthrough on web for `KeyboardProvider` / `KeyboardAwareScrollView` / etc, since the library registers worklet-backed event handlers that are unnecessary in the browser. Wired through the same `WEB_SHIMS` table in metro.config.js.

**Verified:** Cold-rebuild (`expo-clear`) → login screen renders cleanly on web with no console errors. `npm run typecheck` passes.

## P0 — Auth rejects valid credentials on web bundle · open

Logging in on the web bundle with the credentials that work on iOS simulator (`gio@fina2.net` / `Saqartvel0` and `saqartvel0`) returns "არასწორი ელ-ფოსტა ან პაროლი". Could be: (a) different Supabase project pointed at by web env, (b) password actually changed since the user wrote the note, (c) web bundle missing the env vars used by `lib/supabase.ts`. Did not have a working credential to drive past-login web smoke testing this session — flagging for the user. Native iOS path is unaffected (auth has not been touched).

## Files changed (2026-04-30, second pass)

- New [shims/worklets-platform-checker.web.ts](shims/worklets-platform-checker.web.ts), [shims/react-native-keyboard-controller.tsx](shims/react-native-keyboard-controller.tsx).
- [metro.config.js](metro.config.js) — `WEB_SHIMS` table + worklets-internal `PlatformChecker` redirect.
- [lib/polyfills.ts](lib/polyfills.ts), [index.js](index.js) — pre-seed `globalThis.__RUNTIME_KIND` so an out-of-order worklets load still lands in web mode.

## P0 — Storage RLS too permissive on `incident-photos` and `report-photos` · FIXED 2026-05-01

**Repro:** Sign in as user A, query `select * from storage.objects where bucket_id = 'incident-photos'` → returns user B's incident photos. Same for `report-photos`. `delete from storage.objects where ...` is also accepted.

**Root cause:** Policies created in [supabase/migrations/0017_incidents.sql](supabase/migrations/0017_incidents.sql) and [0019_reports.sql](supabase/migrations/0019_reports.sql) gated only on `auth.uid() IS NOT NULL` for SELECT/DELETE (and also INSERT for reports). Any authenticated user could read or delete any other user's files. Path convention is `{incident_id}/...` and `{report_id}/...`, so the row owner is reachable via the path's first segment.

**Fix** in [supabase/migrations/0020_storage_rls_and_timestamps.sql](supabase/migrations/0020_storage_rls_and_timestamps.sql): drop and recreate SELECT/DELETE policies with an `EXISTS` join to `incidents.user_id`/`reports.user_id`. INSERT for `incident-photos` is intentionally retained as `auth.uid() IS NOT NULL` because incident photos are uploaded optimistically before the row is created (see [app/incidents/new.tsx:227](app/incidents/new.tsx:227) — `incidentId` is client-generated). For `report-photos`, INSERT is also tightened because the report row always exists before slide images are uploaded.

The same migration adds `updated_at TIMESTAMPTZ` columns and a shared `set_updated_at()` BEFORE-UPDATE trigger to `users`, `projects`, `inspections`, `incidents`, `briefings`, `reports`, `qualifications`, `project_signers`, plus two indexes (`project_signers_lookup_idx`, `certificates_user_generated_idx`) flagged by the audit.

**Verified:** Pre/post snapshots saved in `~/sarke-backups/snapshot_pre_0020_*.json` and `snapshot_post_0020_*.json`. All 6 RLS policies updated, 8 columns + 8 triggers + 2 indexes created, row counts unchanged across 18 tables.

## P0 — Storage RLS still permissive on `certificates`, `answer-photos`, `pdfs`, `signatures` · OPEN

**Repro:** Same exposure pattern as above, on the `certificates`, `answer-photos`, `pdfs`, and `signatures` buckets. The `sarke_{insert,read,update,delete}_authenticated` policy family gates only on `bucket_id = ANY (ARRAY[...])` — no per-row owner check.

**Why not bundled into 0020:** these policies aren't in version control (created via the Supabase dashboard), and proper scoping requires understanding multi-source path conventions per bucket. In particular `signatures` is referenced from at least three tables (`users.saved_signature_url`, `project_signers.signature_png_url`, `signatures.signature_png_url`) so a single owner-scoped policy needs either a unified path scheme or a UNION-style EXISTS.

**Next step:** audit upload paths in [lib/services.real.ts](lib/services.real.ts) for each bucket, then write `0021_storage_rls_remaining.sql` to replace the four `sarke_*_authenticated` policies with owner-scoped ones.

---

## Session 2026-05-02 — QA code-review pass

Six bugs found and fixed. Full details in [QA_REPORT_2026-05-02.md](QA_REPORT_2026-05-02.md).

### P1 — `home.tsx` called `toast.error()` with `toast` undefined · FIXED 2026-05-02

`const toast = useToast()` was missing from `HomeScreen`. Would throw a hard `TypeError` on any code path that failed to find a template. Fixed: added the missing hook call.

### P1 — `HarnessListFlow` photo thumbs spun forever for server-stored photos · FIXED 2026-05-02

`CellPhotoThumb` initialised `uri` as `null` for bucket-path photos and never fetched the display URL. Fixed: added `useEffect` calling `getStorageImageDisplayUrl` for non-local paths.

### P2 — `FloatingLabelInput` `style` prop applied to inner bordered container · FIXED 2026-05-02

`style` was in `containerStyle` (inner box) instead of the outer wrapper. Callers' spacing/sizing overrides had no effect. Fixed: moved `style` to `[styles.wrapper, style]` on the outer `<View>`.

### P2 — Duplicate "ღვედის დასახელება" label in harness name field · FIXED 2026-05-02

`ConclusionStep` rendered a plain `<Text>` label above the `<FloatingLabelInput>` which already renders its own animated label. Fixed: removed the outer `<Text>` wrapper.

### P2 — Mock `Project` objects missing `contact_phone` field · FIXED 2026-05-02

`lib/services.mock.ts` was not updated when `contact_phone: string | null` was added to `types/models.ts`. Fixed: added `contact_phone: null` to all three mock `Project` objects.

### P3 — Dead imports `WizardNav` + `WizardPhotoThumbs` in wizard · FIXED 2026-05-02

Both components were imported but never used in `app/inspections/[id]/wizard.tsx`. Removed.
