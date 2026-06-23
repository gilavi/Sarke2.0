# Primitives — canonical owners

This is the index of cross-cutting helpers that have a **single canonical owner**. If you need behavior that one of these primitives covers, use the listed export. Don't reach for the underlying RN/Expo/Supabase API directly, and don't add a parallel helper next to it — fix the canonical one.

The single most common bug pattern in this repo (see [BUG_REPORT.md](reports/BUG_REPORT.md)) is the same primitive getting reinvented in two or three places, each with a slightly different default. Every duplicate is a future bug.

`scripts/check-primitives.mjs` enforces a small subset of these via `npm run lint`. Whenever an entry below would benefit from automated enforcement, add a rule there.

## Primary action button

One component: [`components/primitives/Button.tsx`](../components/primitives/Button.tsx), re-exported from `components/ui`.

Use `<Button variant="primary" size="lg" title="..." onPress={...} style={{ width: '100%' }} />` for all full-width CTA / bottom-of-screen action buttons. Shape is pill (radius 1000), text is black, background is `theme.colors.accent` (orange).

**Don't** inline a `Pressable` + manual styling for a CTA button — that was the bug this consolidation fixed (WizardNav had a bespoke `nextBtn`; InspectionShell used deprecated `iconRight` ReactNodes). **Don't** pass `iconRight={<Ionicons color={theme.colors.white}>}` — use the string-based `rightIcon="icon-name"` prop so the colour inherits from the button's `color` token automatically. For a small inline "add row / add item" affordance use `<Button variant="ghost" size="sm" leftIcon={CirclePlus} title="..." />` (see `components/inspection-parts/DynamicTable.tsx`), not a hand-rolled `Pressable` + accent `Text`.

**Press feel (all tappable controls).** Every tappable DS surface shares one micro-interaction — a quick squish (~0.94) then a bouncy spring back — via [`components/animations/usePressBounce.ts`](../components/animations/usePressBounce.ts) (`const { pressStyle, bounce } = usePressBounce()`; apply `pressStyle` to an `Animated.View`/`AnimatedPressable`, call `bounce()` in `onPress`; respects reduce-motion). The button primitives (`Button`, `IconButton`, `FabButton`) and `StatusChip` call the hook directly; **everything else uses the wrapper [`PressBounce`](../components/animations/PressBounce.tsx)** — `<PressBounce scaleTo={…} hapticOnPress="light" style={…} onPress={…}>` — which composes the hook onto an `AnimatedPressable` so a bordered chip/row scales **as one unit** (transform on the Pressable, not an inner view). Now also covers `Selector` (chips + rows), `ActionSheetItem`, `SerialKeypad`, `QuantitySelector`, `ChipNavStrip`, `VerdictSelector`, `DateTimeField`, `CustomDropdown` (trigger), and the project/photo/attachment cards. `scaleTo` tracks target size: keys ~0.90, chips ~0.94, big cards/rows ~0.96–0.98. **Don't** hand-roll per-control `withTiming`/`withSpring` scale logic, and **don't** add a second press wrapper — the old `PressableScale` (hold feel + `gentle` spring + inner-view scale, ignored reduce-motion) was deleted for exactly this reason.

**Haptics (one vocabulary, one source per tap).** All feedback flows through [`lib/haptics.ts`](../lib/haptics.ts) — never call `expo-haptics` directly. Intensity tracks intent: **Light** = toggle / select a chip / open a sheet; **Medium** = primary button, confirm/advance a step; **Heavy** = destructive (delete / clear / reset) and the drag-and-drop drop; **Success/Warning/Error** = saved-or-completed / validation-or-attention / hard failure. The button primitives weight their own press automatically — `Button` fires `medium` for `primary`, `heavy` for `danger`, `light` otherwise; `IconButton`/`ActionSheetItem` fire `heavy` on their destructive variant; `FabButton` fires `medium`. So a handler wired to one of these (or to `PressBounce hapticOnPress`) **must not** fire its own press haptic — that double-buzzes. Handlers should only emit *outcome* beats that happen later/conditionally (`haptic.success()` on save, `haptic.validationError()` on a failed-submit, `haptic.error()` on a network failure). The standard validation chokepoints (`useSubmitGuard`, `InspectionShell`) already own `haptic.validationError()`.

**Selection confirm.** When an option becomes selected, its indicator (radio dot / checkbox / check) springs in via [`useSelectionPop`](../components/animations/useSelectionPop.ts) — the selection sibling of `usePressBounce` (imported directly, not from the barrel; reduce-motion aware) — and its border/fill tweens over `theme.motion.fast` (150ms). Used by `Selector`, `StatusChip`, `ChipNavStrip`. `PlateInput`'s active cell fades its ink border in (no reflow); `FloatingLabelInput` tweens its focus border color. **Don't** inline per-item `useSharedValue`/`useEffect`/`useAnimatedStyle` selection logic — that drift is what `useSelectionPop` prevents.

**Icon-only** controls (delete ✕, close, overflow, back, inline "add") use [`components/primitives/IconButton.tsx`](../components/primitives/IconButton.tsx): `<IconButton icon={X} a11yLabel="..." variant="outline|danger|ghost|plain|overlay" size="sm|md|lg|xl" shape="circle|square" onPress={...} />`. `overlay` = deletes on top of images (white icon + dark scrim); `outline` = bordered, monochrome (the canonical back/close affordance, and the inline "add" button beside inputs). `shape="square"` (rounded-square, radius = `radii.input`) + `size="xl"` (56px) lines a button up flush next to a `FloatingLabelInput` — used for the witness "+" control in the incident form. The circular back button [`HeaderBackButton`](../components/HeaderBackButton.tsx) is just `IconButton variant="outline"` + ChevronLeft. **Don't** hand-roll a `Pressable` + `<Icon>` for these (was duplicated in PhotoSection/QualDoc/DynamicTable). The old text "< Back" pill (`HeaderBackPill`) was **removed** — one back style only. The web-app mirror is [`web-app/src/components/ui/icon-button.tsx`](../web-app/src/components/ui/icon-button.tsx) (same variants; CSS `active:scale` + back-out easing approximates the bounce). The remaining dashed "create new" tiles (New project, Add photo) are an intentional separate affordance — candidates for a future `AddTile` primitive, not `Button`.

## Single-select chip row (filters)

One component: [`components/ui/FilterChipRow.tsx`](../components/ui/FilterChipRow.tsx) — a horizontal row of pills where exactly one is active at a time (no "all" affordance unless the caller adds it). Driven by `{ key, label, icon? }[]` + `activeKey` + `onChange`.

Use it for any single-select chip filter. The History type-filter uses it, fed by the 5-type descriptor in [`features/records/recordTypes.ts`](../features/records/recordTypes.ts). **Don't** copy the old inline `FilterChip` that used to live in the per-project list screens — it was promoted to this shared component (and the draft/completed variants were removed when those lists went completed-only).

