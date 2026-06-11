# Sarke 2.0 — Manual Test Pass + Fixes

**Tester:** Claude (iOS Simulator, iPhone 17, iOS 26.4 via Expo Go)
**Date:** 2026-04-25
**Build:** main @ `1ebe2f8`
**Account:** Giorgi Kheladze (gilavi2000@gmail.com)

## Summary

One real bug found — a **P0** infinite redirect loop between the wizard and the inspection-detail screen — root-caused and fixed. The other items in my initial pass turned out to be either downstream effects of the loop, simulator artifacts, or a misobservation. No code changes needed for the rest.

## P1 — Home shows empty projects after first login (data appears only after manual pull-to-refresh) · FIXED 2026-05-27

**Repro:** Fresh sign-in on an account that has projects → Home tab opens with the "ახალი პროექტი / შექმენით პირველი" empty-state card instead of the user's project cards. Same on the Projects tab. Pulling the screen down to refresh fetches the rows and shows them.

**Root cause — two layered bugs:**

1. **Race between login and the warming prefetch.** [`lib/session.tsx`](lib/session.tsx) fired a fire-and-forget `prefetchQuery(['projects','list'])` immediately after `safeLoadUser`. If that prefetch reached Supabase before the JWT was bound onto the client (a millisecond-scale race that is much wider on cold launch), the RLS policy returned `[]`. React Query stored the empty array, and the default `staleTime: 5 * 60 * 1000` from [`lib/queryClient.ts`](lib/queryClient.ts) marked it "fresh" — every subsequent mount within five minutes reused the empty cache without refetching. Pull-to-refresh worked because `refetch()` bypasses staleTime.
2. **Loading flags treated empty-cached data as "loaded".** The home screen used `loaded = !certsQ.isLoading && !templatesQ.isLoading && !recentQ.isLoading && !projectsQ.isLoading` and rendered the empty state when `loaded && projects.length === 0`. Once the racy empty fetch settled, `isLoading` flipped to false, the empty-state card replaced the skeleton, and the in-flight refetch (if any) never re-armed the skeleton — `isLoading` only ever covers the first ever fetch, never background refetches. `app/(tabs)/projects.tsx` had the same shape (`projectsQ.isPending && !projectsQ.data`).

**Fix:**
- [`lib/session.tsx`](lib/session.tsx): pass `staleTime: 0` to the post-login `prefetchQuery` so the warming call always hits the network even if a previous racy empty value is sitting in cache.
- [`app/(tabs)/home.tsx`](app/(tabs)/home.tsx): replaced the `!loaded && data.length === 0` guards for the projects and recent sections with per-section `(isFetching || !isFetched) && data.length === 0` flags. Skeleton now stays up through background refetches when the cache still holds an empty array.
- [`app/(tabs)/projects.tsx`](app/(tabs)/projects.tsx): same swap — `loading = (projectsQ.isFetching || !projectsQ.isFetched) && projects.length === 0`.

Net effect: the user sees a skeleton from mount through the first response that actually has rows (or settles confirmedly empty), and a stale racy `[]` no longer sticks until pull-to-refresh.

## P1 — SignaturesScreen header chrome missing on equipment-type result screens · FIXED 2026-05-27 (commit `19443f6`)

**Repro:** Open a bobcat / excavator / general-equipment / cargo-platform / safety-net / mobile-ladder / forklift / fall-protection / lifting-accessories inspection, complete it, reach the result screen, tap `ხელმოწერები`.

**Symptom:** The body of the SignaturesScreen renders (capture card, add-row button), but the `უკან` back and X close buttons in the header are not visible. The harness/generic flow at [app/inspections/[id].tsx](app/inspections/%5Bid%5D.tsx) is unaffected.

**Root cause:** `SignaturesScreen` used `<SafeAreaView edges={['top', 'bottom']}>` from `react-native-safe-area-context`. When mounted inside `components/InspectionResultView.tsx` (the equipment-type result shell), the modal's nearest safe-area provider had already been consumed by the outer `<Screen>` wrapper. The inner SafeAreaView's reported top inset was 0, so the header rendered flush under the iOS status bar and looked missing.

**Fix:** harden the component so the header chrome is robust regardless of mount context. The modal now sets `statusBarTranslucent`, wraps its tree in a fresh `<SafeAreaProvider>`, and applies safe-area insets manually via `useSafeAreaInsets()`. The component is fully self-contained — both the generic and equipment paths get correct chrome.

## P1 — Certificate save fails with FK violation on equipment-type inspections · FIXED 2026-05-27 (commits `faa6b6f`, `b14b8d4`, `2781cad`)

**Repro:** Open any equipment-type inspection (bobcat, excavator, …) → result screen → `სერტიფიკატები` → fill the form → Save. Red FK error appears.

**Root cause:** `inspection_attachments.inspection_id` FKs to `public.inspections(id)` (per [`0021_inspection_attachments.sql`](supabase/migrations/0021_inspection_attachments.sql)), but the 9 equipment-type inspections store rows in `<type>_inspections` tables — not in the `inspections` master table. The FK has nothing to point at for equipment rows. This blocks not just certificates but any future shared dependency on `inspections.id`.

**Fix — architectural, not a constraint drop.** Every equipment inspection now has a parent row in `public.inspections` keyed by the same UUID. A new `inspections.type` column tags the variant. The application creates both rows atomically via the `create_equipment_inspection` RPC + the equipment-table insert. New FK with `ON DELETE CASCADE` from `<type>_inspections.id` to `inspections.id` keeps deletes coherent.

**Resolved 2026-05-27.** Migrations applied to production Supabase via SQL Editor:
1. [`supabase/migrations/20260527001240_unify_inspection_identity.sql`](supabase/migrations/20260527001240_unify_inspection_identity.sql) — schema + backfill (idempotent, transactional). 69 equipment-type parent rows backfilled across 9 types; 9 CASCADE FKs added.
2. [`supabase/migrations/20260527001241_create_equipment_inspection_rpc.sql`](supabase/migrations/20260527001241_create_equipment_inspection_rpc.sql) — RPC the app now calls on every equipment-inspection create; live and callable from `authenticated`.
3. [`supabase/migrations/20260527033302_inspections_type_default.sql`](supabase/migrations/20260527033302_inspections_type_default.sql) — hotfix applied after the unify migration's NOT NULL added; sets default `'harness'` to unblock the legacy harness/xaracho create path that did not specify `type`.

## P1 — RPC "Could not find function `create_equipment_inspection`" error on equipment create · FIXED 2026-05-27

Transient symptom that appeared between `20260527001240_unify_inspection_identity.sql` and the companion RPC migration: the app's equipment service factory called `supabase.rpc('create_equipment_inspection', ...)` but the function was not yet defined in the live DB. **Resolved 2026-05-27** by applying [`20260527001241_create_equipment_inspection_rpc.sql`](supabase/migrations/20260527001241_create_equipment_inspection_rpc.sql).

## Architectural — inspection identity unified · Resolved 2026-05-27 (commits `29e760f`, `faa6b6f`, `b14b8d4`, `2781cad`)

Until 2026-05-27, equipment inspections were polymorphic without a unified identity layer: 9 separate tables, no parent row, shared dependencies (`inspection_attachments`) FK'ing only to the harness/scaffold master. The certificate-save FK violation above was the first user-visible failure; future cross-cutting concerns (signing audit, attachments, history, etc.) would have hit the same wall.

Now every equipment-type row also exists in `public.inspections` with `type` tagging the variant. Shared dependents FK to `inspections.id` and work uniformly across all 10 types. Equipment-specific payload (items, verdicts, summary photos, type-specific signatures) stays in `<type>_inspections`. See [`INSPECTION_ARCHITECTURE_NOTES.md`](INSPECTION_ARCHITECTURE_NOTES.md) and [`INSPECTION_ARCHITECTURE_REPORT.md`](INSPECTION_ARCHITECTURE_REPORT.md).

## P3 — Orphaned signature files in `signatures` storage bucket — 2026-05-27

After [`20260526002032_remove_persisted_inspection_signatures.sql`](supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql) ran, ~69 folders (UUID-named + a legacy `questionnaire/` folder) remain in the `signatures` storage bucket. Direct SQL delete was blocked by the `storage.protect_delete` trigger, so the migration's step 4 was commented out before applying.