## Record section rows + widgets

One module: [`features/records/`](../features/records/) owns the per-type record UI reused across Home, History, the Drafts screen, and the project-detail sections — `RecordWidget` (the Home "section card" chrome), the status-free rows `ReportRow` / `OrderRow` / `BriefingRow` (inspections reuse [`components/InspectionRow`](../components/InspectionRow.tsx), incidents reuse `IncidentRow` from `components/projects/ProjectRowHelpers`), and `recordTypes.ts` (the single ordered descriptor — label/icon/key per type). Rows here carry a neutral type glyph only — **never** a draft/completed status badge. Completed-only is the caller's contract (`useRecent*({ status: 'completed' })`); drafts live in [`features/drafts/`](../features/drafts/). The card/row styles in `features/records/styles.ts` mirror the section subset of `features/project-detail/styles.ts` on purpose — keep them in sync.

## Form selector (option picker)

One component: [`components/ui/Selector.tsx`](../components/ui/Selector.tsx) — the canonical single/multi option picker.

`<Selector label="..." options={[{ value, label, icon?, leading?, subtitle? }]} value={v} onChange={setV} />` for single-select; add `mode="multi" values={...} onValuesChange={...}` for multi. Three presentations: `"chips"` (default, compact pills), `"rows"` (bordered cards), `"list"` (divided full-bleed rows for sheets/scrollable pickers — supports a custom `leading` element e.g. an avatar). Monochrome by design (ink border + subtle fill). For a dropdown/bottom-sheet trigger use [`components/ui/CustomDropdown.tsx`](../components/ui/CustomDropdown.tsx), which shares the option shape.

**Don't** hand-roll an option list with `options.map()` + `Pressable` + radio/chip styles — that drift is exactly what this consolidated. Now built on `Selector`: `IdentificationGrid` (3 inline selectors), `TopicSelector`, `ProjectPickerStep`, `SlingTypeSheet`. `CustomDropdown` still owns the sheet-trigger case and shares `SelectorOption`.

## Step & sub-item transitions

Two owners, by altitude — don't reinvent a slide/fade for either case:

| Use case | Owner |
|----------|-------|
| **Top-level wizard step** change (info → registry → checklist …) | [`components/wizard/WizardStepTransition.tsx`](../components/wizard/WizardStepTransition.tsx) — caller passes `direction` + `animate` (the wizard/flow state owns them). Used by `InspectionShell` and the scaffold wizard. |
| **Sub-item / chip-nav body** change (fall-protection device N1→N2, harness row, briefing signer) | [`components/inspection-parts/ChipSwitchTransition.tsx`](../components/inspection-parts/ChipSwitchTransition.tsx) — `<ChipSwitchTransition activeKey={index} mode="slide\|fade">{body}</ChipSwitchTransition>`. Tracks its own direction from the key delta; first mount doesn't animate (so it nests cleanly inside a `WizardStepTransition`). |

`ChipSwitchTransition` exists because switching `ChipNavStrip` chips used to swap the body instantly, so users didn't register that they'd navigated. Pair them: the strip (`ChipNavStrip`, which also auto-scrolls the active chip into view and grows it ~6% via an active-scale spring) renders **above** the transition; the per-item body is **inside** it; both get the same active index. Use `mode="fade"` for signature canvases / WebViews (a horizontal shift would disrupt them), `mode="slide"` (default) for checklist/conclusion bodies. Both honour reduce-motion (→ cross-fade). **Don't** wrap the chip strip itself in the transition (it must stay put), and **don't** add a third slide helper — fix one of these two.

## Pull-to-refresh

One component: [`components/primitives/RefreshControl.tsx`](../components/primitives/RefreshControl.tsx), exported from `components/primitives`.

`<RefreshControl queries={[projectsQ, statsQ]} />` — pass it as the `refreshControl` prop of any `ScrollView` / `FlatList`. It owns its own `refreshing` state, fires a medium haptic on pull, refetches every query in `queries` (anything with `.refetch()`), and tints the spinner with `theme.colors.accent` (light + Android `colors`). For non-React-Query screens pass `onRefresh={() => reload()}` instead (e.g. `profile.tsx` calls `refreshUser()`); both can be combined. `progressViewOffset`, `tintColor`, etc. pass straight through for screens with an overlaid animated header (`app/(tabs)/home.tsx`).

**Don't** re-implement the `const [refreshing, setRefreshing] = useState(false)` + `onRefresh` + `<RefreshControl tintColor={theme.colors.accent}>` boilerplate inline, and **don't** import `RefreshControl` from `react-native` directly — that duplicated pattern lived in ~13 screens, each free to drift on tint/haptic/error-handling. Consumers: `home`, `projects`, `certificates`, `more`, `incidents/[id]`, `reports/[id]`, `profile`, and the project detail sub-tabs.

## Storage images

One file: [lib/imageUrl.ts](../lib/imageUrl.ts). Three exports, named by purpose so picking the right name picks the right defaults:

| Use case | Function | Returns | On failure |
|---|---|---|---|
| RN `<Image>` display | `imageForDisplay(bucket, path)` | signed URL (or data URL fallback, or public URL) | never throws |
| Photo embedded in PDF HTML | `pdfPhotoEmbed(bucket, path, opts?)` | resized JPEG `data:` URL (1200px / q0.7), disk-cached | throws |
| Signature embedded in PDF or signature canvas | `signatureAsDataUrl(bucket, path)` | byte-exact `data:` URL | throws |

**Don't** add a fourth export. If you think you need one, you almost certainly want `pdfPhotoEmbed` with custom `opts`. The previous four-export version of this file caused the P1 "PDFs silently used unreachable signed URLs" bug because the wrong-default `getStorageImageDataUrl` was easy to call by accident.