**Approach:** service-role API script using the Storage SDK. Keep only `expert/` and `project/` top folders. Estimated 60–80 files total. Not affecting functionality — the code path that wrote them is gone after the signature redesign.

## P3 — Inspection service does not set `type` from template category — 2026-05-27

The harness/xaracho create paths in [`lib/services/real/inspections.ts`](lib/services/real/inspections.ts) and [`lib/services/mock/inspections.ts`](lib/services/mock/inspections.ts) insert into `public.inspections` without specifying the `type` column. The DB default `'harness'` from [`20260527033302_inspections_type_default.sql`](supabase/migrations/20260527033302_inspections_type_default.sql) papers over this, but new xaracho-template inspections are silently tagged `'harness'` instead of `'xaracho'`.

**Fix:** inspection service should read `templates.category` and pass `type` explicitly on insert. Equipment-type creates are already correct via the `create_equipment_inspection` RPC.

## P2 — Incident and briefing signature flows still persist signatures — 2026-05-27

The 2026-05-27 inspection signature redesign applied the no-save rule (signatures live only in component state, never persisted) only to inspection-type signatures. The incident report and pre-shift briefing flows still use the reusable expert signature pattern (an expert saves their own signature once and it auto-applies to their documents — DocuSign-style self-applied).

This has a different legal basis (self-applied with consent vs capturing third-party signatures), but the user has requested a future redesign for consistency with the inspection regulatory rule.

**Affected surfaces:**
- `incidents.inspector_signature` (text)
- `incidents.signatories` (jsonb)
- `briefings.inspector_signature` (text)
- `briefings.signatories` (jsonb)
- `signatures/expert/` storage folder (5 files at audit time)

## P0 — Inspection signatures persisted in violation of the regulatory no-save rule · FIXED 2026-05-26 (code), MIGRATION APPLIED 2026-05-27 (DB)

**Audit context:** the no-persistence rule for captured inspection signatures was not held across the codebase. [SIGNATURE_AUDIT.md](SIGNATURE_AUDIT.md) catalogs the surface that violated it:

- DB tables and columns: the `signatures` table (per-inspection signature pointers, 0001 + 0004), `inspections.inspector_signature` (0032), `inspections.signatories` JSONB (0050), `inspector_signature` and `signatories` JSONB on `bobcat_inspections` / `excavator_inspections` / `general_equipment_inspections` (0024–0027 + 0051), `signatures` + `signatories` JSONB on `cargo_platform_inspections` (0040 + 0051).
- Storage: inspection signature objects in the `signatures` bucket at `<inspectionId>/<role>-<ts>.png`.
- Local: AsyncStorage `pending-signatures` queue (retry pool feeding `signatures` bucket uploads) and the unused `local-sigs:<inspectionId>` prefix in `lib/localSignatures.ts`.

**Code fix (landed 2026-05-26):** the signature redesign across the wizard and post-completion screens removes every UI path that wrote signature data anywhere except wizard component state and an in-memory cross-screen session store. Captured signatures now live only in RAM and are cleared after PDF generation. Old patterns removed: `SignaturesActionSheet`, `SignatureSheet`, `SignatureBlock`, the per-inspection-screen `renderSignaturesSheet` blocks, `EphemeralSignatureSheet` in the generic result screen, the `signaturesApi` (real + mock), the `useSignatures` query hook, and the dead `lib/localSignatures.ts`. The unified replacement lives at [`features/signatures/`](features/signatures/).

**DB fix (applied 2026-05-27):** [`supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql`](supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql) dropped the `signatures` table, the `signature_status` enum, and the `inspector_signature` + `signatories` columns from inspections and the four equipment tables. Out-of-scope flows preserved unchanged (project signers' `project/...` storage paths, `users.saved_signature_url` and `expert/<userId>.png` for the incident/briefing reusable expert signature, the `remote-signatures` bucket and `remote_signings` table).

**Storage cleanup deferred (P3):** the migration's step 4 (`DELETE FROM storage.objects WHERE bucket_id = 'signatures' AND split_part(name, '/', 1) NOT IN ('expert', 'project')`) was commented out before applying because the `storage.protect_delete` trigger blocked the SQL-side delete. ~69 orphan folders remain in the bucket and need a service-role Storage SDK cleanup script. Tracked separately in the P3 entry above.

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

## P0 — Report slides overwritten: only the last-edited slide survives · FIXED 2026-05-26

**Repro:** Reports → create slide 1, add a title/photo, save → back on the slide list, add slide 2 → fill slide 2 → finish. Slide 1 is blank/gone; only slide 2 has content.

**Root cause:** The slide editor ([app/reports/[id]/slide/[slideId].tsx](app/reports/[id]/slide/[slideId].tsx)) saved each slide via `reportsApi.update` but never wrote the result back into the React Query cache. The parent slide-list screen ([app/reports/[id]/edit.tsx](app/reports/[id]/edit.tsx)) reads `report` from that cache via `useReport`; on a stack `router.back()` it does not remount or refetch, so it kept a stale copy of the slides. When the user then tapped "add slide", `addSlide`/`persistSlides` rebuilt the slides array from the **stale** cache and PATCHed it to the server — silently overwriting the content/photo the user had just saved into the previous slide. Each new slide reset every earlier slide to its pre-edit empty state, so only the last slide edited looked saved.

**Fix:** After `reportsApi.update` in the slide editor's `onSave`, write the returned report into the cache with `queryClient.setQueryData(qk.reports.byId(saved.id), saved)` — the same pattern `edit.tsx`'s `persistSlides` already uses. The list screen now builds on fresh data when adding subsequent slides, so all slides persist.

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

## P0 — Storage RLS permissive on `certificates`, `answer-photos`, `pdfs`, `signatures` · FIXED 2026-05-26

**Repro:** Same exposure pattern as above, on the `certificates`, `answer-photos`, `pdfs`, and `signatures` buckets. The `sarke_{insert,read,update,delete}_authenticated` policy family gated only on `bucket_id = ANY (ARRAY[...])` — no per-row owner check.

**Why not bundled into 0020:** these policies weren't in version control (created via the Supabase dashboard), and scoping required auditing multi-source path conventions per bucket.

**Scoping decision (audit result):** path schemes are inconsistent across the mobile (generic + specialized inspections) and web codebases — e.g. `answer-photos` puts the inspection id at path segment `[0]` for generic mobile inspections but `[1]` for specialized types and the web dashboard. Path-based RLS is therefore fragile. Instead we use **owner-based** scoping (`owner = auth.uid()`): confirmed there are **no service-role/server-side uploads** to any of the four buckets (all uploads are client-side with the user's JWT), so `storage.objects.owner` is reliably populated. Pre-flight confirmed **0 NULL-owner rows** across all 614 files (answer-photos 319, pdfs 131, signatures 123, certificates 41). App is single-operator per account (signers are captured on the inspector's own device, so owner = reader), so no cross-account read carve-out is needed. Remote-signer signatures live in the separate `remote-signatures` bucket (token-scoped in `0011`) and are out of scope.

**Fix (write/delete half)** in [supabase/migrations/0053_storage_rls_owner_scoping.sql](supabase/migrations/0053_storage_rls_owner_scoping.sql): drop the four `sarke_*_authenticated` policies and add per-bucket `owner = auth.uid()` policies for SELECT/UPDATE/DELETE. INSERT stays `auth.uid() IS NOT NULL` because `owner` is not yet populated when the `WITH CHECK` predicate runs (same rationale as `0020`'s `incident-photos` INSERT). Applied to live via `supabase db query --linked` (Management API channel, like `0020`).

**Read half — buckets still `public = true`; code migrated to signed URLs, flip pending client rollout.** On a public bucket, reads bypass RLS entirely (the public download endpoint serves objects without auth), so the owner-scoped SELECT policies above are cosmetic for reads — anyone with/guessing an object path can fetch it. INSERT/UPDATE/DELETE *do* still go through RLS, which is why 0053 closes the destructive half. Closing reads requires flipping the four buckets to `public = false`.

**Read-path audit (done):** every read of these buckets now resolves through **signed URLs**, which work on both public and private buckets — so the code can ship before the flip. The mobile canonical helpers (`imageForDisplay`, `pdfPhotoEmbed`, `signatureAsDataUrl` in [lib/imageUrl.ts](lib/imageUrl.ts)) already prefer `createSignedUrl`. The two primary `getPublicUrl` readers were converted: [lib/sharePdf.ts](lib/sharePdf.ts) (PDF share download) and [web-app/src/pages/IncidentDetail.tsx](web-app/src/pages/IncidentDetail.tsx) (incident signature display); the now-orphaned `publicUrl` helper was removed from `web-app/src/lib/db/storage.ts`. `web/` (sarke-sign) doesn't read these buckets, and remote-signing PDFs use pre-generated signed URLs (valid on private buckets). DB columns store paths, not public URLs, so nothing cached breaks.

**Final flip — DONE 2026-05-26.** Ran `update storage.buckets set public = false where id in ('certificates','answer-photos','pdfs','signatures');`. Verified: the public download endpoint now returns `400 Bucket not found` for an existing object, so reads no longer bypass RLS; owner-scoped SELECT policies (from 0053) now gate signed-URL access to each file's owner. The vulnerability is closed.

**Deploy follow-through (rollout, not a security gap):** the buckets went private before the signed-URL read fixes (commit 618655a) reached clients, so until rollout completes: (a) the web dashboard's incident-signature display is broken until 618655a is pushed and redeploys; (b) mobile **PDF sharing** is broken on already-installed apps until a new build ships and is adopted. Mobile image display is unaffected (signed-URL-first). Push 618655a and cut a mobile build to clear the window.

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

---

## Session 2026-05-02 (second pass) — refactor sweep: bugs + perf

Three parallel audits surfaced ~75 candidates; the highest-leverage 10 were fixed in this pass. Wave-2 items (FlatList migrations, wizard split, RLS gap on remaining buckets) are flagged but deferred to dedicated sessions because their blast radius warrants their own review. (Update 2026-05-26: the RLS gap's write/delete half was closed in `0053` — see the P0 entry above; the read half remains open pending a bucket-privacy follow-up.)

### P1 — `photoUrlCache` Map grew unbounded across sessions · FIXED 2026-05-02

`app/inspections/[id]/wizard.tsx` declared a module-level `Map<string, string>` cache for answer-photo signed URLs. Map was never bounded or cleared, so memory grew for the lifetime of the JS context. Across multiple inspection sessions this is a slow leak that the user pays for in Hermes heap pressure. Fixed: capped at 100 entries with FIFO eviction via a `setPhotoUrlCache` helper; relies on `Map`'s insertion-order iteration so the oldest key is dropped on overflow.

### P1 — React Query cache survived sign-out and account switches · FIXED 2026-05-02

`lib/session.tsx` already called `purgeUserScopedStorage()` on `SIGNED_OUT` and on a `lastUserId !== nextUserId` switch, but `queryClient.clear()` was never invoked. A second user signing in on the same device would briefly see the previous user's projects/inspections from the in-memory cache before the warming prefetch landed. Fixed: added `queryClient.clear()` in the same branch so the cache resets together with AsyncStorage.

### P1 — Briefing sign loader had no error path; failed network → forever spinner · FIXED 2026-05-02

`app/briefings/[id]/sign.tsx`'s `useEffect` called `briefingsApi.getById(id).then(...)` with no `.catch`, so a network failure left the user staring at the `<ActivityIndicator>` indefinitely. Fixed: added a `.catch` that surfaces an Alert and routes back. The `cancelled` flag still guards both branches via the early return at the start of `.then`.

### P1 — `deleteFile` could be triggered twice for the same file · FIXED 2026-05-02

`app/projects/[id].tsx`'s `deleteFile` opened an action sheet, awaited a confirmation, and only removed the file from local state after `projectFilesApi.remove` resolved. A user who re-swiped the row before the request settled could fire a second DELETE for the same id. Fixed: added a `deletingFileIdsRef` Set, checked at action-sheet open and before the in-flight call, with a `finally` cleanup.

### P2 — `pending:` photo ids could collide on rapid capture · FIXED 2026-05-02

`lib/offline.tsx`'s optimistic-photo id was `pending:${Date.now()}-${4-char-base36-random}`. Two photos captured in the same millisecond had a non-trivial collision probability (36⁴ ≈ 1.7M). Fixed: added a module-level monotonic `pendingPhotoSeq` counter and widened the random suffix to 8 chars, combined as `pending:${ts}-${seq}-${rand8}`.

### P2 — Slide editor stale `hasInitialized.current` blocked re-sync on slideId change · FIXED 2026-05-02

`app/reports/[id]/slide/[slideId].tsx` used `hasInitialized.current` to preserve user edits across a focus-effect refire. The ref was never reset when the route's `slideId` param changed, so navigating to a different slide kept the previous slide's title/description in the form. Fixed: added a `useEffect(() => { hasInitialized.current = false; }, [slideId])` reset.

### P2 — `FileThumbnail` re-rendered on every parent render · FIXED 2026-05-02

`app/projects/[id].tsx` is a large screen that re-renders frequently. Its `FileThumbnail` child was rendered in a `.map()` over project files but not memoized; each parent render re-executed every thumbnail's render even when its `file` prop was unchanged. Fixed: wrapped in `React.memo` and `useMemo`-stabilised the inline `tile` style.

### P3 — Skeleton placeholder arrays allocated per render · FIXED 2026-05-02

`app/(tabs)/home.tsx` used `Array.from({length: 2})` and `Array.from({length: 3})` in JSX to render skeleton placeholders during initial load. The arrays were created on every render. Fixed: hoisted to module-level `PROJECT_SKELETONS` and `RECENT_SKELETONS` constants.

### P3 — Dead `isSelected` field on `ActionSheetItemConfig` · FIXED 2026-05-02

The exported `ActionSheetItemConfig` interface in `components/ActionSheet.tsx` declared `isSelected?: boolean` but no caller ever set it. The underlying `ActionSheetItem` primitive does use `isSelected` (selection ring + checkmark), so only the public `ActionSheetItemConfig` field and the pass-through were pruned. Also removed an unused `useBottomSheet()` call and import in the same file.

### P3 — Dead `lib/locale.ts` · FIXED 2026-05-02

Zero importers. The exports (`relativeTime`, `formatDate`, `formatDateTime`, etc.) were superseded by i18n-aware inline implementations in `app/(tabs)/home.tsx` and `app/(tabs)/more.tsx`, and by `lib/formatDate.ts`'s `formatShortDateTime`. File deleted.

### Files changed (2026-05-02, second pass)

- [app/inspections/[id]/wizard.tsx](app/inspections/[id]/wizard.tsx) — bounded `photoUrlCache` via `setPhotoUrlCache` helper.
- [lib/session.tsx](lib/session.tsx) — `queryClient.clear()` on sign-out and account switch.
- [app/briefings/[id]/sign.tsx](app/briefings/[id]/sign.tsx) — `.catch` with Alert + back-nav on load failure.
- [app/projects/[id].tsx](app/projects/[id].tsx) — `deletingFileIdsRef` guard; `FileThumbnail` wrapped in `React.memo`.
- [lib/offline.tsx](lib/offline.tsx) — `pendingPhotoSeq` counter for optimistic photo ids.
- [app/reports/[id]/slide/[slideId].tsx](app/reports/[id]/slide/[slideId].tsx) — reset `hasInitialized.current` on `slideId` change.
- [app/(tabs)/home.tsx](app/(tabs)/home.tsx) — hoisted skeleton arrays.
- [components/ActionSheet.tsx](components/ActionSheet.tsx) — pruned dead `isSelected` field + unused `useBottomSheet`.
- `lib/locale.ts` — deleted.

### Deferred to dedicated sessions

- **Storage RLS gap on `certificates`, `answer-photos`, `pdfs`, `signatures` buckets** — write/delete half closed in `0053` (owner-scoped policies); read half still open because the buckets are public. Tracked above in the partially-fixed P0 entry.
- **`ScrollView + .map()` → `FlatList`/`FlashList` on home, projects-tab, project detail tabs** — high blast radius across many list-rendering screens; deserves its own session with manual smoke testing of scroll/refresh/empty states per list.
- **Wizard split (`app/inspections/[id]/wizard.tsx` is 2420 lines)** — the recently-fixed wizard↔detail loop lives here; further restructuring should not happen in the same change as fixes elsewhere.
- **Modal/sheet bodies rendered when closed** — many sheets across the app gate their `Modal` `visible` prop but render the full body unconditionally. A per-sheet audit is needed since some bodies legitimately need to stay mounted (autofocus, animation continuity).
- **Offline queue dependency tracking** — a queued `photo_upload` may reference an `answer_upsert` that hasn't flushed; needs a `dependsOn` field plus serialization, not a one-line patch.

## Session 2026-05-02 (third pass) — keyboard UX consolidation

Four keyboard mechanisms were competing across the app (`KeyboardSafeArea`, `BottomSheetKeyboard`, `BottomSheet` provider, ad-hoc listeners in `app/template/[id]/start.tsx`). Symptoms reported by the user: bottom sheets overshooting the keyboard, action buttons disappearing or floating in the wrong position, animations out of sync with iOS, and `FloatingLabelInput` interacting unpredictably with the wrappers. All resolved in one pass; one library (`react-native-keyboard-controller`) and three documented patterns now cover every input-bearing surface.

### P1 — Bottom sheets overshot above keyboard · FIXED 2026-05-02

`app/(tabs)/projects.tsx`, `app/(tabs)/home.tsx`, `app/projects/[id].tsx`'s sheet modals each wrapped a `<SheetLayout>` (whose body is `KeyboardAwareScrollView`) in a stock RN `KeyboardAvoidingView`. Both the outer KAV and the inner KAS lifted the same content → double-lift → overshoot above the keyboard top. Fixed: removed the wrapping KAV; the sheet card now applies `marginBottom` from a new `useSheetKeyboardMargin()` hook so it stops exactly at the keyboard top. Hook uses the iOS keyboard's own `e.duration` and `Easing.bezier(0.17, 0.59, 0.4, 0.77)` so the card rides the keyboard 1:1.

### P1 — `BottomSheet` provider used wrong easing curve and `translateY` · FIXED 2026-05-02

`components/BottomSheet.tsx` animated `translateY` with `Easing.out(Easing.cubic)`. The iOS keyboard does not use that curve, so the sheet drifted out of sync on every show/hide. Fixed: keyboard offset moved off `translateY` (which still owns slide-in + drag) onto a non-native `marginBottom` driven by `useSheetKeyboardMargin()`. Slide-in transform stays on the native driver via a nested `Animated.View`.

### P1 — `app/template/[id]/start.tsx` ran a hand-rolled keyboard listener with `Animated.spring` · FIXED 2026-05-02

The `CreateProjectSheet` variant in this file had its own `keyboardWillShow`/`Hide` listeners stamping `paddingBottom` with `Animated.spring`, layered on top of `SheetLayout`'s already-keyboard-aware body. Two animations fighting each other on every keystroke. Fixed: deleted the local listener, dropped the dynamic `maxSheetH`, replaced with the standard `useSheetKeyboardMargin()` pattern.

### P2 — `KeyboardSafeArea` rendered the action button OUTSIDE the ScrollView · FIXED 2026-05-02

The wrapper exposed a `footer` prop that rendered the button as a sibling of the inner `ScrollView`. On tall forms the button hovered above content rather than scrolling with it; on short forms it drifted because two layout systems (KAV padding + footer absolute-ish positioning) disagreed about where the bottom was. Fixed: wrapper rewritten to expose only `children`; callers put the button as the last child with `<View style={{ flex: 1 }} />` above it. `contentContainerStyle: { flexGrow: 1 }` pushes the button to the bottom on short content and lets it scroll into view on tall content. 9 callers updated to match.

### P2 — `wizard.tsx` `keyboardVerticalOffset={12}` · FIXED 2026-05-02

The wizard's KAV used a hard-coded 12-point offset that ignored the rendered `WizardHeader` height. Anything taller than 12pt above the KAV (always) caused the keyboard to under-correct. Fixed: measured the header via `onLayout` into a `headerH` state, used `insets.top + headerH` as the offset.

### P2 — `wizard.tsx` `კითხვარი` comment input could sit under the keyboard · FIXED 2026-05-02

In `GridRowStep`'s scaffold (non-harness) ScrollView, the optional `კომენტარი` `FloatingLabelInput` autoFocused but did not scroll into view, so on a tall row with photos the input was hidden by the keyboard. Fixed: added a `scrollRef` on the ScrollView and call `scrollToEnd({ animated: true })` inside `requestAnimationFrame` on the input's `onFocus`.

### P3 — `BottomSheetKeyboard` and legacy `react-native-keyboard-aware-scroll-view` package were dead · DELETED 2026-05-02

`components/layout/BottomSheetKeyboard.tsx` was used by exactly one component (`AddRemoteSignerModal.tsx`), itself dead code with zero callers. Migrated `AddRemoteSignerModal` to `<SheetLayout>` + `BottomSheetScrollView` for consistency with `RoleSlotSheet`, then deleted `BottomSheetKeyboard.tsx`. Also removed `react-native-keyboard-aware-scroll-view@0.9.5` from `package.json` — only the web shim referenced it, and the shim points to a plain `ScrollView` so no import paths break.

### Files changed (2026-05-02, third pass)

- `lib/useSheetKeyboardMargin.ts` (new) — animated `marginBottom` hook, iOS bezier curve, `e.duration`.
- [components/layout/KeyboardSafeArea.tsx](components/layout/KeyboardSafeArea.tsx) — rewritten; library KAV; button-inside-ScrollView pattern; `headerHeight` prop replaces `headerOffset`.
- [components/BottomSheet.tsx](components/BottomSheet.tsx) — keyboard offset moved from `translateY` to `marginBottom` via the new hook.
- [components/AddRemoteSignerModal.tsx](components/AddRemoteSignerModal.tsx) — migrated off `BottomSheetKeyboard` to `SheetLayout` + `BottomSheetScrollView`.
- [components/layout/BottomSheetKeyboard.tsx] — deleted.
- [app/(tabs)/projects.tsx](app/(tabs)/projects.tsx), [app/(tabs)/home.tsx](app/(tabs)/home.tsx), [app/projects/[id].tsx](app/projects/[id].tsx) — outer KAV replaced with `Animated.View` + `marginBottom`.
- [app/template/[id]/start.tsx](app/template/[id]/start.tsx) — manual keyboard listener + spring removed; standard hook applied.
- [app/(auth)/login.tsx](app/(auth)/login.tsx), [app/(auth)/forgot.tsx](app/(auth)/forgot.tsx), [app/(auth)/reset.tsx](app/(auth)/reset.tsx), [app/(auth)/verify-email.tsx](app/(auth)/verify-email.tsx), [app/account-settings.tsx](app/account-settings.tsx), [app/briefings/new.tsx](app/briefings/new.tsx), [app/incidents/new.tsx](app/incidents/new.tsx), [app/reports/new.tsx](app/reports/new.tsx), [app/reports/[id]/slide/[slideId].tsx](app/reports/[id]/slide/[slideId].tsx) — `headerOffset` → `headerHeight`; button moved into children.
- [app/inspections/[id]/wizard.tsx](app/inspections/[id]/wizard.tsx) — `onLayout`-measured header height; scroll-on-focus for `კომენტარი`.
- [app/projects/[id]/signer.tsx](app/projects/[id]/signer.tsx) — `useHeaderHeight()` + library KAV.
- [package.json](package.json) — `react-native-keyboard-aware-scroll-view` removed.
- [README.md](README.md) — added "Keyboard handling — the three patterns" subsection.

### Verification status

`npm run typecheck` passes cleanly. **Device verification still required** — symptoms (overshoot, sync, button placement) are perceptual; the user needs to validate on a physical iPhone per their own testing rules. I cannot drive an iOS device or simulator from this session.

---

## Session 2026-05-02 (fourth pass) — image-helper consolidation + primitive guardrails

Root cause for a recurring class of bugs: the same primitive gets reinvented in two or three places with slightly different defaults, and call sites pick the wrong one. Image helpers were the active wound — four overlapping exports (`getStorageImageDataUrl`, `getStorageImageDataUrlStrict`, `getStorageImageResizedDataUrl`, `getStorageImageDisplayUrl`) with the lossy default already responsible for the P1 "PDF silently used unreachable signed URLs" bug above. Same shape as the keyboard mess (resolved in pass 3) and the `pdf_language` duplicate writers (resolved in pass 2).

### Image helpers collapsed to three purpose-named exports · DONE 2026-05-02

[lib/imageUrl.ts](lib/imageUrl.ts) now exports exactly:

| Use case | Function | Returns | On failure |
|---|---|---|---|
| RN `<Image>` display | `imageForDisplay(b, p)` | signed URL → data URL → public URL | never throws |
| Photo embedded in PDF | `pdfPhotoEmbed(b, p, opts?)` | resized JPEG `data:` URL, disk-cached | throws |
| Signature in PDF or canvas | `signatureAsDataUrl(b, p)` | byte-exact `data:` URL | throws |

The wrong-default `getStorageImageDataUrl` is gone. The taxonomy is by **purpose**, so picking the right name picks the right behavior — no more "I forgot to call the strict variant" bugs.

All 16 call sites migrated:
- [app/projects/[id]/signer.tsx](app/projects/[id]/signer.tsx), [app/projects/[id].tsx](app/projects/[id].tsx), [app/projects/[id]/files.tsx](app/projects/[id]/files.tsx) — display.
- [app/inspections/[id].tsx](app/inspections/[id].tsx), [app/incidents/[id].tsx](app/incidents/[id].tsx), [app/incidents/new.tsx](app/incidents/new.tsx), [app/reports/[id].tsx](app/reports/[id].tsx), [app/reports/[id]/success.tsx](app/reports/[id]/success.tsx) — PDF embeds (`pdfPhotoEmbed` for photos, `signatureAsDataUrl` for signatures).
- [app/inspections/[id]/wizard.tsx](app/inspections/[id]/wizard.tsx), [app/reports/[id]/edit.tsx](app/reports/[id]/edit.tsx), [app/reports/[id]/slide/[slideId].tsx](app/reports/[id]/slide/[slideId].tsx), [components/RoleSlotList.tsx](components/RoleSlotList.tsx), [components/HarnessListFlow.tsx](components/HarnessListFlow.tsx), [components/CertificatesActionSheet.tsx](components/CertificatesActionSheet.tsx), [components/SignaturesActionSheet.tsx](components/SignaturesActionSheet.tsx), [components/wizard/kamari/KamariFlow.tsx](components/wizard/kamari/KamariFlow.tsx) — display + signature canvas pre-fill.

Notable correctness fix: `components/RoleSlotList.tsx` was calling `getStorageImageDataUrl` (lossy data-URL fetch) for what is actually a `<Image>` display path. It now correctly uses `imageForDisplay` — same class of "wrong default chosen by accident" the consolidation exists to prevent.

### Primitive-violation lint script · NEW 2026-05-02

`scripts/check-primitives.mjs` (new) is a tiny grep-based guard that fails `npm run lint` on:
- `KeyboardAvoidingView` imported from `react-native` instead of `react-native-keyboard-controller`.
- Any reference to a legacy image helper name.
- Direct `AsyncStorage.{set,get,remove}Item('pdf_language', …)` (forces use of `lib/pdfLanguagePref.ts`).

Wired into `package.json`: `lint` now runs `tsc --noEmit && node scripts/check-primitives.mjs`. `check:primitives` is also exposed standalone.

### Canonical-owner index · NEW 2026-05-02

`docs/primitives.md` (new) lists every cross-cutting primitive with its canonical owner. `CLAUDE.md` gained a "Before adding a util" section pointing future contributors (and Claude itself) at the index, with rules: fix the owner instead of adding a sibling; name by purpose, not implementation; add a check-primitives rule when misuse is grep-detectable.

### Files changed (2026-05-02, fourth pass)

- [lib/imageUrl.ts](lib/imageUrl.ts) — collapsed 4 exports → 3, purpose-named.
- 16 call sites — see list above.
- [scripts/check-primitives.mjs](scripts/check-primitives.mjs) — new.
- [package.json](package.json) — lint script chained to check-primitives.
- [docs/primitives.md](docs/primitives.md) — new.
- [CLAUDE.md](CLAUDE.md) — added "Before adding a util" section; updated workflow step 3 to `npm run lint`.

## P0 — New-inspection-from-template used the template id as the project id · FIXED 2026-05-21

**Source:** 10-agent beta report (`Sarke2.0_Beta_Test_Master_Report.md`, §1.4), Sprint 1.

**Repro:** Project detail → start a new inspection on a project that has **two or more** system templates (so the template-picker dropdown appears) → pick a template.

**Symptom:** The inspection is created against the wrong `project_id` — it is set to the **template's** id, so the inspection never appears under the project (and, depending on FK state, the insert can fail outright).

**Root cause:** In [app/projects/[id].tsx](app/projects/[id].tsx) the template-picker `onChange` parameter was named `id`, shadowing the outer route param `id` (the project id). Dropdown options use `value: tpl.id`, so the callback `id` is the **template** id — and it was passed as the first argument to `createInspectionForTemplate(projectId, tpl)`:

```ts
onChange={async (id) => {
  const tpl = templatePickerOptions.find(t => t.id === String(id));
  if (tpl && id) await createInspectionForTemplate(String(id), tpl); // String(id) is the template id, not the project id
}}
```

The single-template fast path (`createInspectionForTemplate(id, system[0])`) used the correct outer `id`, which is why the common case worked and the bug only surfaced with multiple system templates.

**Fix:** rename the callback param to `templateId` to remove the shadow, and pass the outer project `id`:

```ts
onChange={async (templateId) => {
  const tpl = templatePickerOptions.find(t => t.id === String(templateId));
  if (tpl && id) await createInspectionForTemplate(id, tpl);
}}
```

**Other beta-report Sprint-1 items — verified against source, no code change:**
- **§1.1 BottomSheet "double bottom padding" / §1.2 SheetLayout "double keyboard handling":** already resolved in the 2026-04-28 keyboard pass (see the keyboard-unification entry above). `useSheetKeyboardMargin()` subtracts `insets.bottom` and rides the sheet to the keyboard top; every `SheetLayout` rendered inside a `BottomSheet` already passes `ScrollComponent={BottomSheetScrollView}` (so it doesn't use `KeyboardAwareScrollView`), and the no-ScrollComponent callers all live inside bespoke `<Modal>`s where KASV is correct. The report's proposed fix (delete the inset spacer / add an `insideBottomSheet` prop) would re-introduce overshoot or hide content behind the keyboard. The cited `LocalSignaturesSheet` is unused dead code.
- **§1.5–1.7 "missing done screens" (mobile-ladder, safety-net, lifting-accessories):** false — all three complete **inline** (`api.complete()` → set status to `completed` → success toast + celebration → render preview). None navigate to a `/done` route, so there is no "screen not found" crash.
- **§1.8–1.9 "undefined `inspectionRef`" (fall-protection, forklift):** false — both declare `const inspectionRef = useRef(...)` and sync it via `useEffect(() => { inspectionRef.current = inspection; }, [inspection])`; photo upload reads `inspectionRef.current.id` correctly.

**Verified:** typecheck passes for the changed file (pre-existing unrelated failures in `lib/services.mock.ts` and web-app `src/` remain — not introduced here). On-device sheet/keyboard behavior was not re-tested (no simulator this session).

### 2026-05-25 follow-up — defensive guards added after a user-reported re-recurrence

A user re-reported the same FK violation (`questionnaires_project_id_fkey`) on the project-page create flow. The shadow-`id` fix above remained in place. To make a future regression fail loudly instead of producing a vague Postgres error:

- **Service layer:** [lib/services/real/inspections.ts](lib/services/real/inspections.ts) and [lib/inspection/service.ts](lib/inspection/service.ts) now validate `projectId` and `templateId` as UUID-shaped strings before insert. A bad value throws a clear typed error (`inspectionsApi.create: projectId must be a UUID (got "…")`) that the caller's `friendlyError()` wraps into a Georgian toast.
- **Route layer:** [features/project-detail/ProjectDetail.tsx](features/project-detail/ProjectDetail.tsx) coerces `useLocalSearchParams<{ id }>()` to a single non-empty string before any create call, and toasts `სესია არ მუშაობს, ხელახლა გახსენით პროექტი` if the route param is missing.

See [TASK2_DIAGNOSIS.md](TASK2_DIAGNOSIS.md) for the full trace.

## P0 — Concurrent PDF-upload flush could insert duplicate certificates · FIXED 2026-05-21

**Source:** 10-agent beta report (`Sarke2.0_Beta_Test_Master_Report.md`, §1.14), Sprint 2.

**Symptom:** The same inspection occasionally produced two `certificates` rows (same `inspection_id` + `pdf_url`, different ids).

**Root cause:** `flushPendingPdfUploads()` in [lib/pdfUploadQueue.ts](lib/pdfUploadQueue.ts) had no single-flight guard. It is called from three places that can fire near-simultaneously on app start ([app/_layout.tsx](app/_layout.tsx) on mount, plus the `NetInfo.fetch` seed and the reconnect listener in [lib/offline.tsx](lib/offline.tsx)). Its in-loop dedup is check-then-create:

```ts
const existing = await certificatesApi.listByInspection(p.inspectionId);
const already = existing.some(c => c.pdf_url === p.pdfUrl);
if (!already) await certificatesApi.create({ … });
```

Two concurrent flushes can both read "no certificate yet" before either inserts (TOCTOU), and there is **no DB unique constraint** on `certificates` (`idx_certificates_inspection` is a plain, non-unique index), so both inserts succeed → duplicate.

**Fix:** module-level single-flight guard. All callers share one JS thread, so a boolean is sufficient; concurrent calls become no-ops while one flush runs, which makes the existing check-then-create dedup correct again (and still covers sequential retries):

```ts
let isFlushingPdfUploads = false;
export async function flushPendingPdfUploads() {
  if (isFlushingPdfUploads) return;
  isFlushingPdfUploads = true;
  try { await flushPendingPdfUploadsInner(); }
  finally { isFlushingPdfUploads = false; }
}
```

A DB `unique (inspection_id, pdf_url)` constraint would be a stronger backstop but needs a migration + dedup backfill and risks rejecting legitimate re-generations — deferred, not done here.

**Other beta-report Sprint-2 items — verified against source, no code change:**
- **§1.12 "offline photo queue FK violation → permanent photo loss":** false. The flush rotates a failing op to the back of the queue with an incremented attempt count ([lib/offline.tsx](lib/offline.tsx)), so a `photo_upload` that briefly precedes its `answer_upsert` simply retries after the answer lands — it is not lost. Ops that do exhaust retries move to a *failed* queue with their staged file **retained** (deleted only on success or explicit `dismissFailed`), so they remain retryable. No permanent loss.
- **§1.13 "AsyncStorage queue corruption discards the whole queue":** false premise. `readQueue()` already wraps `JSON.parse` in try/catch, logs, and returns `[]` — there is no unhandled crash. All queue mutations are serialized through `runExclusive`/`queueLock`, so there is no concurrent-write corruption. The report's "write a backup copy first" scheme is not atomic either (kill between the two writes leaves them disagreeing) and doubles every write; not implemented.
- **§1.20 "wizard patchAnswer race creates duplicate answers / orphans photos":** false in practice. `patchAnswer` reuses `answers[question.id]?.id` and only mints a UUID when no answer exists; `enqueueAnswerUpsert` coalesces by `(inspection_id, question_id)` and the DB upserts `onConflict (inspection_id, question_id)`, so rapid taps collapse to one row. A photo can only attach after the multi-second OS image-picker round-trip, by which time the answer id is stable. The report's per-`answerId` lock also wouldn't catch the described case (the race mints *different* ids).
- **§2.4 "GridRowStep comment autoFocus hidden behind keyboard (regression)":** false. The comment input sits inside a `KeyboardAwareScrollView` (`react-native-keyboard-controller`, `bottomOffset={120}`) that auto-scrolls the focused field above the keyboard; the empty `onFocus` is intentional and documented inline. The manual `scrollToEnd` was removed on purpose in the 2026-04-28/05-02 keyboard migration, not a regression.

**Verified:** `npm run lint` typecheck clean for the changed file; pre-existing unrelated failures in `lib/services.mock.ts` and web-app `src/` remain. Concurrency behavior reasoned from source; not reproduced on a device this session.

## P1/P2 — Auth keyboard & autofill UX · FIXED 2026-05-22

**Source:** beta report §2.1–2.3 (Sprint 3, "auth keyboard UX improvements").

Auth inputs (login, register, forgot, reset) had no return-key field flow, no submit-on-return, and no autofill / password-manager hints. The shared input even dropped those props. Fixed:
- [components/inputs/FloatingLabelInput.tsx](components/inputs/FloatingLabelInput.tsx) — now forwards `textContentType`, `autoComplete`, and `blurOnSubmit` to the underlying `TextInput` (previously declared nowhere, so callers couldn't set them).
- [app/(auth)/login.tsx](app/(auth)/login.tsx) — LoginForm chains email→password (refs + `returnKeyType`/`onSubmitEditing`) and sets `emailAddress`/`email` + `password`/`current-password`; RegisterForm chains firstName→lastName→email→password with name + `emailAddress` + `newPassword`/`new-password` hints; the forgot-password modal email gets `emailAddress`/`email` and go-to-submit.
- [app/(auth)/forgot.tsx](app/(auth)/forgot.tsx), [app/(auth)/reset.tsx](app/(auth)/reset.tsx) — same treatment; reset chains new-password→confirm with `newPassword`/`new-password`.

`verify-email` already used a raw `TextInput` with `oneTimeCode`/`sms-otp`, so it was left as-is.

**Other Sprint-3 items — assessed, not changed (with reasons):**
- **§1.18 AuthGate redirect oscillation:** not a bug. AuthGate's redirects are guarded by expo-router segment checks (`!inAuth`, `!inTerms`, `inAuth || (inTerms && !viewMode)`) that go false once the target screen is reached, so they self-terminate. (The genuine wizard↔detail ping-pong already uses `navigationGuard.isOscillating`.) The report's `isOscillating(target, 3)` snippet doesn't even match the real two-arg signature.
- **§2.21 SignatureBlock `key={idx}`:** real fragility — cards are removable (`onRemoveSignatory`), so index keys mis-associate per-card state on removal — but `SignatoryData` has no stable id and the component's whole API is index-based (`onChange(index)`, `onRemoveSignatory(index)`). A correct fix threads stable ids through every caller; deferred rather than shipped as a half-fix that could cause key collisions.
- **§2.15–2.19 photo / OOM (expo-image migration, annotated-JPEG, temp-file cleanup):** not in this pass; the OOM claims need on-device profiling to verify before changing the photo pipeline.

**Verified:** `npm run lint` typecheck clean for changed files (pre-existing unrelated failures remain). tsc validated all `textContentType`/`autoComplete` values. Auth flows not exercised on a device this session — return-key chaining + autofill should be smoke-tested on a real device.

## Full-file audit pass — every remaining report bug triaged · 2026-05-22

Ran five parallel read-only verifiers over **all ~156 detailed entries** in `Sarke2.0_Beta_Test_Master_Report.md` (P0 §1.x, P1 §2.x, P2 §3.x, P3 §4.x). Consistent with prior sprints, ~80% were false, already-handled, or carried regressing fixes. Each verdict was checked against current source; the genuine, safely-fixable bugs were fixed (correcting the report's proposed fix where it was wrong). All changes typecheck clean.

**Fixed this pass (13):**
- **§1.10** [app/projects/[id]/signer.tsx](app/projects/[id]/signer.tsx) — project-signer signature used the banned `fetch(dataURL).blob()` + `storageApi.upload` (0-byte objects on Hermes/SDK 54). Now uses canonical `uploadSignature`; throws if the upload had to be queued instead of silently saving a broken pointer.
- **§1.15 + §1.24** [app/orders/[id]/success.tsx](app/orders/[id]/success.tsx) — hardcoded the "specialist appointment" eyebrow for all 6 order types and showed `id.slice(0,4)` instead of the order number. Now fetches the order and renders `ORDER_DOCUMENT_TYPE_LABEL[documentType]` + `formData.orderNumber`.
- **§1.21** [app/inspections/bobcat/[id].tsx](app/inspections/bobcat/[id].tsx) — navigated to the success/done screen even when `complete()` failed (errors were swallowed). `handleComplete` now returns success and nav is gated on it.
- **§2.11** [components/wizard/kamari/KamariFlow.tsx](components/wizard/kamari/KamariFlow.tsx) — detail modal's plain `ScrollView` let the keyboard cover the description input; now `KeyboardAwareScrollView` (canonical keyboard primitive).
- **§2.13** [components/ScaffoldTour.tsx](components/ScaffoldTour.tsx) — re-opening the help tour kept the last slide index; added reset-to-0 on `visible`. (Report named the dead `ChecklistTour.tsx`; the live component is `ScaffoldTour`.)
- **§2.16** [components/PhotoAnnotator.tsx](components/PhotoAnnotator.tsx) — annotated photos captured as PNG `quality:1` (5–10× larger); flattened opaque output → `jpg` `quality:0.9`.
- **§2.18** [lib/photoCompression.ts](lib/photoCompression.ts) — `stageCompressedPhotoForOffline` threw if compression failed, so the offline photo was **dropped** (part of the reported photo-loss). Now falls back to staging the original file so the upload is still queued.
- **§2.25** [app/inspections/[id]/wizard.tsx](app/inspections/[id]/wizard.tsx) — ConclusionStep showed "required" errors (conclusion, harness name, decision) on mount before any interaction; gated behind an `interacted` flag. Submit-time validation unchanged.
- **§2.33** [components/MapPreview.tsx](components/MapPreview.tsx) — `initialRegion` never recentered when the pin changed; switched to controlled `region` (safe: map is `pointerEvents="none"`).
- **§2.41** [app/projects/[id].tsx](app/projects/[id].tsx) — `deleteInspection` lacked the double-trigger guard its sibling `deleteFile` has; added a `deletingInspIdsRef` set with `finally` cleanup.
- **§3.16** [components/RoleSlotSheet.tsx](components/RoleSlotSheet.tsx) — used a static `import { theme }` (light theme), so it ignored dark mode; switched to `useTheme()` + `makeStyles(theme)`.
- **§3.48** [components/wizard/QuestionCard.tsx](components/wizard/QuestionCard.tsx) — screen-reader label mixed English ("კითხვა N from M"); now "/" to match the visible label.
- **§4.1** [app/_layout.tsx](app/_layout.tsx) — `exchangedCodes` Set grew unbounded; capped via a `rememberCode` helper.

**Deferred (real but not a safe one-liner):**
- **§1.16** — **partially resolved 2026-05-22.** The draft incident "განახლება" (Update) button opened a blank `/incidents/new` form, implying in-place edit and leading users to create a second incident. Relabeled to "ახალი ინციდენტი" (New incident) to match its actual behavior. True draft content-editing was deliberately **not** built blind: incident photos are stored as paths but the create form uploads `{uri}` objects, so a blind edit/re-save risks silent photo loss/duplication in storage — a real edit-mode needs on-device verification.
- **§2.43** PhotoAnnotator strokes aren't clamped to the canvas. Output is already clipped by `overflow:hidden`; clamping correctly needs a layout ref in the gesture hot path for marginal benefit — deferred to avoid drawing-path risk.
- **§3.13** — **not a real bug (verified 2026-05-22).** The `harness/[id].tsx` completed view passes `previewHtml={null}` + a no-op download, but `inspectionRouting.ts` routes *completed* harness inspections to the generic `/inspections/[id]` screen, which has full working PDF preview + download (`buildPdfPreviewHtml`). The stub is an unreached edge branch of the draft wizard screen. No fix needed.
- **§3.17** project order rows showed a chevron but had no `onPress`, and no order-detail route exists (`app/orders/[id]/` only has `success.tsx`). **Resolved 2026-05-22** by removing the misleading chevron so the rows are honest info rows (commit on `fix/beta-sprint-3`). A real order viewer (re-open / re-share the stored `pdfUrl`) is a separate opt-in feature, not built here.

**Not changed — verified false / already-handled / device-only (representative):** §2.6, 2.7, 2.8, 2.9, 2.12, 2.14, 2.24, 2.26, 2.29, 2.31, 2.34, 2.37, 2.40, 2.44, 2.45; §3.1, 3.4, 3.7, 3.11, 3.12, 3.30, 3.31, 3.35, 3.39, 3.42, 3.46, 3.47; §4.2–4.6 (already done) and §4.7–4.26 (non-specific boilerplate). Several report-proposed fixes would have **regressed** working code (e.g. §2.26 `queryClient.clear()` already runs on account switch; §2.35's `isSuccess` gate would hang skeletons forever; §2.37's null-toggle breaks the `onChange:(value:string)` contract). Device-only items (layout/timing/RLS/perf) that need on-device repro: §1.3, 1.19, 2.5, 2.10, 2.15, 2.17, 2.19, 2.20, 2.23, 2.27, 2.38, 2.39, 2.42.

**Verified:** `npm run lint` typecheck clean for all 13 changed files (only the pre-existing `lib/services.mock.ts` + web-app `src/` failures remain). Not exercised on a device this session.

## P0 (SECURITY, OPEN) — Storage RLS gap on 4 buckets · remediation recipe · 2026-05-22

**Severity: HIGH.** The `certificates`, `answer-photos`, `pdfs`, `signatures` storage buckets have dashboard-created policies (`sarke_*_authenticated`) that gate **only** on `bucket_id` — so **any authenticated user can read or delete every other user's files**. Migration `0020` tightened `incident-photos`/`report-photos` with owner-scoped policies; these four were never done. (Also flagged in README "Storage RLS gap (open)".)

**Why this is NOT a blind one-liner (must be done carefully, not shipped untested):**
- The actual `0020` policy SQL is **not in version control** — [supabase/migrations/0020_storage_rls_and_timestamps.sql](supabase/migrations/0020_storage_rls_and_timestamps.sql) is a stub ("applied via Management API SQL endpoint"). The real policies live only in the remote DB.
- The bucket **path layouts are heterogeneous**, so ownership can't be derived uniformly from the path:
  - `answer-photos`: `<inspection_id>/<question_id>/<ts>.jpg` (generic wizard, [wizard.tsx:615](app/inspections/[id]/wizard.tsx)) **and** `<pathPrefix>/<sub>/<uuid>.jpg` e.g. `excavator/<inspId>/...` ([lib/inspection/service.ts:114](lib/inspection/service.ts)) **and** order summary photos ([orders/new.tsx:229](app/orders/new.tsx)).
  - `signatures`: `project/<project_id>/signer-...png` ([signer.tsx](app/projects/[id]/signer.tsx)) + expert `saved_signature_url` + inspection signatures ([lib/signatures.ts:72](lib/signatures.ts)).
  - `pdfs`: incident / order / inspection PDF paths ([incidents/new.tsx:372](app/incidents/new.tsx), [orders/new.tsx:554](app/orders/new.tsx)).
  - `certificates`: qualification files + generated certs ([CertificatesActionSheet.tsx:211](components/CertificatesActionSheet.tsx)).

**Recommended remediation (do, in order):**
1. **Retrieve the working template:** on the remote DB, `select policyname, cmd, qual, with_check from pg_policies where schemaname='storage' and tablename='objects' and policyname like '%incident%' or '%report%';` — this is the proven owner-scoped pattern (EXISTS join from `storage.objects.name` → the owning row's `user_id`).
2. **Map each of the 4 buckets' path → owning row** using the layouts above (some need an inspection/project/qualification join; the order-uploaded answer-photos need care).
3. Write `supabase/migrations/0053_storage_rls_remaining.sql` with `drop policy` for the 4 unscoped `sarke_*` policies + owner-scoped `create policy` per bucket; **commit the real SQL** (don't leave a stub like 0020).
4. **Test on a local/staging Supabase** with two users before prod: user A can read/delete only their own files; user B is denied.
5. Apply to prod (coordinate with the migration-history drift noted above; use `supabase db push`/`migration repair` deliberately).

**Status:** NOT done this session — drafting the SQL blind (no template in VC, no test harness, heterogeneous paths) risks either leaving the hole open or locking out all file access in prod. Flagged for a careful, tested change. A CI `lint` gate was added ([.github/workflows/test.yml](.github/workflows/test.yml)) so future typecheck regressions are caught on PRs (was previously local-only).

## P3 — Conditional hook calls in `features/inspection-wizard/GridRowStep` · FIXED 2026-05-24

**Source:** Spotted during the v1 feature-sliced refactor (logged in `REFACTOR_NOTES.md`); carried into v2 as Phase 3.

**Symptom:** Rules-of-hooks violation. The non-harness branch of `GridRowStep` had a conditional early return followed by `useState`/`useRef` calls, so the harness branch and the scaffold branch had different hook counts.

**Why it was latent:** `WizardStepTransition` unmounts on every step change, so `isHarness` was stable for the life of any one mount — React's stable-render check never had two mounts to compare with mismatched hook counts. A future change that kept the same `GridRowStep` mounted across step transitions would have crashed.

**Fix** (commit `584fb17`): split into [HarnessRowStep.tsx](features/inspection-wizard/HarnessRowStep.tsx) (harness ✓/✗ chips + row-count picker) and [ScaffoldRowStep.tsx](features/inspection-wizard/ScaffoldRowStep.tsx) (scaffold comment field + footer). The dispatch on `step.question.grid_rows?.[0] === 'N1'` moved up to [InspectionWizard.tsx](features/inspection-wizard/InspectionWizard.tsx). Each new file calls its hooks unconditionally. Rule documented in `features/inspection-wizard/AGENTS.md`: future grid variants must add a new sibling component, not branch inside an existing one.

**Verified:** `npm run lint` clean. Behavior unchanged (both new components render the same JSX as the corresponding branch did before).

## P4 — Dead `useMemo(getstyles)` in `features/inspection-wizard/MeasureInput` · FIXED 2026-05-24

**Source:** Spotted during the v1 feature-sliced refactor (logged in `REFACTOR_NOTES.md`); fixed in v2 Phase 1.

**Symptom:** `useMemo(() => getstyles(theme), [theme])` was called and the result discarded. No runtime impact (memo never used), but the dead code plus its `getstyles` and `useMemo` imports had to be carried alongside every future edit.

**Root cause:** Inherited from the pre-refactor god-file `app/inspections/[id]/wizard.tsx`. The original presumably used a `styles` const that was removed during an earlier cleanup; the `useMemo` wrapper was never removed.

**Fix** (commit `4247d48`): removed the `useMemo` call along with its unused `useMemo` + `getstyles` imports. File is 91 → 86 lines.

**Verified:** `npm run lint` clean. No behavior change.

## P4 — Dead step components in `app/orders/new.tsx` · DROPPED 2026-05-24

**Source:** Spotted during the v1 feature-sliced refactor (logged in `REFACTOR_NOTES.md`).

**Symptom:** The original `NewOrderScreen` declared `StepSignDirector`, `StepSignAppointed`, and `StepSignCraneOperator` components but never rendered them — the fire-safety / crane flows render `StepSignaturesFireSafety` and `StepSignaturesCrane` (the combined two-signature steps) instead.

**Resolution** (commit `c794f9f`): not carried over into `features/order-new/` since they had no callers. No bug existed at runtime; this entry exists for the audit trail.

## P0 — Account deletion 500 "Database error deleting user" · FIXED 2026-05-25

**Repro:** TestFlight build → Profile screen → "ანგარიშის წაშლა" → confirm. `supabase.auth.admin.deleteUser` returned `500: Database error deleting user`.

**Symptom:** App Store Review Guideline 5.1.1(v) account-deletion path failed end-to-end. The Edge Function [supabase/functions/delete-account/index.ts](supabase/functions/delete-account/index.ts) surfaced the Postgres error verbatim; the user was left on the Profile screen with their account intact.

**Root cause:** Two trigger functions, `block_answer_write_when_completed` and `block_answer_photo_write_when_completed`, declared local variables of type `questionnaire_status` (a public-schema enum) without schema qualification. `auth.admin.deleteUser` runs with restricted `search_path`, so the trigger could not resolve `questionnaire_status` at execution time. Postgres aborted the cascade and bubbled the abort up as the 500 the client saw.

**Fix** (migration [20260525180000_pin_function_search_paths.sql](supabase/migrations/20260525180000_pin_function_search_paths.sql)): pin `search_path = public, pg_catalog` on every public function so the same class of failure cannot recur for any future function. Schema qualification on individual references would have fixed the immediate trigger; the migration is the safer global remedy.

**Verified:** Account deletion succeeds end-to-end in TestFlight after the migration was applied. Auth user row, public.users row, and all cascade-owned data deleted; the client signs out and routes to `/(auth)/login`.

## P0 — Account deletion orphaned all user-owned data · FIXED 2026-05-25

**Symptom:** Even after the 500 above was resolved, deleting an `auth.users` row left every public row owned by that user intact — projects, inspections, photos, certificates, qualifications. The user could not be reused (RLS no longer matched) and the data could not be reached. App Store Review Guideline 5.1.1(v) requires that account deletion deletes user data.

**Root cause:** No foreign keys existed from the public user-owned columns to `auth.users(id)`. The 22+ tables that store `user_id` / `owner_id` / `created_by` / `uploaded_by` had no FK relationship enforcing referential integrity against the auth schema, and therefore no cascade behavior.

**Fix** (migration [20260525183000_cascade_user_deletion.sql](supabase/migrations/20260525183000_cascade_user_deletion.sql)): add `ON DELETE CASCADE` foreign keys from every matching column to `auth.users(id)`. Discovery is dynamic — the migration scans `information_schema.columns` for `%user_id%` / `%owner_id%` / `%created_by%` / `%uploaded_by%` and uses `pg_catalog` (not `information_schema`) to test for an existing FK, because `information_schema` cannot see FKs that target the `auth` schema. Orphaned rows are cleaned before each constraint is added.

A follow-up migration ([20260525190000_dedupe_user_fkeys.sql](supabase/migrations/20260525190000_dedupe_user_fkeys.sql)) dropped duplicate `*_auth_users_fkey` constraints that were added in cases where an equivalent CASCADE FK already existed but was hidden from the existence check by the same `information_schema` blind spot.

**Verified:** Deleting a test account in TestFlight after both migrations removes the auth row plus every row in public that references it. No orphans remain.

## P2 — Photo-location modal spammed users on every upload · FIXED 2026-05-27

**Repro:** Open any inspection (facade scaffolding flow is the most painful), upload a photo from a location >500m from the project's saved address. Tap "კი, სწორია" or "პროექტის ლოკაცია შევცვალო" on the GPS-mismatch alert. Take another photo from the same place — the modal fires again. And again. And again.

**Symptom:** Inspectors working off-site (typical for facade scaffolding) saw the "განსხვავებული ლოკაცია" alert pop up on **every single photo** in the flow, even after explicitly confirming the project was correct or updating the location.

**Root cause:** `showPhotoLocationAlert` ([lib/photoLocationAlert.ts](lib/photoLocationAlert.ts)) had no memory. Every photo re-ran the distance check from scratch and re-fired the modal. Worse, even the "Update project location" path had a brief race window: the next photo could fire before the project state propagated through React.

**Fix:** added a per-project, 24h AsyncStorage-backed suppression flag. Either button on either branch of the alert sets the flag. Subsequent photos short-circuit before reverseGeocode for 24 hours. The flag expires the next day, so genuine site changes still surface a prompt eventually. Helpers + reset function exported for tests.

**Verified:** new unit test [tests/unit/photoLocationAlertSuppress.test.ts](tests/unit/photoLocationAlertSuppress.test.ts) covers the storage helpers and TTL math.

## P3 — Duplicate "პაროლის შეცვლა" row on More tab · FIXED 2026-05-25

**Symptom:** After the in-app Profile screen landed (commit `db0ec1a`), the password-change row existed in two places — once on the More tab's settings card and once on the new Profile screen. Both linked to the same `/account-settings` route.

**Fix** (commit `b6f5212`): removed the More tab row plus its trailing divider. The route file at [app/account-settings.tsx](app/account-settings.tsx) is unchanged — still reachable from Profile.