For a screen showing **several** stored images at once, use [`hooks/useResolvedImageUris.ts`](../hooks/useResolvedImageUris.ts) — `useResolvedImageUris(bucket, paths)` resolves a list of paths via `imageForDisplay`, cached by path (so changing one entry doesn't refetch the others) and returns URIs aligned 1:1 with `paths` (`null` while loading). The report slide editor feeds the same `uris` to both the live preview and the photo tiles this way. For a single image, call `imageForDisplay` inline.

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

## Inspection PDF engine

Equipment inspection PDFs are generated by one schema-driven engine in [lib/inspection/](../lib/inspection/). A new inspection type is a **data descriptor** (`lib/inspection/schemas/<type>.ts`) wired into the engine — never a hand-written `lib/<type>Pdf.ts` builder. This replaced 9 near-identical builders (each with its own copy of the CSS, `escHtml`/`fmtDate`, and a mobile-only photo-embed loop that rendered blank on the web dashboard).

| Use case | Owner |
|---|---|
| Render an inspection → PDF HTML (synchronous, platform-free) | `buildInspectionPdf(schema, data, photos)` — [lib/inspection/pdf.ts](../lib/inspection/pdf.ts) |
| Render on mobile (resolve photos, then build) | `renderInspectionPdf(schema, { inspection, projectName })` — [lib/inspection/renderMobile.ts](../lib/inspection/renderMobile.ts) |
| Resolve `answer-photos` paths to URLs (signed HTTPS on web, base64 on mobile; deduped, broken skipped) | `resolveInspectionPhotos(paths)` — [lib/inspection/photos.ts](../lib/inspection/photos.ts) |
| CRUD service for an inspection type | `makeInspectionService(config)` — [lib/inspection/service.ts](../lib/inspection/service.ts) |
| `template.category` → `{ schema, service }` dispatch | `inspectionRegistry` — [lib/inspection/registry.ts](../lib/inspection/registry.ts) |
| Shared base CSS / HTML escaping / date format | `BASE_PDF_CSS` ([pdfStyles.ts](../lib/inspection/pdfStyles.ts)), `escapeHtml`/`fmtDate` ([escape.ts](../lib/inspection/escape.ts)) |

**Don't** add a `lib/<type>Pdf.ts` or a hand-written per-type CRUD service — add a schema in `lib/inspection/schemas/` and build the service via `makeInspectionService`. **Don't** use `embedInspectionPhotos` for inspection PDFs (mobile-only — blanks photos on the web dashboard); the engine's `resolveInspectionPhotos` is web-safe, and `scripts/check-primitives.mjs` blocks the old helper.

`lib/pdfShared.ts` (`escHtml`/`fmtDate`/`embedInspectionPhotos`) is **legacy**, retained only for `lib/breathalyzerLogPdf.ts` (a log, not a checklist inspection). Do not use it for new inspection PDFs.

## Inspection PDF template palette (generic/template-based PDFs)

The **generic** inspection PDF/act template — `buildInspectionPdfTemplate` in [`lib/pdf/inspection/`](../lib/pdf/inspection/), used by harness/scaffold and other template-driven inspections, and shared by the web dashboard print page via `@root` — gets all its colours from one owner: [`lib/pdf/inspection/tokens.css.ts`](../lib/pdf/inspection/tokens.css.ts) (`getInspectionPdfTokens()`), prepended into `getInspectionPdfCss`.

Brand/structure is **monochrome ink (`#1A1A1A`) + a single orange accent (`#FF6D2E`)**; the `--green*`/`--red*`/`--amber*` semantic tokens are reserved for the **verdict + pass/fail answers only** (safe = `#10B981`). The tokens are **copied, not imported**, from `lib/theme.ts` (the builder is pure/platform-free, so it can't import the RN theme) — keep them in sync by hand on a rebrand. **Don't** hardcode hex in `template.css.ts` (tokenize it here) and **don't** reintroduce the old brand green `#1D9E75`. This is distinct from the equipment engine's `BASE_PDF_CSS` ([lib/inspection/pdfStyles.ts](../lib/inspection/pdfStyles.ts)) above and the dashboard's separate `web-app/src/lib/inspection/pdfStyles.ts`.

## Mobile photo picker + annotation

One file: [`hooks/usePhotoPicker.ts`](../hooks/usePhotoPicker.ts) (formerly `usePhotoWithLocation` — geotagging removed 2026-06). The canonical entry point for all mobile photo-upload flows.

| Use case | Export |
|---|---|
| Open picker → optional annotate → return ONE photo (URI + location) | `pickPhotoWithAnnotation(opts?)` — single-slot fields. Pass `{ skipAnnotate: true }` for non-markup contexts. Returns `PhotoWithLocation \| null`. |
| Open picker (batch mode) → return MANY photos | `pickPhotosWithAnnotation(opts?)` — galleries (inspection item/summary photos, answer photos, incident photos, project files). Returns `PhotoWithLocation[]` (`[]` if cancelled). A single live capture still annotates → one photo; a recent-strip / system-library batch skips annotation → all photos, sharing one location+timestamp. **Upload sequentially or with a small concurrency cap — never an unbounded `Promise.all` over full-res photos.** |
| Re-annotate an already-uploaded photo URI | `pickPhotoWithAnnotationFromUri(sourceUri, location)` |

The picker opens `/photo-picker` (live camera + gallery + GPS via `photoPickerBus`); `pickPhotosWithAnnotation` opens it with `?multi=1` for the multi-select UX (pinch-to-zoom on capture, recent-strip multi-select with a "დასრულება (n)" bar, multi-select system library). The bus callback delivers `string[] | null`. The annotator opens `/photo-annotate` — the user may save without drawing. Never call `ImagePicker.launchCameraAsync` or `ImagePicker.launchImageLibraryAsync` directly outside this hook or `app/photo-picker.tsx` — the lint check blocks it.

## Report slide photos + layout

One file: [`lib/reportSlides.ts`](../lib/reportSlides.ts). A report slide (`ReportSlide`, stored as JSON in the `reports.slides` column — no SQL schema) carries **1–2 photos** (`MAX_SLIDE_PHOTOS`) and a chosen render `layout`. The canonical store is `ReportSlide.images: SlideImage[]`, but older reports persisted a single photo in the now-`@deprecated` `image_path` / `annotated_image_path` fields.

**Always go through these helpers — never read `slide.image_path` / `slide.annotated_image_path` directly.** This module is the only place that knows the legacy single-photo shape.

| Use case | Export |
|---|---|
| Read a slide's photos (0–2, empties dropped; folds legacy single fields) | `slideImages(slide)` → `SlideImage[]` |
| Best display/PDF path for one image (annotated variant preferred) | `slideImagePath(img)` |
| All photo paths on a slide (for PDF prefetch via `pdfPhotoEmbed`) | `slideImagePaths(slide)` |
| The report's cover photo path (first photo across slides, for the list/card thumbnail "sneak peek") | `reportCoverPath(slides)` → resolve to a URI via `useReportCoverUri(report)` in `features/records` |
| Resolve the layout to render (honors `slide.layout` only when valid for the photo count, else auto-defaults) | `slideLayout(slide)` |
| Layout options valid for a photo count (drives the editor chips) | `layoutsForCount(count)` |
| Write photos back (caps at 2, mirrors `images[0]` into the legacy fields, sets layout) | `withSlideImages(slide, images, layout?)` |

Layouts: `text-photo` (1 photo, desc left/photo right), `photo-full` (1 photo full-width), `two-side` (2 photos side by side), `two-stacked` (2 photos stacked). The editor UI lives in [`components/reports/`](../components/reports/AGENTS.md) (`SlidePhotoRow`, `SlideLayoutPicker`); the read-only detail card is `ReportSlidePreview`; the PDF renders them in [`lib/reportPdf.ts`](../lib/reportPdf.ts). The 2-photo cap is enforced by **absence** of the add tile, not a disabled button.

## Web dashboard photo upload (answer-photos bucket)

One file: [`web-app/src/lib/photoUpload.ts`](../web-app/src/lib/photoUpload.ts). Handles uploading, signed-URL generation, and deletion of photos stored in the `answer-photos` Supabase Storage bucket from the web dashboard.

| Use case | Function |
|---|---|
| Upload a photo file for an inspection item | `uploadInspectionPhoto(prefix, inspectionId, itemId, file)` → storage path |
| Get a short-lived signed URL for viewing | `signedInspectionPhotoUrl(path)` → URL |
| Remove a photo blob (best-effort) | `deleteInspectionPhoto(path)` |

For UI, use [`web-app/src/components/PhotoUploadWidget.tsx`](../web-app/src/components/PhotoUploadWidget.tsx) — handles thumbnails, upload button, lightbox, and delete. Don't build a second upload widget component. For non-`answer-photos` buckets, pass optional `uploadFn`, `signedUrlFn`, and `deleteFn` props to override the default helpers.

## Web dashboard equipment inspection detail (web-app)

The four equipment inspection detail pages (bobcat, excavator, general-equipment, cargo-platform) share one engine in [`web-app/src/features/inspections/equipment/`](../web-app/src/features/inspections/equipment/). A detail page is a thin **per-type component** composing the shared lifecycle hook + widgets — never a hand-rolled query/mutation/PDF-overlay copy (that was the ~70% duplication across five 500–940-line pages this replaced).

| Use case | Owner |
|---|---|
| Draft/query/mutation/delete + step/pdf/justCompleted lifecycle | `useEquipmentDetail(config)` — [useEquipmentDetail.ts](../web-app/src/features/inspections/equipment/useEquipmentDetail.ts) |
| Result-selector pills (good/deficient/unusable, good/fix/na, …) | `ResultPills` + `ResultOption<V>` — [components/ResultPills.tsx](../web-app/src/features/inspections/equipment/components/ResultPills.tsx); map each enum onto a `tone` |
| One checklist row (numbered label + pills + comment + photos) | `ChecklistItemRow` — [components/ChecklistItemRow.tsx](../web-app/src/features/inspections/equipment/components/ChecklistItemRow.tsx) |
| Completed "act finalized" green banner | `CompletedBanner` — [components/CompletedBanner.tsx](../web-app/src/features/inspections/equipment/components/CompletedBanner.tsx) |
| Full-screen PDF preview overlay (print-route iframe) | `InspectionPdfOverlay` — [components/InspectionPdfOverlay.tsx](../web-app/src/features/inspections/equipment/components/InspectionPdfOverlay.tsx) |

**Don't** add a `web-app/src/pages/<Type>InspectionDetail.tsx` — add a `features/inspections/equipment/<Type>Detail.tsx` that calls `useEquipmentDetail` and renders its type-specific steps with the shared widgets. The per-type data module ([`lib/data/<type>.ts`](../web-app/src/lib/data/) via `makeRepository`) supplies the get/update/remove/create fns + patch type. This is the **dashboard editor**; the legal PDF is rendered separately by `web-app/src/pages/print/<Type>Print.tsx` from the saved row — keep the `save()` shapes stable and the PDF is unaffected.

## Web dashboard separation — no shadows (web-app)

The web-app uses **borders and backgrounds** for separation, never box-shadows. Don't add Tailwind `shadow-*` / `drop-shadow-*` utility classes in `web-app/src` — [`scripts/check-no-shadows.mjs`](../web-app/scripts/check-no-shadows.mjs) (run by `npm run lint`) blocks them. Modals/popovers get a `border`; cards rely on their existing `border`; hover affordance is a border-color change, not `hover:shadow-*`. The `shadow-*` light props on three.js elements in `Scene3D.tsx` are exempt — they're three.js config, not CSS.

## Web dashboard inspection create/edit wizard (web-app)

One wizard owns the dashboard's question/template-driven inspection create + edit flow: [`web-app/src/components/InspectionWizard.tsx`](../web-app/src/components/InspectionWizard.tsx). It handles the generic flow and — via a `WizardPreset` — streamlined per-type flows (e.g. harness: locked template, project-only info step, grid-first checklist, required conclusion, navigate-to-detail on success).

**Don't** build a bespoke `<Type>InspectionModal` — add a `WizardPreset` (see [`components/inspections/harnessPreset.ts`](../web-app/src/components/inspections/harnessPreset.ts)) and mount `<InspectionWizard preset={…} />`. The `component_grid` step renders via the shared [`HarnessWizard`](../web-app/src/components/inspections/HarnessWizard.tsx); the ok/bad summary + success badges are computed generically from the grid answer. The post-create success screen is `InspectionSuccessCard` — don't add a second success modal on the detail page.

## Inspection wizard shared UI

Shared step-flow chrome lives in [`components/wizard/`](../components/wizard/). The full header + back + progress bar comes from `FlowHeader`; don't roll a custom per-screen header.

| Component | Export | Purpose |
|---|---|---|
| [components/FlowHeader.tsx](../components/FlowHeader.tsx) | `FlowHeader` | Header for all inspection / briefing / incident flows: project name subtitle, circular back + circular close buttons, thin **ink (monochrome)** progress bar + `step / total` counter. `trailingElement` renders alongside the close ✕ when `trailing="close"` (e.g. a PDF icon next to the X), or on its own with `trailing="none"`. The circular back button itself is `HeaderBackButton` (see below). |
| [components/HeaderBackButton.tsx](../components/HeaderBackButton.tsx) | `HeaderBackButton` | The 38px circular, icon-only `ChevronLeft` back button — extracted from `FlowHeader` so non-flow stacked screens that render their own header reuse the exact circle/border/icon treatment instead of re-inlining it (the canonical consumer for those screens is now `ScreenHeader`, above). Defaults `onPress` to `router.back()`; accepts `disabled`. **Don't** hand-roll another `circleBtn` Pressable for a back affordance. (Note: `HeaderBackPill` is the separate **text** "‹ უკან" pill — different control.) |
| [components/ScreenHeader.tsx](../components/ScreenHeader.tsx) | `ScreenHeader` | In-content header for **non-flow stacked screens** (record detail / preview / list screens reached by a push): `SafeAreaView edges={['top']}` + circular `HeaderBackButton` + centered 17px title + optional `right` control (delete / share). The canonical replacement for the native `<Stack.Screen headerShown title=… />` bar, which on iOS draws a translucent "glass" container we don't want. **Pair with `<Stack.Screen options={{ headerShown: false }} />`** and drop the `Screen`/`SafeAreaView` top edge (`edges={[]}` or `['bottom']`) so the top inset isn't doubled. Used by History, the PDF-preview/detail screens (`inspections/[id]`, `reports/[id]`, `briefings/[id]`, `incidents/[id]`), profile, templates, breathalyzer, signer, safety-3d, qualifications. For multi-step *flows* use `FlowHeader` instead. **Don't** reintroduce a native `headerShown: true` header on these screens. |
| [components/HeaderCloseButton.tsx](../components/HeaderCloseButton.tsx) | `HeaderCloseButton` | The 38px circular, icon-only `X` close button — the sibling of `HeaderBackButton`. The single owner of the flow/sheet close affordance: used by `FlowHeader` (`trailing="close"`), `SheetLayout`'s `{ title, onClose }` header, and the map-picker overlays. **Don't** inline a raw `<Pressable><X/></Pressable>` for a dismiss control — the bordered-circle treatment had already drifted (inkSoft vs ink, 22 vs 24px, with/without border) across the project sheets this consolidated. |
| [components/wizard/StatusChip.tsx](../components/wizard/StatusChip.tsx) | `StatusChip` | **Monochrome** single-select answer control — the shared building block for every inspection answer surface (yes/no, 3-state good/deficient/unusable, harness chips, verdict pills). Selected = **solid ink fill** (`inverse.background`) + inverted light content; unselected = hairline outline + `surface` + muted content. Built on the theme `inverse` palette so the fill stays legible in dark mode. Severity is carried by the icon (`✓/⚠/✗`) + label, never color. `layout="pill"` (stacked, big yes/no) or `"chip"` (compact row). |
| [components/inspection-parts/ChecklistItemRow.tsx](../components/inspection-parts/ChecklistItemRow.tsx) | `ChecklistItemRow` | **Canonical "one item in a several-items-on-one-page checklist" row.** Label + inline `HelpIcon` on the left, a cluster of `StatusChip`s on the right (2 = harness ✓/✗; 3–4 = equipment ratings incl. N/A). Neutral (no chip filled) by default; tapping the selected chip clears to null. `dense` for 3–4 options. No per-row note/photo — problem detail lives on the conclusion step. Harness `ChipRow`, equipment `ChecklistRow`, and `ChecklistItem` are all thin adapters over this. |
| [components/inspection-parts/ChecklistLegend.tsx](../components/inspection-parts/ChecklistLegend.tsx) | `ChecklistLegend` | Quiet monochrome key pairing each answer chip's glyph (shown filled) with its Georgian label. Render above a `ChecklistItemRow` list. |
| [features/inspection-wizard/AttachmentBars.tsx](../features/inspection-wizard/AttachmentBars.tsx) | `AttachmentBars` | Photo + note attachments as two quiet dashed bars — the photo bar stays put and shows `PhotoThumb` thumbnails as they're added; the note bar morphs into the `DebouncedNotes` textarea on tap. Omit `onNoteCommit` for a photo-only bar (the conclusion step). Used by the wizard QuestionStep/ConclusionStep — **not** inside checklist rows (those are flag-only). |
| [components/wizard/StepSectionLabel.tsx](../components/wizard/StepSectionLabel.tsx) | `StepSectionLabel` | Uppercase hairline-bottom section divider used between named sections inside a step. |
| [components/wizard/WizardNav.tsx](../components/wizard/WizardNav.tsx) | `WizardNav` | Fixed-footer "წინა / შემდეგი / ✓ დასრულება" row. Shared by all five inspection flows. |

**Don't** hand-roll an inline step indicator or a local `StepSectionLabel` in a screen file — that's exactly the duplication pattern that was cleaned up (two copy-pasted step-bar + `slStyles` blocks in bobcat and excavator). The canonical multi-step indicator is now `FlowHeader`'s progress bar (the old standalone `StepBar` was unused and removed). **For any "several items on one page" checklist, render `ChecklistItemRow`** — don't hand-roll a row + verdict-chip cluster (that's what the now-deleted per-equipment `*ChecklistItem` copies did). **Inspection answer / rating controls are monochrome** (decided 2026-06-17; solid-fill selected state same day): build them with `StatusChip`, or apply its token treatment directly — selected = **solid `theme.colors.inverse.background` fill + `inverse.ink` content**; unselected = `border` + `surface` + `inkSoft`/`inkFaint`. Don't use `semantic.success/warning/danger` or `accent` as a fill/border on an answer control, and never hardcode `'#10B981'`/`'#1D9E75'` greens there — color is reserved for non-answer affordances (badges, toasts, step checkmarks, destructive actions). Per-row notes/photos were removed from all checklists — problem detail + photos live on the conclusion step.

## Inspection flow loading state

Every inspection flow blocks on an initial data fetch (equipment routes via [`lib/inspection/useInspectionFlow.ts`](../lib/inspection/useInspectionFlow.ts); the generic scaffold wizard + harness load their own). During that window render [`InspectionShellSkeleton`](../components/inspection-steps/InspectionShellSkeleton.tsx) from the `if (loading || !inspection)` gate — it reuses the **real `FlowHeader`** (same `card` background, same back/close **and the live progress bar**) over a body skeleton + footer-button placeholder, so the header and progress strip **never wait on loading**; only the body morphs skeleton → content. Pass the same `title`, `projectName`, **0-based `step`**, `totalSteps` and `stepLabels` the route hands `InspectionShell` so the progress bar lands in its final position with no jump, plus `onClose={() => router.back()}`.

The body placeholder is chosen by **`variant`** so each step shows a shape matching the content it is about to become — `form` (input bars, with `fields` count), `keypad`, `checklist`, `conclusion`, `table`, or `question` (generic wizard). Map the current `step` → `variant` in the route's loading gate (mirror the route's `step` transform). Variants live in [`StepSkeletons.tsx`](../components/inspection-steps/StepSkeletons.tsx) (`StepBodySkeleton`) and are all built from the shared [`Skeleton`](../components/Skeleton.tsx) atom, so the shimmer colour + animation stay identical across every flow. Omit `totalSteps` to hide the progress bar (the generic wizard does this — its step count isn't known until questions load).

**Don't** fall back to a native `<Stack.Screen headerShown title=… />` + centered "იტვირთება…" `Text` — that was the pattern in all 9 equipment flows; it shows a native iOS header on a `background`-colored screen, then swaps to the `InspectionShell` chrome (`headerShown:false` + `FlowHeader` + `card` bg) once data lands, which reads as a generic loader rather than the flow. **Don't** reintroduce a single generic body skeleton (the removed `SkeletonWizard`) for every step — pick the matching `variant`. Other non-flow screens still use the shared list/preview skeletons (`SkeletonListCard` / `SkeletonPreview`).

## Flow-entry project picker

When a document flow (incident, briefing, report) is launched **without** a project — i.e. from Home rather than a project screen — it shows the project picker as a full-screen first step, not a bottom sheet. One owner: [components/FlowProjectPicker.tsx](../components/FlowProjectPicker.tsx) (`FlowProjectPicker`). It composes `FlowHeader` + a dashed "ახალი პროექტი" row + the canonical [`ProjectPickerStep`](../components/inspection-steps/ProjectPickerStep.tsx) list + a "გაგრძელება" button, and reuses [`ProjectPickerSheet`](../components/home/ProjectPickerSheet.tsx) (`initialView="new"`) for create-a-project.

The host `new` screen gates on the project: `const projectId = paramProjectId ?? pickedProject?.id;` — render `<FlowProjectPicker>` when it's missing, the real form otherwise. The inspection flow keeps its own equivalent inside [`app/inspections/new.tsx`](../app/inspections/new.tsx) (wrapped in `InspectionShell`, since it then creates a record and routes on). **Don't** reintroduce a per-flow project bottom sheet, and **don't** hand-roll another project list — render `ProjectPickerStep` (it owns the `useProjects()` three-state guard).

## Post-save success screens

One folder: [`components/success/`](../components/success/). The check-mark + summary card + primary CTA + secondary action-card screen reached after a document is saved. This replaced ~6 byte-identical copies of the same `Screen` + `CelebrationBurst` + `AnimatedSuccessIcon` + `ActionCard` + `StyleSheet`.

| Use case | Owner |
|---|---|
| Generic success scaffold (header, burst, check-mark, CTA, action cards, completion haptic) | `SuccessScreen` — [components/success/SuccessScreen.tsx](../components/success/SuccessScreen.tsx) |
| Inspection "act saved" body (corrected wording baked in) | `InspectionDoneView` — [components/success/InspectionDoneView.tsx](../components/success/InspectionDoneView.tsx) |

**Don't** rebuild the success scaffold inline in a new `done.tsx` / `success.tsx` — render `<SuccessScreen>` with a summary card as `children`, or `<InspectionDoneView>` for inspection acts. **Don't** fire `haptic.inspectionComplete()` in a consumer — `SuccessScreen` already does it once on mount.

**Terminology:** the inspection document is a **"შემოწმების აქტი"**, never "ინსპექცია" (a wrong term). Keep "ინსპექცია" out of every user-facing string. `reports/[id]/success.tsx` intentionally stays separate — it's a full-bleed PDF-share layout, not the card scaffold.

## Count / quantity selector

One file: [`components/inputs/QuantitySelector.tsx`](../components/inputs/QuantitySelector.tsx). A one-tap count picker — a wrap-grid of preset chips plus a custom numeric field, clamped to `[min, max]`. Use it for any "how many?" prompt instead of rolling another inline `remove-circle`/`add-circle` stepper (the harness count step uses it).

Props: `value`, `onChange`, `presets?`, `min?`, `max?`, `accessibilityLabelPrefix?`. The caller supplies domain presets + bounds; the component owns the chip/typing UX and the clamp, so a typed entry can never go out of range.

**For new count prompts, prefer `QuantitySelector`** over a hand-rolled stepper. (Several older steppers predate it — `app/qualifications`, `app/reports/[id]/edit`, `DynamicTable`, etc. — and can migrate opportunistically.)

## PDF security / integrity

One file: [lib/pdfSecurity.ts](../lib/pdfSecurity.ts). Exports `injectSecurityMarkup`, `lockPdf`, `hashPdf`, `verifyPdf`, and `PdfSecurityOptions`.

Pass `PdfSecurityOptions` as the 5th argument to `generateAndSharePdf` (from `lib/pdfOpen.ts`). The function will automatically inject the security CSS + footer watermark into the HTML before rendering and stamp pdf-lib metadata into the output file. Callers that upload the PDF to Supabase should also call `hashPdf(localUri)` on the returned URI and store the result in the corresponding DB table's `pdf_hash` column for tamper detection.

**Don't** call `pdf-lib`'s `PDFDocument` directly outside this file — it belongs in one place. **Don't** call `expo-crypto`'s `digestStringAsync` directly for PDF hashing — use `hashPdf`.

| Export | Purpose |
|---|---|
| `injectSecurityMarkup(html, opts)` | Adds meta tags, `user-select:none` CSS, and fixed-position footer watermark to HTML before `printToFileAsync` |
| `lockPdf(uri, opts)` | Stamps pdf-lib metadata (title, author, subject, producer, dates) into the PDF at `uri` in place |
| `hashPdf(uri)` | SHA-256 digest of the PDF Base64 — deterministic for the same bytes |
| `verifyPdf(uri, storedHash)` | Compares current hash to a previously stored value; returns `false` if the file was modified |

## Illustration palette (monochrome SVG art)

One file: [lib/illustrationPalette.ts](../lib/illustrationPalette.ts). Export: `useIllustrationPalette()` → `IllustrationPalette`.

Hubble's hand-drawn SVG illustrations are strictly **monochrome**: shades of the primary (brand orange `#FF6D2E`), the secondary (electric/hi-vis yellow), and black / warm neutrals. **No green, no blue, no amber** — those were pre-rebrand leftovers that read as "wrong" against the current identity (the green hard hat, green scaffold avatars, green blueprint were all this bug).

Any illustration component (`QuestionAvatar`, `EmptyState`, `ErrorScreen`, `SkeletonMap`, `InspectionTypeAvatar`, …) must source its colors from this hook (or the named tokens below) instead of hardcoding hex values, so the system stays cohesive and can't drift back to off-brand colors.

| Token | Meaning |
|---|---|
| `line` / `lineDeep` / `lineDeepest` | Primary orange stroke + its darker shades (faces, recesses) |
| `fill` / `fillStrong` | Soft primary washes (tile backgrounds, large fills) |
| `pop` / `popSoft` | Secondary electric-yellow accent — sparingly, for stamps/sparks/stars/flash on a darker backing |
| `ink` | Black (adapts to theme) |
| `hardware` / `material` / `materialLine` / `metal` / `metalDark` / `ground` | Fixed neutral grays for steel, decks, base bars |

**Don't** reintroduce per-category color coding (the old `InspectionTypeAvatar` pastel rainbow, `EmptyState`'s blue/amber category tints). Differentiate with shape/emoji, not off-brand hues. Semantic status colors (`semantic.success` green for "completed", verdict greens/reds) are a **separate** system in [lib/statusColors.ts](../lib/statusColors.ts) and are intentionally not monochrome.

## PDF usage gate

One file: [lib/pdfGate.ts](../lib/pdfGate.ts). Exports `checkAndIncrementPdfCount` and `PdfLimitReachedError`.

**Never** call `supabase.rpc('increment_pdf_count', ...)` directly — always go through `checkAndIncrementPdfCount`. The function is re-exported from [lib/pdfOpen.ts](../lib/pdfOpen.ts) (`PdfLimitReachedError`) so callers only need to import from `pdfOpen`.

Usage pattern in any screen that calls `generateAndSharePdf`:
1. Pass `userId` as the 4th argument to `generateAndSharePdf`.
2. In the `catch` block, check `if (e instanceof PdfLimitReachedError)` before the generic `toast.error` and show `<PaywallModal>`.
3. Use `<PaywallModal>` from [components/PaywallModal.tsx](../components/PaywallModal.tsx) — don't write an inline alert with a subscribe prompt.

**Don't** call `supabase.rpc('increment_pdf_count', ...)` from the client without going through `generateAndSharePdf`; the check is atomic — it only increments if the user is allowed, so a direct call would consume a use without generating anything.

## Record type pill / type badge

One file: [`components/RecordTypePill.tsx`](../components/RecordTypePill.tsx). Shows a small muted overline label identifying an item's record type. **Not currently consumed by any app row** — records are now grouped under per-type sections/widgets/History tabs, so the per-row "შემოწმება" type label became redundant and was dropped from `InspectionRow`. Kept as a catalog primitive (Storybook) for any future mixed-type list that needs an inline type label.

| Export | Purpose |
|---|---|
| `RecordTypePill` | Label component. Props: `recordType` (`'inspection' \| 'incident' \| 'briefing' \| 'report'`), optional `label` override. Renders a small muted overline text (e.g. "შემოწმება", "ინციდენტი"). |

If you do reintroduce it, always show the top-level document type — never the inspection subtype (that's already visible from the avatar emoji and template name). Don't add ad-hoc inline type labels elsewhere; use this component.

## Inspection list row

One file: [`components/InspectionRow.tsx`](../components/InspectionRow.tsx). The **canonical inspection list row** — gray category avatar (`InspectionListAvatar`) + title + subtitle + optional trailing slot. Shared by the home screen "recent activity" list (`app/(tabs)/home.tsx`) and the project-detail inspections section (`features/project-detail/sections/InspectionsSection.tsx`) so the two never diverge. Pure presentational — the caller owns navigation (`onPress`), swipe wrappers, and any trailing `actions` (kebab menu).

| Prop | Purpose |
|---|---|
| `category` / `status` | Drive the avatar illustration + draft/completed ring. |
| `title` / `subtitle` | Primary + secondary text (e.g. project name on home, date in the project card). |
| `trailing` | Inside the press target, after the text. A string renders as the muted time label; any node renders as-is (e.g. a `ChevronRight`). |
| `actions` | Rendered **outside** the press target (e.g. a kebab whose popover is absolutely positioned), so taps on the menu don't also navigate. |
| `inset` | Horizontal padding. Default `20` (home, full-bleed). Pass `0` inside an already-padded card so the card's gutter is the only inset and dividers span the card's inner width. |
| `showBorder` | Hairline bottom divider — omit on the last row of a group. |

**Don't** re-inline an avatar + title + time row in a screen file — that's the duplication this consolidated. Story: `design-system/stories/InspectionRow.stories.tsx`.

## Order (ბრძანება) PDF builder

One file: [`lib/orderPdf.ts`](../lib/orderPdf.ts). Exports `buildLaborSafetyOrderHtml(args: OrderPdfArgs): string`.

Generates a plain, document-style HTML string (A4 / serif / black on white) matching the official Georgian template for appointing a labor safety specialist. The legal basis bullets and all 7 duty sub-points in §2 are **static** — only the form data fields injected via `OrderPdfArgs.formData` vary.

**Don't** copy the `escHtml` helper or the `fmtDate` helper out of this file — if you need them for a different order type, add a shared module. **Don't** style this HTML with colors or cards; keep it document-like to match the original template.

Usage (mirrors `buildIncidentPdfHtml` pattern):
```ts
const html = buildLaborSafetyOrderHtml({ formData, projectName });
const localUri = await generateAndSharePdf(html, pdfName, true, userId);
```

## Document display names (shared with web)

One file: [`lib/shared/documentName.ts`](../lib/shared/documentName.ts). Exports `inspectionDisplayName`, `reportDisplayName`, `certificateDisplayName`, `orderDisplayName`. **Pure TypeScript** — no React/RN/DOM/i18n imports — so it is the single source of truth imported by **both** the Expo app (relative import, e.g. `../lib/shared/documentName`) and the `web-app/` dashboard (`@root/lib/shared/documentName`, re-exported via `web-app/src/lib/documentNames.ts`).

`inspectionDisplayName` returns the **short UI display name**: it maps the formal `templates.name` stored in the DB (e.g. `დამცავი ქამრების შემოწმების აქტი`) to the short form shown in list rows, cards, and screen titles (e.g. `დამცავი ქამრები`) via the `INSPECTION_SHORT_NAME` map in this same file. A name that's already short (or not in the map) falls through unchanged; an empty/missing name falls back to the generic Georgian label. The other three helpers return the document's title/type string (or a generic fallback), never a raw `id` slice.

**Do NOT** call `inspectionDisplayName` from `lib/pdf/**` or `web-app/src/pages/print/**` — printed PDF reports and legal artifacts must keep the full formal `templates.name`. The helper is for screen display only.

When you add a new template in `supabase/migrations/`, add its full→short pair to `INSPECTION_SHORT_NAME` in this **one** file — both codebases import it, so there is no second map to keep in sync. (This replaced the earlier duplicated `lib/inspectionDisplayName.ts` + `web-app/src/lib/inspectionDisplayName.ts` pair.)

**Don't** reintroduce `harness_name || "#" + id.slice(0,8)` style fallbacks in either codebase — that drift (web showing `ქამარი #0c9537aa` while mobile showed the template name) is exactly what this primitive removes. Equipment inspections on web have no template row, so `web-app/src/lib/documentNames.ts` maps their type to a constant full name and routes it through `inspectionDisplayName`.

## Inspection conclusion step + verdict selector

The single "last step" for **every** inspection flow is [`components/inspection-steps/ConclusionStep.tsx`](../components/inspection-steps/ConclusionStep.tsx) (re-exported from `components/inspection-steps`). Top to bottom it renders: a conclusion illustration (`QuestionAvatar`, `showAvatar` default true), an optional `summarySection` slot (summary tables), an optional harness-name field, a verdict-suggestion banner, the icon-card `VerdictSelector`, a free-text **`კომენტარი`** box (`notesLabel` overridable; `notesRequired`/`notesError` for required flows), optional suggestion pills, and a photo strip (first-class `photoPaths`/`onAddPhoto`/`onDeletePhoto` → `PhotoSection`, or a `photoSection` ReactNode slot for the scaffold's `AttachmentBars`). Generic over the verdict value type. Pass `scroll={false}` when the host already owns the scroll view.

Used by **all** flows: equipment routes (bobcat, excavator, forklift, cargo-platform, mobile-ladder, lifting-accessories, safety-net, and general-equipment — which passes empty `verdictOptions` for a verdict-less conclusion), the harness flow, and the scaffold wizard's [`features/inspection-wizard/ConclusionStep.tsx`](../features/inspection-wizard/ConclusionStep.tsx) (a thin wrapper that delegates with `scroll={false}` and feeds the 3-option `SafetyVerdict` set). Fall-protection is the one exception: its verdict is **per device**, so it composes `VerdictSelector` + `VerdictSuggestionBanner` directly inside each device panel rather than wrapping the whole step.

**`VerdictSelector`** ([`components/inspection-steps/VerdictSelector.tsx`](../components/inspection-steps/VerdictSelector.tsx)) — the `გადაწყვეტილება` (decision) picker. Dynamic: pass `options: VerdictOption[]` (any 2–3 verdicts) and it renders one icon + label button each. The icon resolves from an explicit `option.icon`, else a semantic `option.tone` (`success`/`caution`/`danger`), else **by position** (first = `shield-checkmark`, last = `warning`, middle = `eye-outline`) — every flow orders options positive → negative, so most wire nothing extra.

**`VerdictSuggestionBanner`** ([`components/inspection-steps/VerdictSuggestionBanner.tsx`](../components/inspection-steps/VerdictSuggestionBanner.tsx)) — the shared `შემოთავაზება` hint (Lightbulb + text) shown above the selector when an auto-computed verdict differs from the chosen one. Pass `text` and an optional `onApply` (makes the banner tappable to adopt the suggestion). `ConclusionStep` renders it from its `suggestion` prop.

**Don't** hand-roll verdict chips/buttons, a suggestion banner, or a `დასკვნა` last-step layout in a flow. This consolidation removed three forks: the old pill chips in `ConclusionStep`, the bespoke `features/inspection-wizard/VerdictSelector`, and the separate **`components/inspection-parts/VerdictSelector`** (a plain-pill selector with a built-in notes field, formerly used by forklift/cargo-platform/mobile-ladder/lifting-accessories/safety-net/fall-protection — now **deleted**). If a flow needs a different verdict set, pass different `options`; a different icon, set `icon`/`tone` on the option; extra content above the verdict, use `summarySection`.

## Form validation — enabled buttons + on-press errors

We **do not disable** forward/submit buttons when a required field is empty — a dimmed, unpressable button gives the user no signal about *what* is missing. Instead the button stays **enabled**, and pressing it while invalid reveals the empty required fields in red (+ an error haptic), so the user understands the field is mandatory.

One hook owns this: [`hooks/useSubmitGuard.ts`](../hooks/useSubmitGuard.ts).

```ts
const { attempted, guard, reset } = useSubmitGuard();
// button (no validation-based `disabled`):
<Button onPress={() => guard(canAdvance, goNext)} ... />
// each required field:
<FloatingLabelInput required error={attempted && !value.trim() ? 'სავალდებულო ველი' : undefined} ... />
// multi-step screens: clear the reveal on step change
useEffect(() => reset(), [step, reset]);
```

`guard(isValid, onValid, onInvalid?)`: when invalid it sets `attempted`, fires `haptic.validationError()`, and calls `onInvalid` (don't advance); when valid it clears `attempted` and runs `onValid`. The precedent it generalizes lives in `ConclusionStep`'s `interacted` flag and `AddRemoteSignerModal`'s `*Touched` flags.

Field error support already exists on the primitives — wire them, don't rebuild:
- **Text** — `FloatingLabelInput` (`error?: string`, `required` → `*`), and the `FormField`/`ui/Field` wrappers (render `error` below any child — use them to give radio/picker **groups** an inline error message).
- **Verdict** — `inspection-steps/VerdictSelector` (`showError`/`errorText`) and `ConclusionStep` (`verdictError`/`notesError`).
- **Yes/No chips** — `wizard/AnswerButtons` (`error?: boolean`) → `wizard/StatusChip` (`error?: boolean`, danger outline + shake).
- **Date/time** — `DateTimeField` (`error?: string`).
- **Signature** — `SignatureCanvas` (enabled by default; shows its own "draw your signature" error + haptic on an empty press).
- **Map pin** — `MapPickerInline` (enabled by default; self-shows "pick a location" + haptic on an empty press).
- The equipment-inspection chokepoint is [`InspectionShell`](../components/inspection-steps/InspectionShell.tsx): its Next/Finish button is always enabled; on a validated step (`blockNext` or last step) with `canGoNext === false` it fires the haptic and calls `onBlockedNext` so the screen flips its `attempted` flag.

**Keep `disabled` only for non-input reasons:** in-flight guards (`loading`/`saving`/`busy`/`completing`/`generating`/`sharing` — double-submit protection) and data-not-loaded guards (`!briefing || !project`, reorder `index === 0`, OTP-resend cooldown). Never re-add `disabled={!isValid}` for a missing-input gate.

Optional companion for long forms: [`hooks/useScrollToError.ts`](../hooks/useScrollToError.ts) — attach `scrollRef` to a `ScrollView`, `registerField('key')` on each field's wrapper, and pass `scrollToFirstError(keys)` as `guard`'s `onInvalid` to bring the first red field into view. Best-effort; short single-column forms don't need it.

## Geocoding (address ↔ map pin)

One file: [lib/geocode.ts](../lib/geocode.ts). Exports `forwardGeocode(query, signal?)` (address → coordinate), `reverseGeocode(lat, lng, signal?)` (coordinate → address string), and `coordsLabel(loc)` (the "lat, lng" fallback). Both geocoders go through the public **OpenStreetMap Nominatim** HTTP API (Georgia-biased, single result), accept an `AbortSignal`, and return `null` on miss/error — never throw, so geocoding is always best-effort.

Native geocoding via `expo-location` was deliberately dropped in 2026-06 (to remove the location-permission prompt). **Don't** re-add `expo-location` or call `fetch('https://nominatim…')` inline — use these helpers (the web dashboard's `AddressInput.tsx` is a parallel HTML/Leaflet implementation that predates this and stays separate). Nominatim is rate-limited; callers debounce + abort, and there's a production-scale caveat in [README.md](../README.md#known-issues).

Two consumers keep the address text and the map pin in sync:

| Use case | Owner |
|---|---|
| Address field that moves the pin as you type | [`components/inputs/GeocodingAddressInput.tsx`](../components/inputs/GeocodingAddressInput.tsx) — `FloatingLabelInput` + a **focused**, debounced `forwardGeocode`; calls `onPin(loc)` on a match, surfaces "searching/not found" via `helper`. The focus guard stops it fighting a pin the map just reverse-geocoded back into `value`. |
| Map overlay search + tap-to-fill-address | [`components/MapPicker.tsx`](../components/MapPicker.tsx) — search box forward-geocodes (drops the pin), tapping/dragging the pin reverse-geocodes into the address field. |

Used by all three project forms (`components/home/ProjectPickerSheet.tsx`, `app/(tabs)/projects.tsx`, `components/projects/EditProjectSheet.tsx`). **Don't** add a second debounced-geocode hook in a screen — render `GeocodingAddressInput` for the address field and let `MapPicker` own the in-map sync.

## Adding a new primitive

If you're about to add a util in `lib/` or a wrapper in `components/`:

1. Search this file and `lib/` for an existing canonical owner. If one exists and is wrong, **fix it** — don't add a sibling.
2. If you genuinely need a new primitive, give it a single canonical owner, name it by purpose (not implementation), and add a row here.
3. If the new primitive can be misused by reaching for the underlying API (RN, Expo, Supabase), add a rule to `scripts/check-primitives.mjs`.
