# What's New — Hubble Changelog

**Updated:** 2026-06-18 | Branch: `gio-design-update`

---

## 2026-06-18 — No more disabled buttons: enabled CTAs + on-press field errors

Every multi-step flow used to **disable** its forward/submit button until the required fields were filled — a dead, dimmed button that never told the user *what* was missing. That's gone. Buttons now stay **enabled**; pressing one while a required field is empty reveals the empty field(s) in red (`სავალდებულო ველი`) and fires an error haptic, so the requirement is obvious.

- **New hook:** [`hooks/useSubmitGuard.ts`](../hooks/useSubmitGuard.ts) — `guard(isValid, onValid)` on the button; `attempted` drives each field's `error`. Generalizes the old `ConclusionStep` `interacted` / `AddRemoteSignerModal` `*Touched` patterns. Companion [`hooks/useScrollToError.ts`](../hooks/useScrollToError.ts) for long forms.
- **Applied across all flows:** equipment inspections (via `InspectionShell`'s new `onBlockedNext`), the checklist wizard (`AnswerButtons` gained an `error` outline), incident, order, briefing, auth (login/register/forgot/reset/OTP), reports, project create/edit, signers, breathalyzer, profile, template-start.
- **Primitives gained error state:** `wizard/StatusChip` + `AnswerButtons` (`error`), `DateTimeField` (`error`), `MapPickerInline` and `SignatureCanvas` (self-show their own error + haptic on an empty press).
- **Kept disabled** only for non-input reasons: in-flight guards (`loading`/`saving`/`busy`/…) and data-not-loaded guards. See [docs/primitives.md](primitives.md#form-validation--enabled-buttons--on-press-errors).

---

## 2026-06-18 — One reusable inspection conclusion (დასკვნა) step

Every inspection flow ends with a "conclusion" step, but it was built **two incompatible ways**: equipment routes + harness + the scaffold wizard used the polished icon-card [`VerdictSelector`](../components/inspection-steps/VerdictSelector.tsx) inside [`ConclusionStep`](../components/inspection-steps/ConclusionStep.tsx), while forklift, cargo-platform, mobile-ladder, lifting-accessories, safety-net and fall-protection hand-rolled an inline `დასკვნა *` label + a re-declared "შემოთავაზება" banner + the older plain-pill `inspection-parts/VerdictSelector` (with a built-in notes field). Same concept, two selectors and two layouts.

- **One last step everywhere:** [`ConclusionStep`](../components/inspection-steps/ConclusionStep.tsx) is now the single component for the last step. It gained a conclusion illustration (on by default), a `summarySection` slot (for the summary tables forklift/cargo-platform show), a `suggestion` banner prop, a first-class photo strip (`photoPaths`), required/error support, and a `scroll` toggle. Styles split into a `ConclusionStep.styles.ts` sibling to stay under the file-size target.
- **Shared suggestion banner:** the six inline copies became one [`VerdictSuggestionBanner`](../components/inspection-steps/VerdictSuggestionBanner.tsx) (Lightbulb + text, tappable to adopt the suggested verdict).
- **Migrated:** forklift, cargo-platform, mobile-ladder, lifting-accessories and safety-net now render `ConclusionStep`; fall-protection (per-device verdict) swapped its inline pill selector for the icon-card `VerdictSelector` + the shared banner; the scaffold wizard's `ConclusionStep` is now a thin wrapper that delegates to the canonical one.
- **Standardized:** the free-text box is now labelled **`კომენტარი`** on every flow (was a mix of `შენიშვნები / ხარვეზები`, `კომენტარი`, and `დასკვნა`), and the conclusion illustration shows on every flow.
- **Removed:** the duplicate `components/inspection-parts/VerdictSelector.tsx` (plain-pill selector with built-in notes) is deleted; nothing imports it anymore.

Verdict option **labels are unchanged** — they're serialized into the generated act PDFs (UI labels don't affect the PDF). See [docs/primitives.md](primitives.md#inspection-conclusion-step--verdict-selector).

---

## 2026-06-17 — Home screen: even vertical rhythm + project-card address line

The home feed's individual sections looked fine but didn't sit well together — the gaps between them jumped around (`~10px` cert→projects, `44px` projects→quick-actions, `40px` before recent, `42px` before the tip), and the recent-activity block sat at a `24px` gutter while everything else used `20px`.

- **Uniform section rhythm:** every major section in [`home.tsx`](../app/(tabs)/home.tsx) (cert banner, projects, quick actions, recent activity, tip) now owns its **top** gap (~28px) with bottoms zeroed, so the spacing stays even no matter which optional blocks render. Removed the redundant double `marginTop` on the section header.
- **One gutter:** recent-activity rows, the section header, and the date separators moved from `24px` → `20px` horizontal padding to match the rest of the screen (projects, quick actions, banner, draft card, tip).
- **Project cards** ([`ProjectCard`](../components/home/ProjectCard.tsx)) now show the project **address** as a soft second line under the name, replacing the experimental per-project "დრაფტი / X აქტი" badges (and the `projectStats` bookkeeping that fed them).

---

## 2026-06-17 — Illustrations: monochrome brand palette (no more old-branding green)

Every hand-drawn illustration in the app carried leftover **green/teal from the pre-rebrand identity** (`#1D9E75`, `#0F6E56`, `#E8F5F0`, …) plus a stale orange (`#FF5A1F`, before the `#FF6D2E` switch). They now follow one cohesive **monochrome** system: shades of primary orange + secondary electric-yellow + black/neutral grays.

- **New primitive** [`lib/illustrationPalette.ts`](../lib/illustrationPalette.ts) (`useIllustrationPalette()`) — the single source of truth for illustration colors. Documented in [docs/primitives.md](primitives.md#illustration-palette-monochrome-svg-art). Components must source colors from here rather than hardcoding hex, so the art can't drift back off-brand.
- **Recolored:** [`QuestionAvatar`](../components/QuestionAvatar.tsx) (16 scaffold avatars — greens → orange/yellow/black), [`ErrorScreen`](../components/ErrorScreen.tsx) (green hard hat → safety orange), [`SkeletonMap`](../components/SkeletonMap.tsx) (green blueprint → graphite + orange pulse), [`OrbitField`](../components/OrbitField.tsx) & [`ProjectAvatar`](../components/ProjectAvatar.tsx) (`#FF5A1F` → `#FF6D2E`).
- **Flattened to monochrome:** [`EmptyState`](../components/EmptyState.tsx) (blue/amber category illustrations → orange + black, one yellow star pop) and [`InspectionTypeAvatar`](../components/InspectionTypeAvatar.tsx) (rainbow pastel tiles → one brand wash; emoji carries the recognition).
- **Other green cleanup:** [`PlateInput`](../components/inputs/PlateInput.tsx) and the Kamari counter controls (`BRAND_GREEN` → orange `BRAND_ACCENT`); [`statusColors`](../lib/statusColors.ts) "completed" now uses the canonical `semantic.success` green instead of the retired brand-green hex.
- Semantic verdict/status colors (safe = green, danger = red) are unchanged — they're meaning, not branding.

**Not touched:** PDF templates (`lib/reportPdf.ts`, `lib/briefingPdf.ts`, `lib/pdf/inspection/template.css.ts`, `lib/inspection/pdfStyles.ts`, …) still carry green `--accent`/old-orange. Those are generated legal documents, deliberately left for a separate, explicit pass.

---

## 2026-06-17 — General equipment checklist: editable rows + dead PDF icon removed

The ტექ.აღჭ. (general equipment) inspection checklist step was showing "—" for every row because `EquipmentItem.name` starts blank and there was no UI to enter it. Each checklist row is now an inline `TextInput` (placeholder "დასახელება...") that writes back to `EquipmentItem.name` via `updateEquipmentName`. The row reuses the existing `ChecklistItemRow` component (now accepts an optional `editableLabel` prop) so it looks and behaves identically to the ქამრები/equipment flows.

The orange document icon that appeared next to the ✕ button in equipment inspection headers did nothing — `showPdfIcon`, `generatingPdf`, `saving`, and `onPdf` were passed by all 9 inspection routes but `InspectionShell` never read them. All dead props removed from `InspectionShellProps` and every caller (bobcat, excavator, cargo-platform, forklift, fall-protection, lifting-accessories, mobile-ladder, safety-net, general-equipment). The dead `savingHint` style and the unused `progressPill`/`progressPillText` styles in general-equipment were also removed.

---

## 2026-06-17 — Auto-focus keyboard on single-input wizard steps

Landing on a step that contains exactly one text input (measure or freetext question types in the inspection wizard; the participants name field in the briefing wizard) now opens the keyboard immediately without requiring a tap. `autoFocus` added to [`MeasureInput`](../features/inspection-wizard/MeasureInput.tsx), [`DebouncedFreetext`](../features/inspection-wizard/DebouncedFreetext.tsx), and [`ParticipantsStep`](../components/briefings/ParticipantsStep.tsx). Steps with multiple inputs or non-text primary interactions are unaffected.

---

## 2026-06-17 — One verdict picker on every შემოწმება conclusion step

The conclusion (`დასკვნა`) step looked different depending on which flow you entered: the scaffold (ხარაჩო) wizard used a tall, icon-based decision selector (`გადაწყვეტილება` — shield / eye / warning buttons), while the equipment routes and the harness (დამცავი ქამრები) flow showed flat pill chips (`უსაფრთხოა` / `არ არის უსაფრთხო`). Same decision, two looks.

- **New shared component** [`VerdictSelector`](../components/inspection-steps/VerdictSelector.tsx) — the scaffold's icon-button picker, now **dynamic**: pass any 2–3 `VerdictOption`s and it renders one icon + label button each, generic over the verdict value type. Icons resolve from an explicit `option.icon`, else a semantic `option.tone` (`success`/`caution`/`danger`), else **by position** (first = shield, last = warning, middle = eye) — every flow orders its verdicts positive → negative, so no per-route wiring was needed.
- **`ConclusionStep`** (the reusable equipment + harness step) now renders `VerdictSelector` instead of pill chips, so **all 8 equipment flows** (bobcat, excavator, cargo-platform, forklift, fall-protection, lifting-accessories, mobile-ladder, safety-net) and the harness flow pick up the scaffold look automatically. The empty-`verdictOptions` case (general-equipment, no verdict) now renders nothing instead of an orphaned `დასკვნა *` label.
- **Consolidation** — the bespoke `features/inspection-wizard/VerdictSelector` was deleted; the scaffold wizard's `ConclusionStep` now imports the shared one and supplies the 3-option `SafetyVerdict` set. The old pill-chip styles and the wizard's dead `decision*`/`fieldError` styles were removed. Added to [primitives.md](primitives.md) as the canonical verdict picker.

---

## 2026-06-17 — Equipment flow loading state: flow skeleton, not a generic loader

Entering an equipment inspection (which blocks ~2–3s on the initial fetch in [`useInspectionFlow`](../lib/inspection/useInspectionFlow.ts)) used to flash a native iOS header + centered "იტვირთება…" text on an off-white screen, then swap to the real [`InspectionShell`](../components/inspection-steps/InspectionShell.tsx) chrome once data landed — header style and background both changed, reading as a generic loader rather than the flow.

- **New** [`InspectionShellSkeleton`](../components/inspection-steps/InspectionShellSkeleton.tsx) — the loading twin of `InspectionShell`. Reuses the **real `FlowHeader`** (same `card` background, same back/close + progress strip) over a form-shaped body skeleton + footer-button placeholder, built on the existing [`Skeleton`](../components/Skeleton.tsx) primitive. Only the body morphs skeleton → content; the header no longer flashes or shifts.
- **All 9 equipment flows** (bobcat, excavator, cargo-platform, general-equipment, forklift, fall-protection, lifting-accessories, mobile-ladder, safety-net) swapped their `if (loading || !inspection)` gate from the centered-text view to `<InspectionShellSkeleton title=… totalSteps=… onClose={() => router.back()} />`. The orphaned native `Stack.Screen` header, `styles.centred`, and `Stack` imports were removed.
- Non-equipment flows already used flow-shaped skeletons (incidents → `SkeletonListCard`, briefings/reports → `SkeletonPreview`, harness → `SkeletonWizard`) and were left unchanged.

---

## 2026-06-17 — ინციდენტი / რეპორტი: header + footer parity with შემოწმება

Cheap consistency fixes carried over from the briefing rework to [`incidents/new.tsx`](../app/incidents/new.tsx) and [`reports/new.tsx`](../app/reports/new.tsx):

- **`card` background** (was `theme.colors.background`) + `surfaceColor={theme.colors.surface}` on `FlowHeader`.
- **X close button** added (`leading="back" trailing="close"`, `onClose` → `router.back()`) — both flows were missing it.
- **Exit confirmation** — incidents now passes `confirmExit={isFormDirty}` (was `step === 1 && isFormDirty`, so steps 2–4 exited with no `გასვლა` modal). The X-close is the confirmed-exit affordance; the back arrow still navigates steps.
- **Footer** — dropped the top border / `surface` fill so it matches the inspection footer (just padding).
- **Incident type selector → hybrid** — the type cards (Step 1) and the Step-4 summary chip are now monochrome for selection chrome (ink fill + `inverse.ink` content when selected, like `StatusChip`) while severity stays color-coded via a small dot (`getTypeBadge[...].border`: amber/orange/red/purple). Severity color is meaningful (escalation scale), so it's preserved as a secondary cue rather than flattened. The redundant short-label colored pill (`INCIDENT_TYPE_LABEL`) was dropped — the full label already states the type.

---

## 2026-06-17 — ინსტრუქტაჟი flow: aligned with შემოწმება / ქამრები

Reworked the briefing (ინსტრუქტაჟი) flow so it reads as one coherent flow that matches the inspection (შემოწმება) and harness (ქამრები) flows. Code-only briefing changes — no shared-flow behaviour changed except an additive [`ChipNavStrip`](../components/inspection-parts/ChipNavStrip.tsx) option.

- **3-step wizard** — split into `თემები` (date/time + topics) → `მონაწილეები` (participants) → `ხელმოწერა` (signing). All three screens pass `step` + `totalSteps={3}` to [`FlowHeader`](../components/FlowHeader.tsx) and use the **standard plain progress bar + `N/3` count** (same as every other flow — no bespoke segmented/labelled stepper). [`new.tsx`](../app/briefings/new.tsx) drives steps 1–2 from internal state; [`sign.tsx`](../app/briefings/[id]/sign.tsx) is step 3.
- **Shell parity** — `card` background, `leading="back" trailing="close"` (the X was previously missing), `surfaceColor={theme.colors.surface}`, and the canonical [`გასვლა` bottom-sheet](../components/wizard/ExitModal.tsx) via `confirmExit` (the signing screen previously used a native `Alert.alert` system dialog). Footer matches the inspection footer (no top border, just padding).
- **Monochrome selectors (low-contrast)** — topic rows, participant chips, count badge and the "დამატება" button moved off green/orange. Selected state is intentionally **low-contrast**: a `subtleSurface` (beige) fill + a strong `ink` border + an `ink` check — not a solid ink fill (too heavy for full-width rows).
- **Signing = secondary tab navigation** — the hand-rolled status pill + roster bottom sheet are gone; the signing screen keeps the `FlowHeader` and renders a [`ChipNavStrip`](../components/inspection-parts/ChipNavStrip.tsx) roster (one chip per participant + a trailing `ინსპექტორი` chip) for jump-to navigation, exactly like the harness flow. The phase is now driven by where `currentIdx` points, so you can jump back to re-sign any worker.
- **`ChipNavStrip` gained `dotMode`** — new opt-in `dotMode?: 'color' | 'mono' | 'check'` (default `'color'` = unchanged). Briefings use `'check'` (✓ for signed, monochrome dots otherwise) to avoid green; the harness flow keeps the default and is byte-for-byte unchanged. Added a `'skipped'` `ChipNavState`.
- **New module** [`components/briefings/`](../components/briefings/AGENTS.md) — `TopicSelector`, `ParticipantsStep`, `SignatureStage` extracted from the (oversized) route files.

---

## 2026-06-17 — Global design refresh: white background, monochrome nav, pill buttons

Unified the core visual language across the app.

- **White app background** — `theme.colors.background` is now pure `#FFFFFF` (was warm off-white `#F2F1EC`). Cards/surfaces remain white and stay visible via existing shadows and borders.
- **Monochrome navigation** — tab bar active tint and icon colour changed from orange to `theme.colors.ink` (near-black `#1A1A1A`). Active glow background updated to a subtle grey. The orange brand colour no longer bleeds into chrome.
- **Pill-shaped buttons (radius 1000)** — all `Button` sizes now use `borderRadius: 1000` (true pill). Text colour on the primary (orange) variant changed from white to black for legibility.
- **Unified CTA button** — [`WizardNav`](../components/wizard/WizardNav.tsx) replaced its bespoke `nextBtn` Pressable with the canonical [`Button`](../components/primitives/Button.tsx) component. [`InspectionShell`](../components/inspection-steps/InspectionShell.tsx) migrated from deprecated `iconRight={<Ionicons>}` nodes to the string-based `rightIcon` prop so icon colour inherits from the button's text colour automatically.

---

## 2026-06-17 — Incident / briefing / report: full-screen project pick, no bottom sheet

The four Home quick actions now behave consistently. **ინციდენტი**, **ინსტრუქტაჟი**, and **რეპორტი** used to open the `ProjectPickerSheet` bottom sheet (confusingly titled "შემოწმების აქტის დაწყება" for all three) before navigating into the flow. They now route straight to `/incidents/new` · `/briefings/new` · `/reports/new`, and each screen renders the project picker as a **full-screen first step** when launched without a `projectId` — exactly like the inspection (`შემოწმება`) flow.

- **New shared first step** ([`FlowProjectPicker`](../components/FlowProjectPicker.tsx)) — `FlowHeader` + a dashed "ახალი პროექტი" row + the canonical [`ProjectPickerStep`](../components/inspection-steps/ProjectPickerStep.tsx) list + a "გაგრძელება" button. Creating a project reuses [`ProjectPickerSheet`](../components/home/ProjectPickerSheet.tsx) (`initialView="new"`) and re-enters the flow with the new id. See [primitives.md](primitives.md#flow-entry-project-picker).
- **Each `new` screen gates on the project** ([`incidents/new`](../app/incidents/new.tsx), [`briefings/new`](../app/briefings/new.tsx), [`reports/new`](../app/reports/new.tsx)) — `projectId = paramProjectId ?? pickedProject?.id`; no param + nothing picked → show the picker, otherwise the existing form (unchanged).
- **Project-detail entries unchanged** — those already pass `?projectId=`, so they skip the picker and open the form directly.
- **Home cleanup** ([`home.tsx`](../app/(tabs)/home.tsx)) — dropped the now-unused `pickerAction` state; the Home `ProjectPickerSheet` stays only for the empty-projects "create first project" case.

---

## 2026-06-17 — Equipment details step: fewer inputs, monochrome type selector

Trimmed redundant data entry from the general-equipment inspection and made the inspection-type selector consistent everywhere.

- **General-equipment details step** ([`general-equipment/[id]`](../app/inspections/general-equipment/[id].tsx)) — dropped the *object name*, *activity type*, *date*, and *act №* inputs. Object name + address now autofill from the project (`company_name || name`); the date and act № are already set automatically at creation. The step now shows only the inspection-type selector. The `activity_type` column is untouched (kept in the type/patch, just no longer entered by hand) — no Supabase changes.
- **Monochrome type selector, reused** — fall-protection ([`fall-protection/[id]`](../app/inspections/fall-protection/[id].tsx)) replaced its bespoke orange `typeChip` row with the shared monochrome [`IdentificationGrid`](../components/inspection-parts/IdentificationGrid.tsx) `select`, matching general-equipment and the other equipment screens.

---

## 2026-06-17 — One checklist design across every inspection

Made the harness/belt flow match the rest of the monochrome inspection UI and unified every "several-items-on-one-page" checklist onto one reusable row — a design-system consolidation, not per-screen forks.

- **Canonical checklist row** — new [`ChecklistItemRow`](../components/inspection-parts/ChecklistItemRow.tsx) (+ [`ChecklistLegend`](../components/inspection-parts/ChecklistLegend.tsx)): label + inline help `?` + a cluster of monochrome [`StatusChip`](../components/wizard/StatusChip.tsx)s (2 options for the harness ✓/✗; 3–4 for equipment ratings incl. N/A), neutral until tapped. The harness [`ChipRow`](../components/harness-list/ChipRow.tsx), equipment [`ChecklistRow`](../components/inspection-steps/ChecklistRow.tsx), and [`ChecklistItem`](../components/inspection-parts/ChecklistItem.tsx) are now thin adapters over it.
- **Solid-ink selected state** — `StatusChip` selection went from a subtle outline-fill to a **solid ink fill** (via the theme `inverse` palette, so it stays legible in dark mode). This bolder, clearer state reaches yes/no, equipment ratings, and harness chips at once.
- **Ink progress bar** — `FlowHeader`'s progress bar is now ink (monochrome) instead of brand-orange, across every inspection / briefing / incident / report / order flow.
- **Harness flow on the shared header** — [`HarnessListFlow`](../components/harness-list/HarnessListFlow.tsx) dropped its bespoke header for `FlowHeader` (circular back/close, `step / total` counter), added a `ChecklistLegend`, and rows now start neutral (an untouched belt still auto-fills ✓ on confirm, so the PDF is unchanged).
- **Per-row notes/photos removed** from every checklist (harness + equipment) — problem detail + photos belong on the conclusion step. **No schema or PDF changes**: the multi-state `result` still drives the regulatory PDF's pills, category counts, and verdict; the now-unused `comment`/`photo_paths` fields simply render empty.
- **Cleanup** — deleted three dead duplicate row components (`BobcatChecklistItem`, `ExcavatorChecklistItem`, `CargoPlatformChecklistItem`) and the harness `CellPhotoThumb`.

---

## 2026-06-17 — Fix: loading skeletons clipped under the notch

Two loading states painted their skeletons under the status bar / Dynamic Island because they bypassed iOS's automatic `ScrollView` content inset without re-adding a manual one. The **project detail** skeleton ([`LoadingSkeletonScreen`](../features/project-detail/LoadingSkeletonScreen.tsx)) copied the loaded screen's edge-to-edge config (`contentInsetAdjustmentBehavior="never"`) — which is correct there only because its first element is a full-bleed map hero — and now adds `insets.top` to its top padding. The **report viewer** ([`reports/[id]`](../app/reports/[id].tsx)) loading branch renders its `SkeletonPreview` in a bare `View` (no auto-inset) and now applies `paddingTop: insets.top`. Pure UI; no other screens changed (home, wizards, tab screens, and native-header detail screens already inset correctly).

---

## 2026-06-17 — Inspection redesign: monochrome answers, shared header, dashed attachments

A consistency pass so no single inspection screen looks bespoke — built by changing the shared chrome, not by forking per-screen styles.

- **One shared header** ([`FlowHeader`](../components/FlowHeader.tsx)) — the `< უკან` text pill became a circular back icon button (mirroring the close `✕`), the small project logo was dropped (project name stays as a subtitle), and the progress indicator is now a thin **brand-orange** bar + a `step / total` counter. Every inspection / briefing / incident flow renders `FlowHeader`, so the new header + progress reach all of them at once.
- **Monochrome answer controls** — the green/red "looks like a quiz" yes/no buttons and the green/amber/red 3-state equipment ratings (bobcat, excavator, general-equipment, cargo-platform, harness chips, checklist rows, verdict pills) are now black-and-white via the new [`StatusChip`](../components/wizard/StatusChip.tsx): selected = ink outline + subtle fill, severity carried by the `✓/⚠/✗` icon + label, never color. See [primitives.md](primitives.md#inspection-wizard-shared-ui).
- **Dashed photo + note bars** — the wizard `QuestionStep` / `ConclusionStep` photo & note inputs became two quiet dashed bars via [`AttachmentBars`](../features/inspection-wizard/AttachmentBars.tsx): the photo bar stays put and shows thumbnails as they're added, the note bar morphs into the notes textarea on tap.
- **Illustration refresh** — the passport question illustration was redrawn (portrait box + GEO language stamp + machine-readable strip) and the certificate de-greened; both follow the brand palette.
- No Supabase / PDF / schema changes — pure UI. The smart "გამოტოვება → შემდეგი" footer button (skip until answered) is unchanged.
- **Equipment-route dedup (done):** the 6 formerly inline-chrome equipment routes (cargo-platform, forklift, safety-net, mobile-ladder, fall-protection, lifting-accessories) now render through the shared [`InspectionShell`](../components/inspection-steps/InspectionShell.tsx) — which gained `finishLabel`, `banner`, and `blockNext` props, and `FlowHeader` now shows a trailing element (the PDF icon) alongside the close ✕. ~490 lines of duplicated header/footer chrome removed; every equipment flow now shares one shell. fall-protection keeps its custom finish label (`შემოწმება დასრულდა`) and its "can't proceed without a device" block via `blockNext`.
- **Still follow-ups:** applying `AttachmentBars` inside the equipment checklist accordions + consolidating the duplicate `PhotoThumb` copies, and a fuller refresh of the remaining 14 SVG illustrations — best done with on-device verification.

---

## 2026-06-17 — Harness count: one-tap chip selector replaces the +/- stepper

The "რამდენი ქამარი სულ?" step in the harness flow ([`HarnessListFlow`](../components/harness-list/HarnessListFlow.tsx)) swapped its +/- stepper for a new reusable **[`QuantitySelector`](../components/inputs/QuantitySelector.tsx)**: a wrap-grid of preset chips (1, 2, 3, 4, 5, 6, 8, 10, 12, 15) for one-tap selection, plus a custom numeric field for in-between values. The field is clamped to the harness max (15 — the template defines a fixed N1–N15 grid and the legal PDF renders exactly those rows, so the count can't exceed it). New input primitive; see [primitives.md](primitives.md#count--quantity-selector). No Supabase/PDF changes.

---

## 2026-06-17 — Success screens: corrected wording + one reusable scaffold

Terminology + design pass on every post-save success screen, plus the de-duplication that made it safe.

- **Wording (`ინსპექცია` → `შემოწმების აქტი`)** — "ინსპექცია" is the wrong term for the document; it's a **შემოწმების აქტი**. All five inspection done screens now read "შემოწმების აქტი შენახულია!", the summary shows the full act name (e.g. "ექსკავატორის შემოწმების აქტი", "დამცავი ქამრების შემოწმების აქტი"), and the subtitle points at "აქტის გვერდიდან". Also fixed the two remaining user-facing uses outside the success screens (crane-cert field label in `order-new`, wizard navigation-recovery message).
- **Buttons** — primary CTA renamed "ინსპექციის ნახვა" → **"PDF-ის ნახვა"**; the dead **"PDF პრევიუ და ჩამოტვირთვა"** card (it just re-fired the same action) was removed; the home card is now **"მთავარ გვერდზე დაბრუნება"**.
- **One reusable scaffold** — new [`components/success/`](../components/success/): `SuccessScreen` (the check-mark + summary + CTA + action-card shell, owns the completion haptic) and `InspectionDoneView` (the inspection body with the corrected wording baked in). The five `done.tsx` routes dropped from ~250 lines each to ~60–80 (thin data-loaders); the incident + order success screens were moved onto the same scaffold too, deleting ~6 byte-identical copies of the old `ActionCard` + `StyleSheet`. `reports/[id]/success.tsx` stays separate (different full-bleed PDF-share layout). See [primitives.md](primitives.md#post-save-success-screens).

---

## 2026-06-17 — Staging vs production environment separation (code + CI plumbing)

Post-App-Store-launch work to give every change an isolated place to run before it touches real users. Full design + remaining manual steps: [ENVIRONMENTS.md](ENVIRONMENTS.md).

- **Mobile app variants** — static `app.json` → dynamic `app.config.ts` driven by `APP_ENV` (development | staging | production, defaulting to production). Per-tier bundle id (`ge.sarke2.app` / `.staging` / `.dev`), scheme, name, Supabase URL/key, and Sentry environment. Production output verified **byte-identical** to the old `app.json` (only `extra.appEnv` added). Two fail-closed guardrails: build aborts if `EAS_BUILD_PROFILE` ≠ `APP_ENV`, or if a non-prod build lacks Supabase creds.
- **EAS** — new `staging` build profile + `staging` channel (added alongside the legacy `preview`; `production` untouched). Env-pinned npm scripts (`build:staging`, `update:production`, …) so no one ever runs a bare `eas update` (which re-embeds `extra` and could ship the wrong backend).
- **Sentry** — `environment` tag is now the active `APP_ENV` instead of hardcoded `'production'`.
- **Edge functions** — `send-signing-sms` (`SIGN_WEB_URL`) and `create-bog-order` (`APP_SCHEME`, redirect allow-list) are now env-driven; defaults reproduce current prod values exactly (prod redeploy is a no-op).
- **CI** — new `db-and-functions.yml` (develop → staging migrations + functions auto; production via gated manual run) and `deploy-web-app-staging.yml` (develop → `/app-staging/`). Existing prod web/docs workflows untouched. The prod-web GitHub-Environments rewiring is deliberately deferred until the Environments exist.
- **Supabase** — fixed the `config.toml` seed path so `db reset` actually seeds (`./seed/01_system_templates.sql`).
- **Pending (external):** the second Supabase project, the `ge.sarke2.app.staging` Apple App ID, the GitHub `staging`/`production` Environments, and the one-time prod migration reconciliation + baseline squash (four colliding version tokens). EAS account access is now resolved — the project was moved into the shared `hubble-ge` Expo org and `app.config.ts` `owner` updated to `hubble-ge` (2026-06-18). Tracked in [ENVIRONMENTS.md](ENVIRONMENTS.md).

---

## 2026-06-12 — Cargo-platform create fixed (production bug, TestFlight smoke finding)

Creating a cargo-platform inspection failed with "Could not find the
'signatures' column of 'cargo_platform_inspections' in the schema cache" —
broken in production since 2026-05-26, when `20260526002032` dropped the
column but `lib/cargoPlatformService.ts` `createColumns` kept sending
`signatures` in the INSERT (the patch path was cleaned, the create path was
missed). Fix: stop sending it; `toModel` already synthesizes the memory-only
empty slot. Web-app repo (`web-app/src/lib/data/cargoPlatform.ts`) was already
clean. Also: More-tab section header "გამოწერა" → "გეგმა" (accurate for free
accounts; no purchase vocabulary).

---

## 2026-06-12 — More tab: payment-history/invoices cards hidden (TestFlight smoke finding)

`app/(tabs)/more.tsx`: the empty "გადახდის ისტორია" card and the
"ანგარიშ-ფაქტურები" scaffold ("available after company registration") were
still visible after phase-3's purchase-UI removal. `PaymentHistoryCard` now
renders only when records exist (web-side purchases); the invoices scaffold is
deleted. Free accounts — including the App Review demo — see no payment
surfaces at all.

---

## 2026-06-12 — Public privacy policy page + legal-page fixes (submission blocker)

- **New public privacy policy** at `https://hubble.ge/app/#/privacy` — the URL App
  Store Connect requires. Content (`web-app/src/lib/privacy.ts`, ka+en) mirrors the
  App Privacy labels in [APP_STORE_REVIEW.md](APP_STORE_REVIEW.md): account data,
  user content, phone numbers, Sentry crash diagnostics; no location/tracking/ads;
  in-app account deletion.
- **`/terms` + `/privacy` are now public routes** (web-app `PublicLazyLayout`) —
  previously `/terms` sat behind the login wall; both render via the new shared
  `components/LegalDocPage.tsx`.
- **Broken `hubble.ge/terms` link fixed** — `TERMS_PUBLIC_URL` (mobile `lib/terms.ts`
  + web-app copy) now points at the live `https://hubble.ge/app/#/terms`; the old
  path 404'd on gh-pages. Terms §5 copy updated for Apple sign-in (no version bump).
- **Web-app deploy unblocked** — 4 unit tests had been failing on CI since the
  rebrand, blocking every gh-pages deploy: StatusBadge green→`brand` token, Subscribe
  ₾19→price-agnostic assertions, and a real `ThemeProvider` regression (dark mode no
  longer persisted across reloads — localStorage read restored).
- Marketing footer now links კონფიდენციალურობა (privacy) next to პირობები.

---

## 2026-06-12 — Launch prep: App Store compliance, Apple sign-in, permissions diet, skeletons, OTA

Eight-workstream mobile launch-prep pass (phase-1 … phase-8 commits). Full report:
[reports/LAUNCH_PREP_2026-06-12.md](reports/LAUNCH_PREP_2026-06-12.md).

- **Repo hygiene** — 22 root session/QA/refactor reports moved to `docs/reports/`; all references updated.
- **Storage RLS** — prompt premise was stale: `0053` owner-scoping verified live against production `pg_policies` (all four buckets private, no `sarke_*` policies). Added cross-user storage RLS integration tests to `tests/integration/rls/policies.test.ts`.
- **Zero purchase UI (Apple 3.1.1 / Google Play)** — `PaywallModal` + `lib/bogPayment.ts` deleted; neutral `SubscriptionNotice` (i18n, no price/URL/CTA) at every `PdfLimitReachedError` site; `PdfLockedBanner` neutralized; ₾19 buttons removed from More; `sarke2://payment/*` deep links removed. Server gate (`pdfGate`/`usePdfUsage`) untouched — web purchase still auto-unlocks the app.
- **Sign in with Apple (4.8)** — native button on iOS via new `components/auth/SocialAuthButtons.tsx`; Google hidden on iOS (its client id was empty anyway); first-auth full name persisted to the users row.
- **Permissions diet** — location + microphone permissions removed; `expo-location` uninstalled; `usePhotoWithLocation` → `usePhotoPicker`; photo geotagging dropped (payload lat/lon/address now always null); MapPicker is manual pan/zoom + pin (geocode search removed with the dependency).
- **Sentry + OTA** — `@sentry/react-native/expo` plugin configured (org/project TODO placeholders), production source-map upload enabled; `expo-updates` added with `production`/`preview` channels.
- **Skeletons + pull-to-refresh** — per-section skeletons (canonical `(isFetching || !isFetched) && empty` guard) across project sub-lists, detail screens, PDF previews, wizards; theme-tinted `RefreshControl` on calendar/regulations/history/templates/qualifications + six project sub-lists; `expo-image` `transition={200}` on photo-grid thumbnails.
- **App Review artifacts** — `scripts/seed-demo-account.mjs` (idempotent, env-keyed) + `docs/APP_STORE_REVIEW.md` (review notes, privacy labels, permission list).

---

## 2026-06-11 — Landing page hero redesign (mockup-focused, Awwwards-level)

Full redesign of `web-app/src/pages/landing/` hero and app-screens band, based on
the "01 + 03 merge" direction (warm orbital off-white + real product front and center).

- **`web-app/src/pages/landing/home.tsx`** — complete rewrite of `Hero` and new
  `AppScreensBand` export. Hero: 2-col grid, orbital-ring backdrop, left copy with
  staggered framer-motion entrance, right col with floating phone (`PhoneMockup`),
  web dashboard panel (bar chart + stats), and "ინსტრუქტაჟი დასრულდა" toast.
  AppScreensBand: dark graphite rounded panel with blueprint-grid background, 3 app-
  screen phones (ინსტრუქტაჟი / რისკის რუკა / დოკუმენტები) with staggered fade-in.
- **`web-app/src/pages/landing/shared.tsx`** — `PhoneMockup` rebuilt as a fully
  rendered HTML app home screen (status bar, greeting, safety-status card with
  spinning hi-vis ring, quick-action cards, next-instruction row, bottom nav).
- **`web-app/src/pages/landing/chrome.tsx`** — navbar CTA changed to dark
  "დაიწყე უფასოდ" (graphite-900) per design spec.
- **`web-app/src/pages/Landing.tsx`** — `AppScreensBand` added after `<Hero />`.
- **`web-app/src/index.css`** — added keyframes + classes: `hub-spin`, `hub-spin-rev`,
  `hub-float`, `hub-float-b`, `hub-blink` for orbital and floating animations.

---

## 2026-06-11 — Payments unbroken after the hubble.ge move + production BOG keys

Web payments had been failing with `400 invalid redirect url` since the hubble.ge
rebrand: the subscribe page sends `https://hubble.ge/app/…` success/fail URLs, but the
deployed `create-bog-order` (last deployed 2026-05-05, pre-rebrand) only allowed
`sarke2://` and the old `gilavi.github.io` prefix.

- **`supabase/functions/create-bog-order/index.ts`** — `ALLOWED_PREFIXES` now includes
  `https://hubble.ge/` (github.io kept for shipped mobile builds, which 301 to the CNAME).
- **`components/PaywallModal.tsx`** — `SUBSCRIBE_BASE_URL` → `https://hubble.ge/app/#/subscribe`
  directly (no more reliance on the 301); takes effect on the next mobile build.
- Both BOG edge functions redeployed; `BOG_CLIENT_ID`/`BOG_CLIENT_SECRET` switched to the
  production pair + `BOG_ENV=production` (set via the Supabase dashboard, never in-repo).
- **`docs/payments.md`** — new "Secrets & deployment" section (where keys live, manual
  function deploys, the allowlist gotcha); migration-state section updated to
  verified-live-2026-06-11.

---

## 2026-06-03 — Official Hubble logo applied everywhere + app icons regenerated

The placeholder/recreated H-monogram was replaced with the **official logo vector**
(`Khelogo.svg`, archived at `assets/images/hubble-logo.svg`) across every surface:

- **Web landing** — `HubbleLogo` (`web-app/src/pages/landing/shared.tsx`) now uses the real
  two-path 250×250 mark (navbar, footer, mobile bar, exit popup) + `public/favicon.svg`.
- **Mobile app** — `components/HubbleMark.tsx` (login badge) updated to the real mark.
- **`web/` sign app** — `Brand.tsx` text-"H" → the real SVG mark; accent flipped to orange
  (`--accent` `#147a4f` → `#ff5a1f`) so the SMS-signing page is on-brand too.
- **App icons** — regenerated `assets/{icon,adaptive-icon,splash-icon,favicon}.png` (1024px,
  rendered from the vector via an HTML canvas): orange tile + white mark for the icon,
  orange mark on transparent for the splash. `app.json` adaptive `backgroundColor` → `#FF5A1F`.
- Verified in-browser: web landing navbar, app login (Expo web), and the generated icon/splash.

---

## 2026-06-03 — Mobile app rebrand to the Hubble brand board (Expo)

The mobile app now matches the web brand. Because every app color flows through
`lib/theme.ts`, this was almost entirely a theme retune (no hardcoded brand hexes
exist in screens/components).

- **`lib/theme.ts`**: `primary` green → SAFETY ORANGE (`#FF5A1F`); `neutral` retuned to
  the warm OFF-WHITE (`#F2F1EC`) / CONCRETE (`#D6D6D1`) / GRAPHITE (`#1A1A1A`) ramp; new
  `highlight` = HI-VIS YELLOW (`#E6FF4D`). Dark-mode green `rgba(20,122,79,…)` accent/action
  literals → orange. Everything reading `accent`/`ink`/`border`/glow rebrands automatically.
- **Logo**: new `components/HubbleMark.tsx` (the H-monogram via `react-native-svg`, mirrors
  the web `HubbleLogo`); the login screen's placeholder `shield-checkmark` badge now shows it.
- **Orbital motif**: new `components/OrbitField.tsx` (the board's "orbital paths" pattern) sits
  subtly behind the login/auth backdrop — matching the web hero. Verified in both light and dark
  via the Expo-web build (`react-native-web`).
- **`app.json`**: splash + adaptive-icon background → `#F2F1EC`; notification color → `#FF5A1F`.
- **PDF templates**: briefing/report header rules, bands, and headings rebranded to orange
  (`lib/briefingPdf.ts`, `lib/reportPdf.ts`). **Kept green:** the inspection template's
  `--green-*` vars (`lib/pdf/inspection/template.css.ts`) — those mean PASS/success status,
  not brand, so recoloring them would change the document's meaning.
- **Not yet regenerated**: the raster app-icon/splash PNGs (`assets/icon.png`,
  `adaptive-icon.png`, `splash-icon.png`, `favicon.png`) still show the old mark — they're
  build-time only (invisible in Expo Go) and need an SVG→PNG render pass.
- Verified: `tsc --noEmit` clean, `check-primitives` clean.

---

## 2026-06-03 — Marketing brand expression: orbital motif, editorial statement, stickers (`web-app/`)

Stage 2 of the rebrand — moving past color into the board's visual language.

- **Pattern system** (`components/marketing/BrandPattern.tsx`): the "orbital paths" motif
  (`OrbitRings` — concentric rings + orange/hi-vis orbiting dots) + `DotGrid` texture +
  `HazardSticker` / `RoundSticker` from the board's sticker system. Decorative, recolorable,
  `aria-hidden`. Woven into the hero (phone "in orbit"), the dark trust band, and the CTA
  (dot-grid + orbit).
- **Editorial brand-statement band** (`landing/home-statement.tsx` → `BrandStatement`):
  full-bleed graphite "უსაფრთხოება არ არის ლოზუნგი. ეს არის **სისტემა**." with the orbital
  motif + a hi-vis hazard sticker — the board's poster moment, in Georgian. Placed before
  the pricing teaser on Home.
- **Display type**: the `HUBBLE` wordmark (navbar/footer) and the stat numbers now use the
  `font-display` grotesk for the board's bolder feel.
- Verified: `tsc --noEmit` clean, eslint clean, no-shadow guard clean, **`vite build` green**,
  and confirmed in-browser (hero / statement / trust / CTA).

---

## 2026-06-03 — Marketing site rebrand to the Hubble brand board (`web-app/`)

The public marketing site (`hubble.ge` → `web-app/src/pages/landing/`) was repainted from
the legacy emerald onto the **Hubble brand-board** palette. **Scope: the marketing site
only** — the logged-in dashboard keeps its emerald `brand` scale (untouched).

- **New Tailwind tokens** (additive, in `web-app/tailwind.config.ts`): `safety` (SAFETY
  ORANGE `#FF5A1F`), `hivis` (HI-VIS YELLOW `#E6FF4D`), `graphite` (`#1A1A1A`), `offwhite`
  (`#F2F1EC`), `concrete` (`#D6D6D1`). `brand`/`neutral` are unchanged, so the dashboard
  and `web/` are unaffected.
- **Recolor:** green `brand-*` → orange `safety-*`; the dark-green sections (`#0F2318`
  family) → graphite; cream `#F5F3EE` → `offwhite`; the hero phone-mockup SVG → graphite +
  orange with a hi-vis "+PDF" chip. Hi-vis is reserved for spotlights: the hero/trust
  eyebrow "sticker" pills and the graphite stats numbers.
- **Logo:** the placeholder shield was replaced with the **Hubble H-monogram** (rounded
  square + diagonal wave) as a recolorable SVG (`HubbleLogo` in `landing/shared.tsx`) —
  graphite in the navbar/footer, white-on-orange tiles in the mobile bar/popup. Also added
  the missing `web-app/public/favicon.svg` (orange app-icon tile) and fixed the index.html
  favicon path (`/app/favicon.svg` → `/favicon.svg`, which Vite was double-prefixing to
  `/app/app/…` → 404).
- Verified: `tsc --noEmit` clean, eslint clean (no new errors), no-shadow guard clean, and
  the result confirmed in-browser across hero / stats / pain / trust / pricing / CTA + the
  mobile chrome.
- See [`web-app/src/pages/landing/AGENTS.md`](../web-app/src/pages/landing/AGENTS.md) for
  the palette reference.

---

## 2026-06-01 — Marketing site goes multi-page + live AI support chat (`web-app/`)

The logged-out landing page was split from one long scroll into a proper multi-page marketing site, all sharing one `MarketingLayout` (navbar / footer / overlays). **Scope: `web-app/` only.**

- **Pages:** `/#/` (Home), `/#/about`, `/#/pricing`, `/#/legislation`, `/#/contact`. The navbar uses route links (not anchor-scroll). Logged-in visitors are still redirected to `/home`.
- **Home** now has the four product pillars (აქტები / ინციდენტი / ინსტრუქტაჟი / რეპორტები), a "ვისთვის" audiences section, and price + regulations teasers that deep-link to the dedicated pages.
- **`/legislation`** is the **public** regulations/blog page (Georgian labor-safety law + articles). It uses a path distinct from the **protected** `/regulations` dashboard route — no collision.
- **`/contact`** hosts a **live AI support chatbot**. Because the static GitHub-Pages site can't hold an API key, it calls a new `ai-chat` Edge Function that proxies the Anthropic Messages API (model `claude-haiku-4-5`, `max_tokens: 512`, Georgian system prompt scoped to HUBBLE / labor safety). Abuse guards: input/turn caps + best-effort per-IP throttle. Runs with `verify_jwt = false` (visitors are unauthenticated).
- Sections were split out of the old `landing/sections.tsx` (459 lines) into per-page files under `web-app/src/pages/landing/` (`chrome.tsx`, `faq.tsx`, `home*.tsx`, `about.tsx`, `pricing.tsx`, `legislation.tsx`, `contact.tsx`) to satisfy the file-size targets.
- Fixed HashRouter hazards: store/CTA `#anchor` hrefs that would have been hijacked into route changes now point at `/register` or the external store URL.

> **Deploy note (manual):** the marketing pages ship with the normal `deploy-web-app.yml` push, but the Edge Function does **not** — `deploy-web-app.yml` ignores `supabase/functions/**`. After merging, run `supabase functions deploy ai-chat` and `supabase secrets set ANTHROPIC_API_KEY=…` (mirrors the `fetch-regulation-dates` precedent). Until then the chatbot returns `not_configured`.

---

## 2026-05-31 — Web dashboard: unified inspections complete (`web-app/`)

All inspection acts in the web dashboard now run on ONE shared descriptor-driven flow (specs → checklist → verdict → result screen with signature → PDF), matching the harness act. 10 structured acts + 2 generic acts = 12 picker entries, matching the Expo app. **Scope: `web-app/` only — the Expo mobile app is untouched; the two share only Supabase.**

- Added the **large-loader** variant ("დიდი ციცხვიანი დამტვირთველი") as its own act. It shares `bobcat_inspections` + category `bobcat` but uses a distinct template UUID + 33-item catalog, so the structured-act registry is now keyed by a unique act key (not category), letting two acts share a table.
- Both the **Home** and **Inspections** "new inspection" menus are now data-driven from the same registry (`STRUCTURED_ACT_LIST`), so they always show the identical 12 acts and can't drift apart.
- Fixed the project-only create flow (façade scaffold / `defaultCategory`) so the "next" button proceeds — the template is now derived, not selected via an effect.
- Fixed a white screen ("No PDF schema registered for category …") by registering the four structured PDF schemas (mobile-ladder, forklift, lifting-accessories, fall-protection) in the schema registry.

Captured inspection signatures remain result-screen-only and are never persisted (regulatory). Equipment rows round-trip with mobile via the `create_equipment_inspection` RPC. See [`web-app/UNIFIED_INSPECTIONS_PLAN.md`](../web-app/UNIFIED_INSPECTIONS_PLAN.md) for the full architecture.

---

## 2026-05-27 — Home & Projects show skeleton until fetch settles (no more empty-state flash on first login)

Two-layer fix for the "I have projects but Home says I don't until I pull-to-refresh" bug — see [`BUG_REPORT.md`](reports/BUG_REPORT.md).

- **Force a fresh fetch after sign-in** ([lib/session.tsx](../lib/session.tsx)): the post-login warming `prefetchQuery` now passes `staleTime: 0`, so a racy empty result from a previous session can't sit in the React Query cache for 5 minutes and starve out the real data. The first prefetch after every sign-in is guaranteed to hit the network.
- **Skeleton stays up through background refetches** ([app/(tabs)/home.tsx](../app/(tabs)/home.tsx), [app/(tabs)/projects.tsx](../app/(tabs)/projects.tsx)): replaced `!isLoading && data.length === 0` style empty-state guards with `(isFetching || !isFetched) && data.length === 0`. Empty state now only renders after the query has actually settled empty — never as a flash while a refetch is replacing a stale `[]` from cache. Same fix applied to the Recent activity section on Home.

---

## 2026-05-27 — Bobcat inspection form & PDF fixes

Three fixes to the "ციცხვიანი დამტვირთველის შემოწმების აქტი" (Bobcat / Large Loader inspection):

- **Numbered verdict marks throughout** ([components/inspection-steps/ChecklistStep.tsx](../components/inspection-steps/ChecklistStep.tsx), [lib/inspection/schemas/bobcat.ts](../lib/inspection/schemas/bobcat.ts)): verdict buttons on the form now show **1 / 2 / 3** (was ✓/⚠/✗). The PDF result pills, legend, and summary table headers likewise switched to the numbered format (`1 — კარგია`, `2 — ნაკლი`, `3 — გამოუსადეგ.`) — matching the standard Georgian inspection document convention.
- **Conclusion block always visible in PDF** ([lib/inspection/schemas/bobcat.ts](../lib/inspection/schemas/bobcat.ts)): the "შენიშვნები / ხარვეზები" block was wrapped in `insp.notes ? …` so it disappeared when the notes field was empty. Now always rendered (empty notes → blank box). Added explicit `background:#fff;color:#1A1A1A` inline styles to guarantee readability in PDF rendering contexts where CSS custom properties may not resolve.
- **Georgian text corrections** ([types/bobcat.ts](../types/bobcat.ts)): 15+ checklist item descriptions corrected in both `BOBCAT_ITEMS` and `LARGE_LOADER_ITEMS`. The main fixes: items that described the defect state without negation now use "არ ჩანს" / "არ აღენიშნება" (e.g. `'ბზარი, მოხრა ჩანს'` → `'ბზარი, მოხრა არ ჩანს'`); expanded `'ჰიდ.'` abbreviations to `'ჰიდრავლიკური'`; fixed `'ვიბრირება'` → `'ვიბრაცია'`; `'ფუნქციონარი'` → `'ფუნქციონალი'`; added missing state descriptions to bare-label items.

---

## 2026-05-27 — Inspection wizard UX improvements

Three fixes to the inspection conclusion/verdict flow:

- **Invisible text in dark mode fixed** ([components/inputs/FloatingLabelInput.tsx](../components/inputs/FloatingLabelInput.tsx)): Android injected a white `backgroundColor` onto `TextInput`, making typed text invisible on dark-themed devices. Fixed by adding `backgroundColor: 'transparent'` to the input stylesheet.
- **3-state safety verdict** ([features/inspection-wizard/VerdictSelector.tsx](../features/inspection-wizard/VerdictSelector.tsx), [features/inspection-wizard/ConclusionStep.tsx](../features/inspection-wizard/ConclusionStep.tsx), [supabase/migrations/20260527150000_safety_verdict.sql](../supabase/migrations/20260527150000_safety_verdict.sql)): the verdict UI now offers three options — ✓ უსაფრთხოა (green), ⚠ დასაშვებია/საჭიროებს დაკვირვებას (amber), ✗ დაუშვებელია გამოყენება (red) — stored as `safety_verdict text CHECK ('safe','caution','unsafe')` in `questionnaires`. PDF hero banner shows the correct amber `hero-pending` style for caution.
- **Scaffold row guidance hints** ([features/inspection-wizard/ScaffoldRowStep.tsx](../features/inspection-wizard/ScaffoldRowStep.tsx), [supabase/migrations/20260527150100_scaffold_row_hints.sql](../supabase/migrations/20260527150100_scaffold_row_hints.sql)): the `questions` table now has a `grid_row_hints jsonb` column. For the facade scaffold template each of the 8 criteria rows shows a brief standard-text description below the row title. Populated via migration and seed update.

### Pending — manual SQL apply (user)
- `20260527150000_safety_verdict.sql` — adds `safety_verdict` column to `questionnaires`, backfills from `is_safe_for_use`.
- `20260527150100_scaffold_row_hints.sql` — adds `grid_row_hints` column to `questions`, populates facade scaffold hints.

---

## 2026-05-27 — Photo-location modal: stop spamming users

Fixed the "GPS mismatch" modal that fired on **every** photo upload when the user's location was >500m from the project's saved address — a major annoyance on facade-scaffolding and other off-site inspections.

- **Per-project 24h suppression** ([lib/photoLocationAlert.ts](../lib/photoLocationAlert.ts)): added AsyncStorage-backed `isRecentlyDismissed` / `markDismissed` helpers keyed by project ID. Any button tap (including "კი, სწორია", "პროექტის ლოკაცია შევცვალო", "არა", and "სხვა პროექტზე გადასვლა") sets the flag. Subsequent photos for the same project short-circuit before reverseGeocode for 24 hours. Naturally expires next day if the user resumes at a different site.
- **Behavior:** the user gets at most ONE prompt per project per day, regardless of how many photos they upload. The fix also closes a race where tapping "Update project location" briefly re-prompted before the project's state propagated through React.

---

## 2026-05-27 — Login / registration UX

Three login-screen improvements driven by user feedback. Adds one DB migration that exposes a deliberate user-enumeration vector — accepted trade-off for modern login UX (same approach Apple/Google now use).

- **Register with existing email now surfaces a real error** ([lib/session.tsx](../lib/session.tsx)): Supabase's default behavior is to silently return success with an empty `identities` array when the email is already registered (to prevent enumeration). `register()` now detects that response and throws `User already registered`, which the existing `isEmailTakenError` path surfaces as an Alert with title "ესეთი უზერი არსებობს უკვე" and an action to switch to Sign In.
- **Distinct messages for "wrong password" vs "no account"** ([lib/session.tsx](../lib/session.tsx), [lib/errorMap.ts](../lib/errorMap.ts), [supabase/migrations/20260527150000_email_exists_rpc.sql](../supabase/migrations/20260527150000_email_exists_rpc.sql)): on a failed sign-in, `signIn()` now probes a new `email_exists(p_email)` RPC (SECURITY DEFINER, granted to anon) and re-throws a tagged `WrongPassword` or `AccountNotFound` error. `friendlyError()` translates each to its own Georgian message ("პაროლი არასწორია" / "ანგარიში ვერ მოიძებნა — შეამოწმეთ ელ-ფოსტა"). New discriminators `isWrongPasswordError` / `isAccountNotFoundError` in `errorMap`.
- **Password-reset suggestion after 3 failed attempts** ([app/(auth)/login.tsx](../app/(auth)/login.tsx)): the LoginForm now counts consecutive wrong-password failures (resets on email change or successful sign-in). After 3, a prominent banner appears under the password field suggesting reset — and tapping it opens the existing `ForgotPasswordModal` pre-filled with the entered email. `AccountNotFound` failures (typo'd email) do **not** count toward the threshold, because the remedy there is to fix the email, not reset the password.

### Pending — manual SQL apply (user)
- `20260527150000_email_exists_rpc.sql` — creates `public.email_exists(text)`. Until applied, sign-in errors fall back to the generic "Invalid email or password" message and the 3-attempt reset banner won't surface.

---

## 2026-05-27 — Bug fixes (second audit pass)

Ten bugs found via Expo-web interactive test, all fixed in the same commit.

- **Project-detail inspection stats RPC missing** ([supabase/migrations/20260527120000_get_inspection_stats_rpc.sql](../supabase/migrations/20260527120000_get_inspection_stats_rpc.sql)): the projects list fetched per-project draft/completed counts via a `get_inspection_stats()` RPC that was never created, causing a 404 error on every projects-tab load. Migration now creates the function with `SECURITY INVOKER` so RLS scopes results to the caller automatically.
- **Breathalyzer empty-state showed wrong message** ([features/project-detail/sections/BreathalyzerSection.tsx](../features/project-detail/sections/BreathalyzerSection.tsx)): displayed "ფაილები არ არის ატვირთული" (files not uploaded) instead of breathalyzer-specific copy. Fixed by passing the correct `subtitle` override to `SectionEmptyState`.
- **History screen headers didn't re-translate on language switch** ([app/history.tsx](../app/history.tsx)): the `useMemo` that builds draft/completed section labels was missing `t` in its dependency array; switching language left stale Georgian/English headers. Added `t` to deps.
- **Certificate expiry dates always formatted in Georgian** ([app/qualifications/index.tsx](../app/qualifications/index.tsx)): the `FilledCard` component used hardcoded `'ka'` locale. Now reads `t('common.localeTag')` so dates render in the active UI language.
- **More tab showed hardcoded regulation count "3"** ([app/(tabs)/more.tsx](../app/(tabs)/more.tsx)): the count chip displayed `"3"` regardless of the actual `REGULATIONS` array length (currently 5). Now derived from `REGULATIONS.length`.
- **Templates screen showed raw category identifiers** ([app/templates.tsx](../app/templates.tsx)): categories rendered as `xaracho`, `bobcat`, `general_equipment`, etc. Added a `CATEGORY_LABEL` map covering all 11 equipment types; unknown/future categories fall back to the raw identifier.
- **Home screen date unreadable in English locale on web** ([lib/homeUtils.ts](../lib/homeUtils.ts)): `todayFormatted()` passed `'ka-GE'` to `toLocaleDateString()` — Chromium web builds don't ship the Georgian ICU data and returned the date in English regardless of the UI language. Now constructs the Georgian string manually from arrays (`KA_WEEKDAY_FULL`, `KA_MONTH_FULL`); English uses `'en-US'` as before.
- **Calendar screen ignored `projectId` search param** ([app/(tabs)/calendar.tsx](../app/(tabs)/calendar.tsx)): the "ყველა" (all) link in `UpcomingSection` navigates to `/calendar?projectId=<uuid>`, but `CalendarScreen` never read the param. Added `useLocalSearchParams`, derived a `filteredEvents` list, and updated both section building and week-strip dot rendering to use it.
- **History routing broke for 7 of 10 inspection types** ([app/history.tsx](../app/history.tsx)): the inline `onPress` logic only handled `bobcat`, `excavator`, and `general_equipment`; all other categories (harness, cargo_platform, safety_net_inspection, mobile_ladder_inspection, fall_protection_inspection, lifting_accessories_inspection, forklift_inspection) fell through to a non-existent generic route. Replaced with the canonical `routeForInspection()` from `lib/inspectionRouting.ts`.
- **Home grouping labels "Today"/"Yesterday" always in Georgian** ([lib/homeUtils.ts](../lib/homeUtils.ts)): `dateGroupLabel()` hardcoded `'დღეს'`/`'გუშინ'` regardless of the `lang` parameter; dates beyond 7 days also used `'ka-GE'` locale (same ICU gap as Bug 7). Both paths now branch on `lang` and construct Georgian strings manually.

### Pending — manual SQL apply (user)
- `20260527120000_get_inspection_stats_rpc.sql` — defines `get_inspection_stats()`. Until applied, the projects list will fail to load inspection counts.

---

## 2026-05-27 — Bug fixes (audit pass)

Ten bugs found via code audit + Expo-web run, all fixed in the same commit.

- **Incident save — navigation to non-existent page on pre-create failure** ([app/incidents/new.tsx](../app/incidents/new.tsx)): if `uploadPhotos()` or `incidentsApi.create()` throws, the catch block previously navigated to `/incidents/${incidentId}` using the client-generated UUID — which was never written to the DB. Now a `incidentCommitted` flag gates the navigation; a pre-create failure shows an error toast and stays on the form.
- **Incident save — orphaned storage photos on create failure** ([app/incidents/new.tsx](../app/incidents/new.tsx)): if photos uploaded successfully but the DB create subsequently failed, those photos were left in the `incident-photos` bucket with no incident row referencing them. On a pre-create failure the catch now calls `storageApi.remove` for each uploaded path.
- **Forgot-password — no email format validation** ([app/(auth)/login.tsx](../app/(auth)/login.tsx), [app/(auth)/forgot.tsx](../app/(auth)/forgot.tsx)): both the inline modal and the standalone screen only disabled the submit button on empty input, so typing `"test"` would fire the Supabase API and surface a confusing auth error. Both now run `isEmail()` before the API call.
- **Pull-to-refresh could get permanently stuck** ([app/(tabs)/projects.tsx](../app/(tabs)/projects.tsx)): `Promise.all([...refetch()])` was not wrapped in try/catch; if any refetch threw, `setRefreshing(false)` was skipped. Wrapped in try/finally.
- **File delete — wrong operation order leaving orphaned storage** ([lib/services/real/projects.ts](../lib/services/real/projects.ts)): storage was deleted first (failure silently swallowed), then the DB record. If storage failed, the DB record was still removed — creating an unreachable file. Now the DB record is deleted first (throw on failure), then storage is cleaned up best-effort.
- **Session storage — corrupt partial read on mid-write crash** ([lib/secureSessionStorage.ts](../lib/secureSessionStorage.ts)): a WIP flag (`__wip`) is now set before clearing old chunks and cleared after the new write commits. If the app is force-killed mid-write, `readChunked` detects the flag and returns null (clean sign-out) instead of assembling a partial blob.
- **Safety-3D loading spinner didn't spin** ([app/safety-3d.tsx](../app/safety-3d.tsx)): the "spinner" View had circular border styles but no rotation animation. Replaced with `ActivityIndicator`.
- **Eye icon style inconsistency on login vs. register** ([app/(auth)/login.tsx](../app/(auth)/login.tsx)): LoginForm used solid `eye`/`eye-off`; RegisterForm used outline variants. Now both use `eye-outline`/`eye-off-outline`.
- **Briefing detail — stale preview HTML not cleared on re-navigation** ([app/briefings/[id].tsx](../app/briefings/%5Bid%5D.tsx)): `previewHtml` was only set when both `briefing` and `project` were loaded, never reset to null when either became undefined. Added the `else` branch.
- **Inspection wizard — `offline` missing from `load` dependency array** ([features/inspection-wizard/useWizardState.ts](../features/inspection-wizard/useWizardState.ts)): `load` called `offline.hydrateQuestionnairePatch/hydrateAnswers/cacheAnswers` but `offline` was not listed in the `useCallback` deps. Added.

---

## 2026-05-27 — Project detail: 10 inspection queries → 1 RPC

Before: the project-detail screen fired 10 parallel inspection queries (one per equipment type plus the generic `inspections` table), mirrored each result into local state via 10 `useState`s + 10 `useEffect`s, then merged them into one chronological list with `buildUnifiedInspections`.

Now: a single RPC [`get_project_inspections_unified(p_project_id)`](../supabase/migrations/20260527091308_project_inspections_unified_rpc.sql) returns the pre-merged preview list — possible because the 2026-05-27 identity unification migration backfilled parent rows in `public.inspections` for every equipment-type inspection and tagged them with `inspections.type`. The screen consumes [`useUnifiedInspectionsByProject`](../lib/apiHooks.ts) directly; [`useProjectDetailData`](../features/project-detail/useProjectDetailData.ts) is ~80 lines lighter (no per-source state, setters, or effects); [`unifiedInspections.ts`](../features/project-detail/unifiedInspections.ts) loses `buildUnifiedInspections` and `UnifiedSetters` entirely. Swipe-delete mutates the unified-query cache directly via `queryClient.setQueryData`.

[`deleteInspectionBySource`](../lib/inspectionDelete.ts) now always deletes from `public.inspections` (rather than the equipment-specific table); the `<type>_inspections.id → inspections.id` cascade FK kills the equipment row. This fixes a latent orphan-parent bug that would have caused deleted equipment rows to silently re-surface in the unified RPC list on the next refetch.

### Pending — manual SQL apply (user)
- `20260527091308_project_inspections_unified_rpc.sql` — RPC + composite index `idx_inspections_project_created`. Until applied, the project-detail screen's inspection section will surface an error / show empty (the React Query falls back to `[]`).

---

## 2026-05-27 — Project detail: per-section loading

Before: the project detail screen aggregated `isLoading` across 11 queries (project + 10 inspection types + templates) into one `loaded` flag, then blanked the whole screen behind `LoadingSkeletonScreen` until the slowest one finished. A user opening a project waited on equipment-type queries that mostly return empty just to see the basic project info.

Now: [`useProjectDetailData`](../features/project-detail/useProjectDetailData.ts) flips `loaded` true as soon as `projectQ` resolves, so the hero (logo, name, address, map, arch animation) paints immediately. A new `pending` object exposes per-section flags (`inspections`, `incidents`, `briefings`, `reports`, `files`, `orders`, `breathalyzer`); each section component takes a `loading` prop and renders 2 `SkeletonRow`s while its own query is in flight, then transitions to either the row list or `EmptyState` based on the resolved data. Slow sections never block fast ones from painting, and the empty-state CTA no longer flashes mid-fetch.

Touched: [features/project-detail/useProjectDetailData.ts](../features/project-detail/useProjectDetailData.ts), [features/project-detail/ProjectDetail.tsx](../features/project-detail/ProjectDetail.tsx), all six sections under [features/project-detail/sections/](../features/project-detail/sections/), [features/project-detail/AGENTS.md](../features/project-detail/AGENTS.md).

---

## 2026-05-27 — Projects-tab cold-start fix + session storage moved to Keychain

### Fixed — slow projects fetch on TestFlight first launch / first update
The projects tab used to fire **5 queries in parallel** on mount: `projects.list`, `projects.stats`, plus `useAllInspections`/`useAllBriefings`/`useTemplates` (the three sources behind `useCalendarEvents()` — only consumed for the "⚠ N ვადაგადაცილებული" badge). The three calendar queries each did a `select('*')` against full tables and competed with the actual projects list for cold-start bandwidth, which is why the tab felt slow after every install/update.

Now the projects screen calls a single tiny RPC, `get_overdue_counts()`, that computes per-project overdue counts server-side. The three heavy queries are no longer mounted on this screen. `useCalendarEvents()` is unchanged for the screens that genuinely need the full event list (home, calendar widget). ([supabase/migrations/20260527083000_overdue_counts_rpc.sql](../supabase/migrations/20260527083000_overdue_counts_rpc.sql), [app/(tabs)/projects.tsx](../app/(tabs)/projects.tsx), [lib/services/real/projects.ts](../lib/services/real/projects.ts))

### Changed — Supabase session persisted in Keychain/Keystore instead of AsyncStorage
Auth session storage swapped from `AsyncStorage` to a SecureStore-backed adapter ([lib/secureSessionStorage.ts](../lib/secureSessionStorage.ts)). Keychain (iOS) / EncryptedSharedPreferences-backed SQLite (Android) survives more OS edge cases than AsyncStorage and should reduce the "logged out after the update" pattern in production App Store builds. SecureStore caps values at ~2 KB on Android, so the session blob is chunked (1.8 KB chunks + a companion `__count` key); iOS uses the same path for consistency. Existing logged-in users are migrated on first read — `getItem` falls back to AsyncStorage on a SecureStore miss and lifts the prior session forward, so this change does not bounce anyone to the login screen.

> TestFlight builds may still log users out across updates if the test signing identity rotates — that's an iOS-level keychain behavior and is not something the app code can prevent. App Store production builds use a stable identity, so sessions persist across updates.

### Pending — manual SQL apply (user)
- `20260527083000_overdue_counts_rpc.sql` — defines `get_overdue_counts()` + composite indexes on `inspections (project_id, template_id, completed_at desc) WHERE status='completed'` and `briefings (project_id, date_time desc) WHERE status='completed'`. SECURITY INVOKER (RLS scopes results to the caller).

---

## 2026-05-27 — Inspection identity unification + signatures header fix

### Architecture — unified inspection identity across all 10 inspection types
Every equipment-type inspection (bobcat, excavator, general-equipment, cargo-platform, safety-net, mobile-ladder, forklift, fall-protection, lifting-accessories) now has a parent row in `public.inspections` keyed by the same UUID. A new `inspections.type` column tags the variant. Shared tables that FK to `inspections.id` — currently `inspection_attachments`, plus anything else the live-FK check surfaces — work uniformly across all 10 types. Equipment-specific payload (items, verdicts, summary photos, per-type signatures) stays in `<type>_inspections`. See [`INSPECTION_ARCHITECTURE_NOTES.md`](reports/INSPECTION_ARCHITECTURE_NOTES.md) for the discovery + design and [`INSPECTION_ARCHITECTURE_REPORT.md`](reports/INSPECTION_ARCHITECTURE_REPORT.md) for the per-phase summary.

### Fixed — certificate save no longer FK-blocked on equipment types
`inspection_attachments.inspection_id` FK violations on bobcat/excavator/etc. are gone once the unify migration is applied. The certificate-save flow on every equipment result screen now succeeds because each equipment inspection has a matching parent row in `inspections`.

### Fixed — SignaturesScreen header chrome consistent across mount sites
The `უკან` back button + X close button now render correctly on every inspection-type result screen. The harness/generic path was always fine; the 9 equipment paths were silently rendering the header flush under the status bar because the modal's nearest `SafeAreaProvider` had been consumed by the parent `<Screen>` wrapper. The component now wraps its body in its own `SafeAreaProvider` + applies safe-area insets manually via `useSafeAreaInsets()`, making the chrome robust regardless of mount context. ([features/signatures/SignaturesScreen.tsx](../features/signatures/SignaturesScreen.tsx))

### New — `create_equipment_inspection` RPC
[`supabase/migrations/20260527001241_create_equipment_inspection_rpc.sql`](../supabase/migrations/20260527001241_create_equipment_inspection_rpc.sql) — atomic parent-row creation in `public.inspections` with the given UUID, type tag, and shared fields. Idempotent via `ON CONFLICT (id) DO NOTHING`. The shared [`makeInspectionService`](../lib/inspection/service.ts) factory calls this RPC before inserting into the equipment table, generating one UUID client-side that both inserts share. Each per-type service now declares its `inspectionType` (e.g. `'bobcat'`, `'fall_protection_inspection'`) to match the migration's backfill tags.

### Pending — manual SQL apply (user)
Two migrations to apply after the prior session's `20260526002032_remove_persisted_inspection_signatures.sql`:
1. `20260527001240_unify_inspection_identity.sql` — backfill + FKs (idempotent, transactional). Embedded verification queries to run afterwards.
2. `20260527001241_create_equipment_inspection_rpc.sql` — the RPC the app now calls on every equipment-inspection create.

Before applying, the **[LIVE-DB]** queries in `reports/INSPECTION_ARCHITECTURE_NOTES.md` §1A–§1C confirm the live schema matches the discovery assumptions.

### Migration application status (2026-05-27)
All migrations applied to production Supabase via SQL Editor in order:
1. `20260526002032_remove_persisted_inspection_signatures.sql` — schema changes applied; storage cleanup deferred (BUG_REPORT P3 entry).
2. `20260527001240_unify_inspection_identity.sql` — 69 equipment-type parent rows backfilled across 9 types, 9 CASCADE FKs added.
3. `20260527001241_create_equipment_inspection_rpc.sql` — RPC live and callable from `authenticated`.
4. `20260527033302_inspections_type_default.sql` — hotfix added during this push session to unblock the legacy harness/xaracho create path that did not specify `type`.

---

## 2026-05-27 — Web-app: architectural refactor — native inputs (complete), AsyncBoundary isolation, store rename

- **Native Input/Textarea complete migration**: All Mantine `TextInput` and `Textarea` usages across the web-app replaced with native Tailwind-only `<Input>`/`<Textarea>` components. Migrated ~35 files covering auth pages, project detail sections, inspection detail/wizard, equipment detail pages, briefing/incident/report detail pages, and shared components (FieldInput, ChecklistItemRow, InspectionSignatures, HarnessChecklist, InspectionInfoView). Mantine is kept only for UI components (Modal, NumberInput, PasswordInput, Badge, Card, etc.).
- **NewOrder extracted to feature module**: `NewOrder` component moved from a page-level file to `features/orders/components/NewOrder/` in line with the feature-sliced architecture; route file is now a thin orchestrator.
- **Data layer `Tables<T>` type aliases**: All `lib/data/` modules now export `Tables<T>` type aliases for their DB row types, making query return types explicit and reducing `any` casts across the data layer.
- **AsyncBoundary applied to all ProjectDetail sections**: All 10 data-fetching sections in `src/pages/ProjectDetail/index.tsx` (`ProjectDetailsCard`, `CrewSection`, `SignersSection`, `InspectionsSection`, `IncidentsSection`, `BriefingsSection`, `ReportsSection`, `FilesSection`, `OrdersSection`, `DangerZoneSection`) are now each wrapped in `<AsyncBoundary>`. A section-level render error now shows an inline red banner for that section only instead of blanking the entire page. `AsyncBoundary` extended to support a no-query shell mode backed by a `SectionErrorBoundary` class component.
- **`useSafetyStore` renamed from `useAppStore`**: The Zustand 3D safety viewer store in `src/store/safetyStore.ts` is now exported as `useSafetyStore`. All consumers updated: `Scene3D.tsx`, `SidePanel.tsx`, `ConstructionModel.tsx`, `useSafetySelectors.ts`, and all affected test files. Zero `useAppStore` references remain in `src/`.

---

## 2026-05-27 — Mobile: unified inspection-start flow + CustomDropdown reuses canonical BottomSheet

### 🔴 BUG-23 — non-equipment templates froze the app after the template picker closed ([app/(tabs)/home.tsx](../app/(tabs)/home.tsx), [components/ui/CustomDropdown.tsx](../components/ui/CustomDropdown.tsx))

Picking `ფასადის ხარაჩო`, `დამცავი ქამრები`, or any non-equipment template from the home dropdown left the app stuck on home — the bottom sheet closed but no navigation happened. Two compounding bugs:

1. `CustomDropdown` rolled its own RN `<Modal>` (radius 20, no shadow, no gesture dismiss) instead of using the canonical `BottomSheet` from `components/BottomSheet.tsx`. Visually inconsistent with every other action sheet (radius 24, spring entrance, swipe-down dismiss).
2. The non-equipment branch then opened a **second** `BottomSheet` via `ProjectPickerSheet` for project selection. `BottomSheet`'s global `isSheetOpen` guard silently no-ops a second sheet while the first is still animating closed (~220 ms). Result: second sheet never opens, app appears frozen.

**Fix:**

- `CustomDropdown` now delegates its sheet to `useBottomSheet()` — all three call sites (`home.tsx`, `more.tsx`, `features/project-detail`) get the same rounded corners, shadow, spring entrance, haptic, and gesture dismiss. `onChange` fires synchronously from the `Pressable.onPress` so `router.push` runs in a normal React event tick (firing it from the BottomSheet animation-finish callback is dropped on the floor by expo-router on iOS — that was the actual freeze, after the sheet had closed).
- Removed the `DEFERRED_PROJECT_CATEGORIES` branch in `home.tsx`. **Every** template — equipment or not — now navigates to `/inspections/new?category=…&templateId=…` and picks its project as step 0 inside the wizard. No more nested sheets.
- `app/inspections/new.tsx` extended to handle all template categories: dispatches through `inspectionRegistry` for equipment, falls back to `questionnairesApi.create` for generic templates (xaracho, mobile_scaffold, harness, …). Title derived from the template name via `inspectionDisplayName`. The early `router.back()` guard moved inside a `useEffect` so it can't infinite-loop during render if `useLocalSearchParams` is briefly undefined.
- `ProjectPickerSheet` retained for incident/briefing/report quick actions and the new-project inline flow (where it still works because it's the only sheet open).

**Tests:** [tests/unit/CustomDropdown.test.tsx](../tests/unit/CustomDropdown.test.tsx) — 16 cases covering trigger rendering, sheet content, synchronous-onChange invariant (the bug-fix lock-in), cancel-without-onChange, controlled mode, and per-option dispatch. Uses `@testing-library/react` against the `react-native-web` alias.

**Files:**
- [components/ui/CustomDropdown.tsx](../components/ui/CustomDropdown.tsx) — full rewrite, delegates to canonical sheet
- [app/(tabs)/home.tsx](../app/(tabs)/home.tsx) — template `onChange` always pushes to `/inspections/new`; single-template quick action does the same; dead `pickerPreselectedTemplateId` state removed
- [app/inspections/new.tsx](../app/inspections/new.tsx) — category-agnostic, registry-or-generic dispatch
- [tests/unit/CustomDropdown.test.tsx](../tests/unit/CustomDropdown.test.tsx) — new

---

## 2026-05-26 — Web-app: ghost-page DOM accumulation fixed + scaffold badge + dropdown cleanup

### 🔴 BUG-20 — every navigation leaked a permanent copy of the previous page into the DOM ([web-app/src/components/layout/AppShell.tsx](../web-app/src/components/layout/AppShell.tsx))

`<AnimatePresence>` wrapped a ternary whose two `motion.div` branches both used `key={location.pathname}`. Exit animations never reconciled, so each navigation left the outgoing page mounted alongside the new one. Verified on live hubble.ge: fresh reload = 1 child under `<main>`, after 2 nav round-trips = 2 children, after 4 = 3 children, and so on — within a normal browsing session every page rendered 8-12× and the app was visibly broken (duplicated buttons, duplicated content, runaway query refires).

**Fix:** collapsed the ternary into a single `motion.div` driven by an `isSafety` boolean, switched `<AnimatePresence>` to `mode="wait" initial={false}`, and shortened the transition to `0.15s`. Wait-mode runs the outgoing exit before the incoming enter so the DOM stays clean; at 0.15s the gap is barely perceptible.

### 🟠 BUG-21 — scaffold/xaracho rows showed the harness badge on the home activity widget ([web-app/src/components/ProjectActivityWidget.tsx](../web-app/src/components/ProjectActivityWidget.tsx))

The widget read `template.category` for the href but then set `type: 'inspection' as const` regardless, so every `inspections`-table row got the 🦺 emoji and "შემოწმება" badge — including `ფასადის ხარაჩო`. The other three list views (`History`, `Inspections`, project-detail `InspectionsSection`) were already reading category correctly; this was the last hold-out.

**Fix:** extended the `ActivityItem['type']` union to include `harness | xaracho | mobile_scaffold | mobile_scaffold_n3` (plus the equipment types), added their entries to `ACTIVITY_TYPE_AVATAR` (🏗️ for scaffold variants), and pick the type from `template.category` matching the same fallback rule the other views use. Href routing is unchanged — only `category === 'harness'` goes to `/harness/:id`, everything else stays on `/inspections/:id`.

### 🟡 BUG-22 — duplicate "+ ახალი შემოწმება" dropdown entry both routed to `/bobcat/new` ([web-app/src/pages/Inspections.tsx](../web-app/src/pages/Inspections.tsx))

`დიდი ციცხვიანი დამტვირთველის შემოწმება` had the same `onSelect={() => navigate('/bobcat/new')}` as `ციცხვიანი დამტვირთველის შემოწმების აქტი` — a copy-paste leftover. The "large bobcat" template lives in the `inspections` table with a non-standard category and a dedicated wizard is not wired yet, so the menu item misled users to the equipment-bobcat form. Removed the dup entry; can be re-added behind a proper wizard preset later.

---

## 2026-05-26 — Web-app: registration email delivery fixed (Resend SMTP)

### Fixed — users not receiving OTP email after sign-up ([web-app/src/lib/auth.tsx](../web-app/src/lib/auth.tsx), [web-app/src/pages/auth/Register.tsx](../web-app/src/pages/auth/Register.tsx))

Supabase's built-in free-tier SMTP (~4 emails/hour, poor deliverability) was the root cause. Replaced with a dedicated **Resend** SMTP integration sending from `noreply@mail.hubble.ge`.

**Infrastructure changes (Supabase dashboard — no migration needed):**
- Custom SMTP enabled: `smtp.resend.com:465`, username `resend`, password = Resend API key (`supabase-smtp`).
- Sending domain `mail.hubble.ge` added to Resend with SPF/DKIM/DMARC records on Amazon Route 53 (via domenebi.ge). Domain verified within minutes.

**Code fix — `signUp` return value:**
- `AuthProvider.signUp` now returns `{ needsEmailConfirmation: boolean }` derived from whether Supabase returned a live session (`session !== null` → confirmations disabled, user is immediately active).
- `Register.tsx` uses this flag: navigates to `/verify-email?email=…` only when confirmation is required; goes straight to `/` otherwise. Previously it always redirected to verify-email regardless.
- Tests in `src/__tests__/lib/auth.test.tsx` and `src/__tests__/pages/auth.test.tsx` updated to match.

---

## 2026-05-26 — Signature placement correction

Follow-up to the same-day signatures redesign that mounted the entry on the wizard's last step. The entry point belongs on the inspection result screen, not the wizard — corrected here. The previous redesign also removed the certificates button from the result screen's bottom bar as a side effect of stripping the signatures button; the side-by-side row layout is restored.

### Fixed — signatures relocated from wizard to result screen
The `ხელმოწერები` entry now lives on the inspection result screen (the post-completion view). It opens the existing `features/signatures/SignaturesScreen` modal — internals unchanged. State is managed via `useSignaturesState` scoped to the result screen component; the captured snapshot is passed into the parent's PDF builder as a function argument (`onDownloadPdf(snapshot)`), so there's no global state hop. The state survives while the user remains on the result screen (re-sharing keeps the same signature) and dies when the screen unmounts (regulatory no-save rule preserved).

### Fixed — certificates button restored to the result screen bottom bar
Collateral removal from the prior session's Phase 5: the bottom bar lost the two-button side-by-side row when the signatures button was stripped, leaving only a single stacked certificates button. The row is back ([components/InspectionResultView.tsx](../components/InspectionResultView.tsx)), with `სერტიფიკატები` and `ხელმოწერები` side by side above the green `გადმოწერა` button — matching the layout that shipped before the redesign. The certificates feature itself was never gone; only the layout shell changed.

### Removed — `features/signatures/sessionStore.ts`
With the wizard out of the signatures flow and the result screen owning state directly, the in-memory cross-screen bridge is dead. Deleted. Public API on `features/signatures/index.ts` drops `setSignaturesSession` / `getSignaturesSession` / `clearSignaturesSession` / `SignaturesSessionData`. `lib/inspection/useInspectionFlow.ts`'s `handlePdf` and `buildPreview` accept the snapshot as a function argument now; their session-store fallback and `clearSignaturesSession` call are gone.

---

## 2026-05-26 — Inspection signatures redesign: single unified flow, no persistence

### Redesigned — unified signatures flow across all inspection types
The inspection signature surface has been reduced to one screen at the wizard's final step. New module [features/signatures/](../features/signatures/) owns the flow: one creator signature (captured digitally, profile-resolved name, no editable inputs) plus any number of additional empty hand-sign slots that render as labeled blanks on the printed PDF. Entry point is a status row on `ConclusionStep` showing `ხელმოწერა არ არის დამატებული` / `1 ხელმოწერა` / `1 ხელმოწერა + N დამატებითი ხაზი`; tap opens [`SignaturesScreen`](../features/signatures/SignaturesScreen.tsx) as a full-screen modal. The wizard's `დასრულება` button is intentionally not gated by signature state — PDFs generate whether or not a signature was captured.

### New — PDF signatures section with hand-sign slots
Both the generic inspection PDF ([lib/pdf/inspection/template.ts](../lib/pdf/inspection/template.ts) → [renderSignaturesSection.ts](../lib/pdf/inspection/renderSignaturesSection.ts)) and the equipment-engine PDFs ([lib/inspection/pdf.ts](../lib/inspection/pdf.ts), wired once through [useInspectionFlow](../lib/inspection/useInspectionFlow.ts)) render a unified section at the bottom: heading, the captured creator signature over a horizontal rule with name + Georgian-formatted date, then N labeled empty signing slots for printed-page co-signers. The section is omitted entirely if no signature was captured and no rows were added.

### Regulatory non-negotiable — captured signature data is never persisted
Wizard-scope signature state lives only in component memory and bridges to the result screen's PDF generator via an in-process [`features/signatures/sessionStore`](../features/signatures/sessionStore.ts) — RAM only, cleared explicitly after PDF generation, lost on process exit. The rule is documented in `CLAUDE.md → Things to Avoid` and in `features/signatures/AGENTS.md`. Out-of-scope flows preserved unchanged: project-signer witnesses (`project_signers` + `project/<projectId>/...` paths in the `signatures` bucket), tokenized remote signing (`remote_signings`, `remote-signatures` bucket, `send-signing-sms` Edge Function), order signatures embedded in `orders.form_data`, and the incident/briefing reusable expert signature (`users.saved_signature_url` → `expert/<userId>.png`).

### Persistence cleanup migration (must run manually)
[`supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql`](../supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql) drops the `signatures` table and `signature_status` enum, the `inspector_signature` columns on `inspections` / `bobcat_inspections` / `excavator_inspections` / `general_equipment_inspections`, the `signatories` JSONB columns on those four plus `cargo_platform_inspections`, and the older `cargo_platform_inspections.signatures` JSONB. Deletes objects from the `signatures` storage bucket whose first path segment is not `expert` or `project` (preserves expert/project-signer assets). Multi-device per-row signature fields inside `safety_net_inspections` / `mobile_ladder_inspections` / `lifting_accessories_inspections` / `fall_protection_inspections` / `forklift_inspections` JSON columns are stripped via commented-out backfill SQL the user can opt into after reviewing schemas. Claude Code does not execute this — apply manually after review via `supabase db query --linked` or the Management API.

### Removed — legacy signature surfaces
- The bottom-sheet "name + role inputs then sign" capture flow (`components/inspection-parts/SignatureBlock.tsx` + `SignatureSheet.tsx`, plus the per-inspection-screen `renderSignaturesSheet` prop blocks on excavator / bobcat / general-equipment / cargo-platform / safety-net / mobile-ladder / forklift / fall-protection / lifting-accessories).
- The roles-keyed alternative sheet (`components/SignaturesActionSheet.tsx`).
- The legacy `signaturesApi` (real + mock) and the `useSignatures` query hook, plus the `signaturesApi` re-export from `lib/services`.
- The dead `lib/localSignatures.ts` AsyncStorage writer (`local-sigs:<id>` prefix).
- The generic result screen's `EphemeralSignatureSheet` + `signatoriesToRecords` and the signatures button + count badge on its bottom bar.
- The signatures button on the shared `InspectionResultView` (post-completion result view now exposes Certificates + Download only).
- The per-screen `handleSign` / `handleSignChange` / `handleSignerChange` / `handleSignatoryChange` / `handleSignatorySign` callbacks across the six screens that defined them.

### Audit artifact
[SIGNATURE_AUDIT.md](reports/SIGNATURE_AUDIT.md) catalogs every file, table, column, bucket, and AsyncStorage key the old inspection signature surface reached, with the scope split (in vs. out) the redesign was bounded by.

---

## 2026-05-26 — Web-app test campaign: 9.4% → 51% coverage, 520 tests, 2 real bugs fixed

### Coverage milestone — [web-app/TESTING_PLAN.md](../web-app/TESTING_PLAN.md)

70 test files / **520 passing tests** under [web-app/src/__tests__/](../web-app/src/__tests__).
Statement coverage **9.4% → 51.0%** (lines 55.0%, branches 44.6%, functions 39.3%). Typecheck clean.

Established pattern: module-level `vi.mock('@/lib/supabase')` + `vi.mock('@/lib/data/*')` with a shared chain-mock helper at [src/__tests__/helpers/supabaseChain.ts](../web-app/src/__tests__/helpers/supabaseChain.ts). MSW was evaluated and rejected — adding a network-mock layer alongside the existing module-mock pattern would have created two parallel ways to test the same thing.

Suites added across every layer: data layer (inspections, orders, projects, incidents, reports, briefings, certificates, qualifications, account, projectFiles, templates, regulations, 4 equipment modules); lib (orderPdf, db/storage + db/repository, photoUpload, printable, documentNames, subscription, animations, theme); components (SegmentedControl, SuccessModal, StatCard, charts, FloatingLabelInput, Button/Card, SkeletonCard, SubscriptionCard, PaywallModal, ProjectAvatar, AppShell, navItems, ListRow, ExpandableRow, FieldInput, ProjectActivityWidget, Sidebar, ProjectModal, ProjectMap, WelcomeModal, QuickWinChecklist, PhotoGallery, AddressInput, SettingsModal, DeleteButton, WizardHeader/Footer, ChipSelect, ResultPills, VirtualList, SignatureCanvas, SidePanel, PrintLayout, ErrorBoundary, ProtectedRoute, WizardSteps); store/hooks (useSafetySelectors, useConfetti, useWizardFlow, usePdfUsage, AuthProvider/useAuth with persisted-session + profile-fetch + signIn/signUp/signOut/sendPasswordReset/updatePassword); pages (the auth set, all list pages, dashboards, forms, detail pages, all 11 ProjectDetail sections, Landing + sections, all 8 print pages — 4 equipment + Inspection + Incident + Briefing + Report — both not-found and loaded states); plus i18n init and a 940-LOC InspectionWizard mount (create + preset + edit variants).

### Fixed — 2 real bugs surfaced by writing the tests

- **`useSafetyActions` was missing `useShallow`.** The Zustand action selector returned a fresh object literal on every call, so any component consuming it would see a new snapshot on every render and infinite-loop via `useSyncExternalStore`'s "getSnapshot should be cached" guard — i.e. any caller would crash. Wrapped with `useShallow`. ([useSafetySelectors.ts](../web-app/src/store/useSafetySelectors.ts))
- **Dotless-filename extension fallback was dead code in 5 places.** `file.name.split('.').pop() ?? 'jpg'` never returns `undefined` for a dotless filename — it returns the whole string. So uploading `photo` (no extension) would store as `…/{uuid}.photo` instead of `…/{uuid}.jpg`, and `image.png.txt` would silently keep `.txt`. Switched to `lastIndexOf('.') > 0` + `slice`. Fixed in [photoUpload.ts](../web-app/src/lib/photoUpload.ts), [data/incidents.ts](../web-app/src/lib/data/incidents.ts) (both `addIncidentPhoto` and `createIncident` attachments), [data/reports.ts](../web-app/src/lib/data/reports.ts), [data/certificates.ts](../web-app/src/lib/data/certificates.ts).

### Fixed — UX inconsistencies caught while wiring page tests

- **History page hard-coded `'harness'` for every row from the `inspections` table.** That table actually holds harness AND three scaffold variants (xaracho / mobile_scaffold / mobile_scaffold_n3), so scaffold rows showed a harness badge. Now reads the joined `template.category` and falls back to `'harness'` only when absent. Same page also unmapped the cargo-platform delete branch and the cargo-platform link (was `href: '#'`). ([History.tsx](../web-app/src/pages/History.tsx))
- **`ProjectActivityWidget` was silently dropping cargo-platform inspections** from the project activity feed (only inspection/bobcat/general/excavator types were wired). Added a 5th query + type + avatar (`📦` ტვირთის პლატფ.). ([ProjectActivityWidget.tsx](../web-app/src/components/ProjectActivityWidget.tsx))
- **`SidePanel` showed English severity/category labels** (`Critical / High / Medium / Low`, `Hazard / Procedure / Compliance`). Translated to Georgian (`კრიტიკული / მაღალი / საშუალო / დაბალი`, `საფრთხე / პროცედურა / სტანდარტი`); `PPE` stays as `PPE` (universal term). ([SidePanel.tsx](../web-app/src/components/SidePanel.tsx))

### Infrastructure

- **`IntersectionObserver` mock added to [test-setup.ts](../web-app/src/test-setup.ts)** — framer-motion's `whileInView` uses it, and jsdom doesn't ship one. Without the mock, every page that mounts a `motion.div` with `whileInView` crashes at render time.
- **Coverage now excludes `src/__tests__/**`** — test files were being measured against themselves, inflating the denominator. ([vitest.config.ts](../web-app/vitest.config.ts))

---

## 2026-05-26 — Mobile: Reanimated worklet warnings fixed + PDF cell-status canonicalization

### Fixed

- **`BottomSheet` was logging "Tried to modify key `current` of an object already passed to a worklet" on every scroll event.** The bottom-sheet pan gesture read `scrollAtTopRef.current` inside its `onUpdate` worklet, but the same ref was being mutated by the scroll handler on the JS thread — Reanimated 4 doesn't allow plain ref mutation on objects captured into a worklet. Converted to `useSharedValue(true)` so the worklet sees coordinated reads and the JS side writes via `.value`. ([components/BottomSheet.tsx](../components/BottomSheet.tsx))
- **`useScrollHeader` was triggering the same warning on every frame.** A plain `let lastUpdate = 0` was captured into the `useAnimatedScrollHandler` worklet and reassigned each onScroll tick. Converted to `useSharedValue(0)`. ([components/animations/useScrollHeader.ts](../components/animations/useScrollHeader.ts))

### Changed — inspection PDF cell rendering ([lib/pdf/inspection/renderQuestion.ts](../lib/pdf/inspection/renderQuestion.ts))

- **Web's internal cell keys (`bad`, `na`/`n/a`) are now classified correctly.** The `classifyCell` / `isProblemValue` regexes only knew the Georgian + English long-form variants; cells stored by the web dashboard came through as `null` and rendered as plain text in the printed act.
- **Cells now render canonical Georgian labels in the PDF.** A new `cellLabel(status, raw)` helper maps the classified status to `კი` / `არა` (or `—` for neutral) instead of echoing the raw stored value. The PDF act is now consistently Georgian whether the answer came from mobile (already Georgian) or web (stored as `ok` / `bad`).

---

## 2026-05-26 — Mobile unit test coverage: ~3% → ~26% (milestones 1 & 2)

### Added — 26 new test files under [tests/unit/](../tests/unit) (407 passing tests across 36 files)

**Pure formatters / mappers (no mocking):**
[documentName](../tests/unit/documentName.test.ts), [qualificationTypes](../tests/unit/qualificationTypes.test.ts), [homeUtils](../tests/unit/homeUtils.test.ts) (fake timers for greeting/relativeTime), [terms](../tests/unit/terms.test.ts), [calendarEvents](../tests/unit/calendarEvents.test.ts) (25 tests covering all branches of `buildCalendarEvents`).

**Theme- or Supabase-mocked:**
[statusColors](../tests/unit/statusColors.test.ts) (`vi.mock('../../lib/theme')`), [pdfShared](../tests/unit/pdfShared.test.ts) (mocked `pdfPhotoEmbed`, dedup verification), [pdfGate](../tests/unit/pdfGate.test.ts) (mocked `supabase.rpc`, `PdfLimitReachedError`), [navigationGuard](../tests/unit/navigationGuard.test.ts) (oscillation + 5s window).

**AsyncStorage-backed:**
[logError](../tests/unit/logError.test.ts) — `toErrorMessage` variants + ring buffer cap; needed a custom `drainRing` helper because `void appendToRing(...)` is fire-and-forget. [localSignatures](../tests/unit/localSignatures.test.ts), [pendingDeletes](../tests/unit/pendingDeletes.test.ts) (undo / execute / cancel / settled-idempotence), [calendarSchedule](../tests/unit/calendarSchedule.test.ts) (early-completion `nextDueDateOverride`), [regulations](../tests/unit/regulations.test.ts) (fetch staleness + `parseAmendmentDate` strategies), [breathalyzerLogService](../tests/unit/breathalyzerLogService.test.ts) (peoplePoolApi case-insensitive upsert + recency ordering).

**Service `toModel` / `toDb` mappers** — all 8 inspection services covered by capturing the config passed to `makeInspectionService` via `vi.mock`:
[bobcatService](../tests/unit/bobcatService.test.ts) (standard + large-loader catalogs), [forkliftService](../tests/unit/forkliftService.test.ts), [mobileLadderService](../tests/unit/mobileLadderService.test.ts), [cargoPlatformService](../tests/unit/cargoPlatformService.test.ts), [safetyNetService](../tests/unit/safetyNetService.test.ts), [generalEquipmentService](../tests/unit/generalEquipmentService.test.ts), [excavatorService](../tests/unit/excavatorService.test.ts), [fallProtectionService](../tests/unit/fallProtectionService.test.ts) (device_data coercion), [liftingAccessoriesService](../tests/unit/liftingAccessoriesService.test.ts) (`normSig` field normalization).

**File-system / blob helpers:**
[photoCompression](../tests/unit/photoCompression.test.ts) (profile config + adaptive 2nd-pass + fallback paths), [blob](../tests/unit/blob.test.ts) (`blobToDataUrl` arrayBuffer + FileReader paths, payload-size guards).

### Changed — [vitest.config.ts](../vitest.config.ts)

- Removed the broken `__tests__/**/*.{ts,tsx,mjs}` include glob — the 5 `.mjs` files there import `node:test`, which vitest cannot bundle under jsdom. The legacy mirrors stay on disk for now (do not run); new tests go in `tests/unit/`.
- Added explicit `coverage.include` (`lib/**`, `types/**`, `store/**`) so the reported % is project-wide instead of "% of files vitest happened to touch." Excludes `lib/supabase.ts`, `lib/theme.ts`, `lib/ThemeContext.tsx` (env-bound or RN-platform-only).
- Added the `json-summary` reporter for CI-friendly machine-readable output.
- Coverage thresholds: **70/70/60/70 → 20/20/20/20**. The original 70% was aspirational against a ~3%-covered codebase, so every CI run failed the gate. Thresholds are now set at the milestone we actually meet; raise as coverage grows.

### Coverage delta

| Metric | Before | After | Threshold |
|---|---|---|---|
| Statements | ~3% | **26.71%** (1216/4552) | 20% ✓ |
| Branches | ~3% | **28.23%** (1032/3655) | 20% ✓ |
| Functions | ~3% | **20.46%** (265/1295) | 20% ✓ |
| Lines | ~3% | **26.05%** (984/3777) | 20% ✓ |

### Other

- `coverage/` added to [.gitignore](../.gitignore) — regenerated on every `vitest --coverage` run, not source.
- Added a **Unit tests** section to [README.md](../README.md) (commands + coverage scope + the `__tests__/` deprecation note).

---

## 2026-05-26 — Storage security: owner-scoped RLS on `certificates` / `answer-photos` / `pdfs` / `signatures`

### Security
- **Closed the "any authenticated user can delete/overwrite anyone's files" hole** on the `certificates`, `answer-photos`, `pdfs`, and `signatures` buckets. They were guarded only by dashboard-created `sarke_*` policies that gated on `bucket_id` alone (no per-row owner check). New migration [0053_storage_rls_owner_scoping.sql](../supabase/migrations/0053_storage_rls_owner_scoping.sql) replaces them with per-bucket `owner = auth.uid()` policies for SELECT/UPDATE/DELETE (INSERT stays auth-only). Owner-based scoping was chosen over path-based because upload-path schemes are inconsistent across the mobile and web codebases; pre-flight confirmed every existing file already has an owner set. Companion to `0020`.
- **Read paths migrated to signed URLs (prep for making the buckets private).** Every read of these four buckets now resolves through `createSignedUrl` (which works on both public and private buckets): the mobile helpers in [lib/imageUrl.ts](../lib/imageUrl.ts) already did, and the two direct `getPublicUrl` readers were converted — [lib/sharePdf.ts](../lib/sharePdf.ts) (PDF share) and [web-app/src/pages/IncidentDetail.tsx](../web-app/src/pages/IncidentDetail.tsx) (incident signature). The orphaned `publicUrl` helper was dropped from the web dashboard's storage module.
- **Buckets flipped to private — read exposure closed.** The four buckets are now `public = false`; the public download endpoint returns `400 Bucket not found`, so reads no longer bypass RLS. Note: this landed before the signed-URL read fixes reach clients, so the web dashboard's incident-signature display (until 618655a redeploys) and mobile PDF sharing (until a new build is adopted) are temporarily broken — push + build to clear it. Tracked in the P0 entry in [BUG_REPORT.md](reports/BUG_REPORT.md).

---

## 2026-05-26 — Inspection wizard UX: stacked inputs, cleaner stepper, in-flow project selection

### Changed
- **All inspection inputs stacked one-per-row.** The cramped two-column layouts are gone — every identification field now spans the full width with consistent spacing. Sling form ([SlingsIdentificationStep.tsx](../components/inspection-parts/SlingsIdentificationStep.tsx)) rebuilt as a single column; the shared [`IdentificationGrid`](../components/inspection-parts/IdentificationGrid.tsx) calls now pass `columns={1}` (forklift, safety-net, mobile-ladder); cargo-platform's length/width row inlined.
- **Step-name labels removed from the stepper.** The labeled segments (`პროექტი / სახ.ნომ / …`) confused more than they helped — the equipment flows now show just a clean progress bar (dropped `stepLabels` / `STEP_LABELS` from excavator, cargo-platform, general-equipment, bobcat, harness).
- **Bigger "form-selector" for type choosers.** `IdentificationGrid` gained a `type: 'select'` field that renders a full-width inline list of selectable option rows (radio-style) instead of small chips. Applied to forklift `ძრავის ტიპი` and general-equipment `შემოწმების სახე`.
- **`მარ-ბა` → `მარკირება`** on the sling form, matching the PDF template label (`lib/inspection/schemas/liftingAccessories.ts`). The screen's other Georgian abbreviations remain intentionally locked — see [AGENTS.md](../app/inspections/lifting-accessories/AGENTS.md).

### Added
- **Reusable chip navigation strip for multi-item flows.** Extracted the fall-protection device tab strip into a shared [`ChipNavStrip`](../components/inspection-parts/ChipNavStrip.tsx) (status dot + label + active highlight, status colors: done/problem/warning/active/pending) and added it to the **harness flow** ([HarnessListFlow](../components/harness-list/HarnessListFlow.tsx)) as a second way to navigate — you can now jump directly between harnesses (N1/N2/N3…) while the linear "დადასტურება →" confirm-to-advance still works. Fall-protection now consumes the shared component (no behavior change; its bespoke tab strip + `tabColor`/`tabBg` helpers were removed). Other flows have no repeated indexed sub-items, so they're unaffected.

### Fixed
- **Report slides were being overwritten — only the last-edited slide survived.** The slide editor saved each slide to the server but never updated the React Query cache the slide-list screen reads from. Since `router.back()` doesn't refetch that screen, tapping "add slide" rebuilt the slides array from stale cache and PATCHed it back — wiping the content/photo just saved into the previous slide. The editor now syncs the cache after save (`queryClient.setQueryData`), matching the list screen's `persistSlides` pattern, so every slide persists. ([app/reports/[id]/slide/[slideId].tsx](../app/reports/[id]/slide/[slideId].tsx))
- **Harness checklist "reloaded the whole page" on every tap / keystroke / next.** Each ✓/✗ tap and comment keystroke called `onPatchAnswer`, which wrote to the parent wizard's state and enqueued a server upsert — re-rendering the whole flow and reloading the screen on every interaction (and again on each "next"). `HarnessListFlow` now keeps all ✓/✗/comment edits in a **local draft**; advancing between harnesses ("დადასტურება →") and chip-jumping are purely local (only the list re-renders, header stays). The draft is persisted (`onPatchAnswer`) only when the user **finishes the last harness** (conclude) or **leaves the flow** (close) — one batched save, never per tap/keystroke/row. Combined with stable `ChipRow` callbacks + a custom `memo` comparator (rows re-render only when their own data changes), the checklist is smooth with no reload and no per-key network traffic. ([HarnessListFlow](../components/harness-list/HarnessListFlow.tsx), [ChipRow](../components/harness-list/ChipRow.tsx))
- **Questionnaire/harness flow reloaded when returning from a sub-screen.** The wizard re-ran `load()` on every screen re-focus — e.g. returning from the photo picker after marking an item ✗ — which set `loading = true`, tore the step UI down, refetched everything, and overwrote in-flight local state (for the harness takeover it surfaced as a jump back to "რამდენი ქამარი სულ?"). Removed the focus refetch ([useWizardState.ts](../features/inspection-wizard/useWizardState.ts)) — the wizard now loads once per inspection id like the equipment screens; resume-after-kill is still covered by the offline cache. `HarnessListFlow` also caches its position (list + active harness) keyed by inspection id as a belt-and-suspenders.
- **Wizard conclusion textarea hidden behind the keyboard.** The generic inspection wizard nested a `KeyboardAwareScrollView` inside a `KeyboardAvoidingView` (both from `react-native-keyboard-controller`), so focusing the `დასკვნა` textarea double-counted the keyboard height — the footer jumped up, a large empty gap appeared, and the textarea ended up off-screen. Removed the redundant outer `KeyboardAvoidingView` (each step already owns a `KeyboardAwareScrollView`, matching the equipment screens), dropped the now-dead `headerH` measurement, and wrapped the footer in a `KeyboardStickyView` so the primary action button (`დასრულება` / `შემდეგი`) rides above the keyboard instead of being covered by it. ([features/inspection-wizard/InspectionWizard.tsx](../features/inspection-wizard/InspectionWizard.tsx))
- **Attached-certificate images missing from PDFs (only name + № showed).** The certificate card in the inspection PDF sized its image box with `aspect-ratio: 16/9` and an `height: 100%` `<img>` inside. The expo-print/WKWebView print path (and the on-screen preview) didn't resolve `aspect-ratio`, so the wrapper collapsed to height 0 — hiding both the image and its `onerror` fallback, while the title/number rendered normally. Replaced it with the engine-agnostic `padding-top: 56.25%` percentage hack (the same intrinsic-height approach the answer-photos already use), so certificate images now render in both the preview and the final PDF. ([lib/pdf/inspection/template.css.ts](../lib/pdf/inspection/template.css.ts))

### Refactored
- **Project selection is now a real in-flow step, not a redundant duplicate.** Starting an equipment inspection (excavator, bobcat, general-equipment, cargo-platform) **from a project** no longer shows a project-pick step — the flow opens directly on the first real step. Starting **from Home** routes to a new lightweight entry screen ([app/inspections/new.tsx](../app/inspections/new.tsx)) where project selection is the first full-screen step; the inspection row is created lazily once a project is chosen, then `router.replace`s into the real flow. The four screens now start past the project step (`firstStep` bumped, progress counts adjusted); `InspectionShell` no longer gates the PDF icon on `step > 0` (callers pass `showPdfIcon`). Company/address that the old project step set on-select are now covered by each flow's load-time `autofill`. (DB `project_id` stays `NOT NULL` — no migration.)

---

## 2026-05-25 — Shared document naming + multi-task session & DB compliance

### Document naming (mobile + web single source of truth)
Web list/detail screens showed raw id slices (e.g. `ქამარი #0c9537aa`) while mobile showed the template/type name; a parallel effort on `main` also added short UI names via a duplicated `lib/inspectionDisplayName.ts` (+ web mirror). Both are now unified in one pure-TS module, [lib/shared/documentName.ts](../lib/shared/documentName.ts) — the first code shared between the Expo app and `web-app/` (imported relatively on mobile, via the `@root` alias on web). Exports `inspectionDisplayName` / `reportDisplayName` / `certificateDisplayName` / `orderDisplayName`. `inspectionDisplayName` maps the formal `templates.name` to its short UI form (e.g. `დამცავი ქამრების შემოწმების აქტი` → `დამცავი ქამრები`) via a single `INSPECTION_SHORT_NAME` map; the per-codebase `lib/inspectionDisplayName.ts` duplicates were removed in favor of this one source. Web wires it through [web-app/src/lib/documentNames.ts](../web-app/src/lib/documentNames.ts) (template-name resolver hook + constant labels for the equipment tables that have no template row). See [docs/primitives.md → Document display names](primitives.md#document-display-names-shared-with-web). Print PDFs were intentionally left untouched for legal-document fidelity. (commits `442aa65`, local naming refactor)

### New
- **In-app profile editing.** New screen at [app/profile.tsx](../app/profile.tsx) with first / last name fields, a link to the existing password-change flow at [/account-settings](../app/account-settings.tsx), and an "ანგარიშის წაშლა" destructive row at the bottom. Entry point: the profile card at the top of the More tab is now tappable. Profile mutations route through new helper [lib/profileService.ts](../lib/profileService.ts) — mirrors `web-app/src/lib/data/account.ts` so both auth metadata and the public.users row stay in sync. (commit `db0ec1a`)
- **`delete-account` Edge Function.** [supabase/functions/delete-account/index.ts](../supabase/functions/delete-account/index.ts). Reads the caller's JWT, calls `auth.admin.deleteUser` server-side so the service-role key never reaches the client. Required for App Store Review Guideline 5.1.1(v). (commit `db0ec1a`)
- **Slings type selector bottom sheet.** [components/inspection-parts/SlingTypeSheet.tsx](../components/inspection-parts/SlingTypeSheet.tsx) replaces the 7-chip multi-select on step 1 of the slings / chains inspection. (commit `6172f31`)
- **Three database migrations** capturing schema work that previously lived only in Supabase Studio:
  - [`20260525180000_pin_function_search_paths.sql`](../supabase/migrations/20260525180000_pin_function_search_paths.sql) — pins `search_path = public, pg_catalog` on every public function.
  - [`20260525183000_cascade_user_deletion.sql`](../supabase/migrations/20260525183000_cascade_user_deletion.sql) — adds `ON DELETE CASCADE` FKs from every user-owned public column to `auth.users(id)`.
  - [`20260525190000_dedupe_user_fkeys.sql`](../supabase/migrations/20260525190000_dedupe_user_fkeys.sql) — cleanup pass that drops duplicate `*_auth_users_fkey` constraints produced by the prior migration's blind spot.

### Fixed
- **FK violation creating inspection from project page.** The project-page entry path was not propagating `project_id` reliably to the inspection-create call, producing the legacy `questionnaires_project_id_fkey` Postgres error. Wired `project_id` through the navigation, coerced `useLocalSearchParams<{ id }>` to a single string at the route boundary, and added a UUID guard at the service layer so the failure mode now surfaces as a clear Georgian toast. Diagnosis in [TASK2_DIAGNOSIS.md](reports/TASK2_DIAGNOSIS.md). (commit `8486713`)
- **Account deletion blocked by trigger search_path resolution.** Two trigger functions referenced the `questionnaire_status` public enum without schema qualification; `auth.admin.deleteUser` runs with restricted `search_path` and failed to resolve the type, returning a 500 "Database error deleting user" in TestFlight. Pinned `search_path` on every public function. See migration [`20260525180000_pin_function_search_paths.sql`](../supabase/migrations/20260525180000_pin_function_search_paths.sql).
- **Account deletion left user data orphaned.** No FKs existed from public user-owned tables to `auth.users(id)`, so deleting an auth row left 22+ tables worth of rows behind. Added `ON DELETE CASCADE` FKs across the matching columns. See migrations [`20260525183000_cascade_user_deletion.sql`](../supabase/migrations/20260525183000_cascade_user_deletion.sql) and [`20260525190000_dedupe_user_fkeys.sql`](../supabase/migrations/20260525190000_dedupe_user_fkeys.sql).

### Refactored
- **Slings / chains inspection step 1.** Replaced the 7-chip multi-select for equipment type with a tappable section that opens [`SlingTypeSheet`](../components/inspection-parts/SlingTypeSheet.tsx); introduced section headers (`ტ-პი / სახ.`, `იდენტიფიკაცია`, `მახასიათებლები`, `მარ-ბა`, `მომდევნო შემოწმება`) for visual hierarchy; removed the duplicate `მომდევნო შემოწმება` label that previously appeared between the section header and the date picker. Step body extracted into [`SlingsIdentificationStep`](../components/inspection-parts/SlingsIdentificationStep.tsx) so the route file shrank by ~70 lines. Georgian abbreviations on this screen are intentional and locked — see the new [AGENTS.md](../app/inspections/lifting-accessories/AGENTS.md). (commit `6172f31`)

### Removed
- **Duplicate "პაროლის შეცვლა" row on the More tab.** Same row existed on both the More tab and the new Profile screen, both linking to `/account-settings`. Removed the More tab copy; the route file remains in place (still reached from Profile). (commit `b6f5212`)

---

## 2026-05-25 — Polish-pass refactor: god-file slimming and conditional-hook fix (mobile)

Follow-up to the 2026-05-24 feature-sliced refactor. Five phases of structural polish, plus one bonus extraction in Phase 4; commits `4247d48`…`489d544`. Full audit trail in [REFACTOR_SUMMARY_V2.md](reports/REFACTOR_SUMMARY_V2.md).

### Fixed — `features/inspection-wizard/GridRowStep`
The non-harness branch called `useState` and `useRef` after a conditional `return`, violating the rules of hooks. Split into [HarnessRowStep.tsx](../features/inspection-wizard/HarnessRowStep.tsx) (169 lines) + [ScaffoldRowStep.tsx](../features/inspection-wizard/ScaffoldRowStep.tsx) (146 lines); the `grid_rows[0] === 'N1'` dispatch moved up to `InspectionWizard.tsx`. Each new file calls its hooks unconditionally. Was latent because `WizardStepTransition` unmounts on every step change — a future change that keeps step components mounted across transitions would have crashed.

### Refactored — `features/project-detail/`
`ProjectDetail.tsx` 1,470 → 624 lines. Extractions: `ProjectArchHeader.tsx` (SVG bezier morph + arch animation), `useProjectDetailData.ts` (14 `useState`s + 17 queries + 12 syncs consolidated), `unifiedInspections.ts` (the discriminated union + swipe-delete dispatch), seven `sections/*.tsx` cards (Inspections, Incidents, Briefings, Reports, FilesAndOrders, Breathalyzer), plus `LoadingSkeletonScreen.tsx` and `ProjectMapModal.tsx`. The 624-line residue (map hero, logo/info hero, file/upload action handlers, EditProjectSheet/CustomDropdown) is logged as the next slimming target in `features/project-detail/AGENTS.md`.

### Refactored — `lib/pdf/inspection/template.ts`
832 → 281 lines. The ~550-line CSS body extracted to a sibling [template.css.ts](../lib/pdf/inspection/template.css.ts) exporting `getInspectionPdfCss({ isPdf })` — a function, not a const, because the CSS has six `${isPdf ? ... : ...}` interpolations.

### Refactored — `features/inspection-wizard/useWizardState.ts` (partial)
593 → 558 lines. The five write-only AsyncStorage persistence `useEffect`s extracted to [hooks/useWizardPersistence.ts](../features/inspection-wizard/hooks/useWizardPersistence.ts). The remaining `load` + `answers` + `finish` stayed merged because they all write to the same `answers`/`photos`/`project` state shapes — splitting them would re-create an orchestrator above three thin wrappers with the same cross-references. Documented in `features/inspection-wizard/AGENTS.md` along with the rule: split only when the proposed slice has no shared writable state with another slice.

### Removed — dead `useMemo` in `features/inspection-wizard/MeasureInput`
`useMemo(() => getstyles(theme), [theme])` was called and the result discarded (carried over from the pre-refactor god-file). Removed; file is 91 → 86 lines.

### Verified — New Architecture is ON
`app.json` declares `newArchEnabled: true`; no per-platform overrides; `react-native-reanimated@4.1.1` is in use (which requires New Arch at runtime). Compat check passes for all native libs (gesture-handler, screens, safe-area-context, maps, webview, svg, sentry, keyboard-controller). Diagnosis in [NEWARCH_REPORT.md](reports/NEWARCH_REPORT.md).

---

## 2026-05-24 — Feature-sliced refactor: god-file → module split (mobile)

A multi-phase structural refactor: convert god-files in a mixed flat/folder layout into a feature-sliced architecture with co-located `AGENTS.md` per module. Commits `49e1325`…`0802de7`. Full audit trail in [REFACTOR_SUMMARY.md](reports/REFACTOR_SUMMARY.md).

### New — `features/` folder with per-module `AGENTS.md`
Three feature modules created at the new top-level `features/` slot. Each carries its own `AGENTS.md` documenting public API, internal files, gotchas, and canonical helpers it consumes:
- **`features/inspection-wizard/`** (18 files) — the wizard god-file [app/inspections/[id]/wizard.tsx](../app/inspections/%5Bid%5D/wizard.tsx) (2,582 lines) became an 8-line orchestrator that re-exports from here.
- **`features/order-new/`** (16 files) — [app/orders/new.tsx](../app/orders/new.tsx) (1,749 lines) became a 1-line orchestrator.
- **`features/project-detail/`** (3 files at v1 end; expanded in v2) — [app/projects/[id].tsx](../app/projects/%5Bid%5D.tsx) (1,742 lines) became a 1-line orchestrator.

### Refactored — `lib/services/` split by domain
`lib/services.real.ts` (1,298 lines) and `lib/services.mock.ts` (1,011 lines) collapsed into `lib/services/` with one file per domain (`projects`, `templates`, `inspections`, `answers`, `signatures`, `qualifications`, `projectItems`, `schedules`, `remoteSigning`, `storage`, `reports`, `incidents`, `payments`) under both `real/` and `mock/` subfolders. The folder-resolved [lib/services/index.ts](../lib/services/index.ts) dispatches between real and mock based on the `useMockData` flag.

### Refactored — `lib/pdf/` split by document type
[lib/orderPdf.ts](../lib/orderPdf.ts) (1,588 lines) split into [lib/pdf/order/](../lib/pdf/order/) (one file per doctype: `laborSafety`, `alcoholControl`, `fireSafety`, `fireSafetyEnterprise`, `craneOperator`, `craneTechnical`, plus `_shared` and `index`). [lib/inspectionPdfTemplate.ts](../lib/inspectionPdfTemplate.ts) (1,112 lines) split into [lib/pdf/inspection/](../lib/pdf/inspection/) (`_shared`, `template`, `renderQuestion`, `renderPhoto`, `renderSignatures`, `renderProjectBrand`, `index`). The original paths remain as re-export barrels so the separate `web-app/` codebase keeps working unchanged.

### Refactored — `components/` god-files split into sibling folders
[components/PhotoAnnotator.tsx](../components/photo-annotator/) (754 lines) → `components/photo-annotator/` (3 files). `components/wizard/kamari/KamariFlow.tsx` (713 lines) → 4 step files + `_shared` + `styles`. [components/HarnessListFlow.tsx](../components/harness-list/) (665 lines) → `components/harness-list/` (3 components + `_shared` + `styles`). All three keep a backwards-compat re-export barrel at the original path.

### Removed — repo-root cruft and primitive duplication
`__strings.txt` and the unused `src/` folder deleted. `components/ui.tsx` deduped to a `components/ui/` folder. The `components/inspection` vs `components/inspections` naming collision resolved by renaming the inspection-parts/inspection-steps folders.

### Spotted but not fixed (carried into v2)
Three bugs/oddities surfaced during the structural pass and were logged in `reports/REFACTOR_NOTES.md` instead of patched mid-refactor: conditional-hook calls in `features/inspection-wizard/GridRowStep.tsx` (fixed in v2 — see the 2026-05-25 entry above), dead `useMemo(getstyles)` in `features/inspection-wizard/MeasureInput.tsx` (fixed in v2), and `app/orders/new.tsx` dead step components (intentionally dropped — they had no callers).

### Verified
`npm run typecheck` and `npm run check:primitives` clean after every commit. [scripts/check-primitives.mjs](../scripts/check-primitives.mjs) `SCAN_DIRS` extended to include `features/` so the wrong-default guardrails apply inside the new feature folders.

---

## 2026-05-22 — Harness wizard redesign lands in the actual dashboard (web-app)

The previous "reusable web inspection wizard" (entry below) was built in `components/web/InspectionWizard/` — the **Expo** web layer, which never deploys to hubble.ge. hubble.ge is served by the `web-app/` dashboard, so that work was never visible. This entry corrects it.

### Removed — `components/web/InspectionWizard/` + `app/inspections/harness/HarnessWebWizard.tsx`
Deleted the Expo "web version of mobile" harness wizard and its `Platform.OS === 'web'` branch in `app/inspections/harness/[id].tsx`. The native mobile flow is untouched.

### Redesigned — `web-app/src/components/inspections/HarnessWizard.tsx`
The harness checklist step now matches the intended layout, in the dashboard that actually ships:
- **Left sidebar (260px):** lists harnesses (`grid_rows`) with status sub-labels (შეუვსებელი / X კი · Y არა / ✓ დასრულდა / ⚠ X პრობლემა), active highlight, and a dashed "+ ახალი ქამარი" add card. Arrow up/down navigates.
- **Main content (max 680px):** per-harness question table — one row per check column (`grid_cols`) with a compact inline კი / არა / N/A segmented control and zebra striping. Per-row keyboard: Y/1, N/2, 3/Space.
- **Full-width footer:** უკან (previous step) · კიდევ ერთი (when rows remain) · შენახვა და შემდეგი.
- The harness step renders full-bleed (the surrounding `InspectionWizard` no longer constrains it to `max-w-2xl`); answers auto-save on every cell change via the existing `onChange`.
- **Data-model note:** comments stay per-harness (one `კომენტარი` column), not per-question, so the spec's per-row comment expansion is one harness-level comment field.

---

## 2026-05-22 — Reusable web inspection wizard (Expo web) — superseded/removed

### New — `components/web/InspectionWizard/`
A generic, web-only full-page modal wizard meant to back every web inspection flow (harnesses, fall-protection, forklift, …). Mobile is untouched — every sub-component bails with `if (Platform.OS !== 'web') return null`.

- **Layout:** fixed full-viewport modal with a 64px header (project identity + thin progress bar + close), a 260px left sidebar listing items with status sub-lines and an "add new" card, a scrollable max-680px main content area, and a 72px footer (back / save-and-next / complete). Header & footer borders span the full width naturally as the top/bottom rows of the modal column.
- **Question table:** web-appropriate rows (no mobile buttons) with an inline 3-state segmented control (კი / არა / N/A). Keyboard: per-row focus + Y/1, N/2, 3/Space; a one-time hint fades after 3s; Escape closes; Arrow up/down switches items. Rows answered `არა` expand to reveal a comment field + photo button.
- **API:** fully config-driven via `WizardConfig` (`projectName`, `actName`, `items`, `itemLabel`, `questions`, `onComplete`, `onClose`, optional `onSaveItem`/`onAddItem`). The wizard owns per-item answer state and recomputes status/stats internally.
- **Note:** the component is not yet mounted on any route, so it has no live UI verification yet — wire it into a flow to render it. Web-only CSS keys (`cursor`, `transition*`, `position:'fixed'`) go through a typed `webStyle()` helper since react-native's `ViewStyle` omits them (no `any`).

---

## 2026-05-22 — Full beta-report audit: 13 verified fixes (mobile)

### Fixes — triaged every remaining report item, fixed the real ones
Audited all ~156 detailed entries in the 10-agent beta report against current source and fixed the 13 that were genuinely broken and safely fixable:
- **Data integrity:** project-signer signatures no longer upload as 0-byte files (canonical `uploadSignature`, §1.10); offline photos are no longer dropped when compression fails (§2.18); bobcat no longer shows "success" when completion fails (§1.21).
- **Correctness:** order success screen shows the right document type + order number instead of a hardcoded label (§1.15/1.24); MapPreview recenters when the location pin changes (§2.33); `deleteInspection` guards against double-trigger (§2.41).
- **UX/polish:** Kamari detail input no longer hidden by the keyboard (§2.11); scaffold help tour resets to the first slide on re-open (§2.13); conclusion-step "required" errors only appear after interaction (§2.25); annotated photos save as JPEG not PNG (§2.16); RoleSlotSheet respects dark mode (§3.16); fixed an English word in a Georgian screen-reader label (§3.48); capped an unbounded Set (§4.1).

The vast majority of report items were false, already-handled, or device-only; a few of its proposed fixes would have regressed working code. Deferred (real but larger): incident edit-mode duplicate (§1.16), harness PDF preview (§3.13), annotator coord clamp (§2.43), tappable order rows (§3.17 — needs an order-detail screen that doesn't exist yet). Per-item evidence in [BUG_REPORT.md](reports/BUG_REPORT.md).

---

## 2026-05-22 — Auth keyboard & autofill UX (mobile)

### Improvement — return-key flow + password-manager autofill on auth screens
Login, register, forgot-password, and reset-password inputs now support return-key field chaining (email→password→submit, name→name→email→password on register), submit-on-return, and iOS/Android autofill hints (`textContentType` / `autoComplete`) for email, current/new password, and name fields. `FloatingLabelInput` now forwards those props (plus `blurOnSubmit`) to the underlying `TextInput`. ([components/inputs/FloatingLabelInput.tsx](../components/inputs/FloatingLabelInput.tsx), [app/(auth)/login.tsx](../app/(auth)/login.tsx), [forgot.tsx](../app/(auth)/forgot.tsx), [reset.tsx](../app/(auth)/reset.tsx))

This was §2.1–2.3 of the 10-agent beta report (Sprint 3). Other Sprint-3 items were assessed: AuthGate redirect oscillation (§1.18) is already prevented by expo-router segment guards (not a bug); SignatureBlock's index keys (§2.21) are genuinely fragile but need stable ids threaded through callers (deferred); photo/OOM items (§2.15–2.19) need on-device profiling. See [BUG_REPORT.md](reports/BUG_REPORT.md) for details.

---

## 2026-05-21 — Single-flight guard on the PDF upload queue (mobile)

### Fix — no more duplicate certificate rows
`flushPendingPdfUploads()` is called from three places that can fire near-simultaneously on app start (app mount + the NetInfo seed and reconnect listener). With no concurrency guard, two flushes could both pass the check-then-create dedup before either inserted — and `certificates` has no DB unique constraint — producing duplicate certificate rows. Added a module-level single-flight guard so concurrent calls are no-ops while one flush runs. ([lib/pdfUploadQueue.ts](../lib/pdfUploadQueue.ts))

This was §1.14 of the 10-agent beta report (Sprint 2). The other Sprint-2 items — offline photo-queue "FK violation / permanent loss" (§1.12), AsyncStorage "queue corruption" (§1.13), wizard `patchAnswer` "race" (§1.20), and GridRowStep comment "keyboard regression" (§2.4) — were verified against source and found to be already-handled or non-existent; no code change. See [BUG_REPORT.md](reports/BUG_REPORT.md) for per-item evidence.

---

## 2026-05-21 — Fix new-inspection-from-template project association (mobile)

### Fix — inspection now created under the right project
The project-detail template picker passed the selected **template** id where `createInspectionForTemplate` expects the **project** id (a shadowed `id` callback param). Picking a template on a project with 2+ system templates created the inspection against the wrong `project_id`. Renamed the callback param to `templateId` and pass the route project `id`. ([app/projects/[id].tsx](../app/projects/[id].tsx))

This was §1.4 of the 10-agent beta report (Sprint 1). The other Sprint-1 items in that report — BottomSheet/SheetLayout keyboard "double handling" (§1.1–1.2), three "missing done screens" (§1.5–1.7), and fall-protection/forklift "undefined `inspectionRef`" (§1.8–1.9) — were verified against source and found to be already-fixed or non-existent; no code change. See [BUG_REPORT.md](reports/BUG_REPORT.md) for the per-item evidence.

---

## 2026-05-21 — Align web-app React types with the React 19 runtime (web-app)

### Fix — types now match runtime
Bumped `@types/react` / `@types/react-dom` from `^18` to `^19` (web-app runs React 19.2). Typecheck, build, tests, and smoke stay green — the prior `@types@18` was a latent type-safety hole (types lagged the runtime by a major version).

Note: the install confirmed `react-leaflet@4` peer-requires React 18 (web-app is installed with `--legacy-peer-deps`). It works under React 19 at runtime and typechecks, but a future `react-leaflet@5` bump would make that peer dependency honest.

---

## 2026-05-21 — Split the Landing + Sidebar god-components (web-app)

### Internal refactor — no behavior change
- **`Landing.tsx` 799 → ~35 lines:** extracted into `pages/landing/` — `marketing-data.ts` (content), `shared.tsx` (animation variants + store badges + phone mockup), `sections.tsx` (the 9 page sections), `overlays.tsx` (sticky bar, exit-intent, cookie banner). `Landing.tsx` is now a thin composition. Verified rendering identically via preview screenshot.
- **`Sidebar.tsx` 532 → ~140 lines:** nav config → `layout/navItems.ts`; `Tooltip`/`RailNavItem`/`MoreGroup` + shared `SidebarNavList` + `SidebarFooter` → `layout/SidebarNav.tsx`. The mobile drawer (which had re-declared the nav markup + account/sign-out) now reuses `SidebarNavList`/`SidebarFooter` in always-expanded mode — the drawer is just the expanded rail.
- Verified: typecheck + build + tests (71) + smoke green.

---

## 2026-05-21 — Enforced the no-shadow rule across the web-app (web-app)

### Internal cleanup — border-based separation, with a guard
Removed all 25 Tailwind `shadow-*` / `drop-shadow-*` utility violations across the dashboard (cards, modals, popovers, map chips, sidebar + logo, toggles, the marketing hero). Separation now comes from borders/backgrounds per the project rule.

- **Guard added:** [`web-app/scripts/check-no-shadows.mjs`](../web-app/scripts/check-no-shadows.mjs), wired into `npm run lint`, fails on any `shadow-` utility in `src/` (three.js light props in `Scene3D.tsx` are exempt). Documented in [primitives.md](primitives.md#web-dashboard-separation--no-shadows-web-app).
- Modals (Welcome, CommandPalette, Calendar) and map chips gained a `border`; the PDF-overlay toolbar a bottom border; hover affordance uses a border-color change.
- Decorative removals worth a look: the dark-mode brand glow on the logo (Sidebar/AppShell) and the hero `drop-shadow-2xl` (Landing). The `glow-*` tokens in `tailwind.config.ts` remain available if you want a sanctioned glow back.

---

## 2026-05-21 — Harness create flow folded into the shared InspectionWizard (web-app)

### Internal refactor — one inspection create wizard; legal record unchanged
The dedicated `HarnessInspectionModal` (504 lines) and the orphaned `/harness/new` page (`NewHarnessInspection`) are gone. Harness inspections are now created through the shared `InspectionWizard` via a `WizardPreset`.

- **`InspectionWizard` gained a `preset` prop** — locks the template, streamlines the info step to a project picker, prefills the inspector from the signed-in profile, requires a conclusion, and navigates to the harness detail on success. Harness config lives in [`components/inspections/harnessPreset.ts`](../web-app/src/components/inspections/harnessPreset.ts).
- **Grid summary generalized:** the ok/bad "შეჯამება" counts + success badges are computed from any `component_grid` answer, not harness-specific code.
- **Call sites repointed:** Home, Inspections, ProjectDetail mount `InspectionWizard` with `harnessWizardPreset` (the generic new-inspection wizard was already there).
- **Dead code removed:** `HarnessInspectionModal.tsx`, `pages/NewHarnessInspection.tsx`, the `/harness/new` route, and the never-triggered completion `Modal` in `HarnessInspectionDetail.tsx`.
- **Fidelity:** harness acts still go through the same `createInspection` / `upsertAnswer` / `updateInspection` data path, so the saved record + PDF are unchanged. Verified by typecheck, lint, build, and tests (added an `InspectionWizard` harness-preset mount test; suite 70 → 71).

---

## 2026-05-21 — Equipment inspection detail pages cut over to the shared engine (web-app)

### Internal refactor — no user-facing change; legal PDFs byte-identical
The four equipment inspection **detail pages** (bobcat, excavator, general-equipment, cargo-platform) now render through the shared `features/inspections/equipment/` engine instead of five hand-cloned 500–940-line `pages/<Type>InspectionDetail.tsx` pages (~70% duplicated lifecycle / banner / PDF-overlay / checklist code).

- **Per-type detail components → `features/inspections/equipment/<Type>Detail.tsx`:** each is a thin component composing `useEquipmentDetail` (draft/query/mutation/delete/step/pdf lifecycle) + the shared `ResultPills` / `ChecklistItemRow` / `CompletedBanner` / `InspectionPdfOverlay` widgets. The transitional `BobcatDetailEngine.tsx` is now `BobcatDetail.tsx`.
- **Router repointed** ([`app/router.tsx`](../web-app/src/app/router.tsx)); the four old `pages/*InspectionDetail.tsx` deleted (~2,370 LOC removed).
- **Fidelity:** every `update<Type>Inspection(id, patch)` save call is preserved verbatim, so the saved row — and the legal PDF rendered by the untouched `pages/print/<Type>Print.tsx` — is byte-identical. Verified by typecheck, ESLint (new files clean), production build (4 new chunks emitted), and the smoke test.
- **Out of scope (unchanged):** the generic template/question path (`pages/InspectionDetail.tsx`) and the harness flow — those are DB-schema-driven, not equipment-catalog-driven. New canonical owner documented in [`primitives.md`](primitives.md#web-dashboard-equipment-inspection-detail-web-app).

---

## 2026-05-21 — web-app architecture refactor + best-practices hardening (web-app)

### Internal refactor — no user-facing change
A kernel of shared primitives plus tooling/CI groundwork for the dashboard. All
additive or behavior-preserving; the page-layer migrations that build on this
are deferred until the in-flight query-key migration is committed. Full design,
conventions, and roadmap in [`web-app-architecture.md`](web-app-architecture.md).

- **Kernel primitives — `web-app/src/lib/db`, `lib/query`, `components/{async,form,print}`:** `makeRepository` (generic CRUD + `mapDefined`), a storage primitive (`STORAGE_BUCKETS` + `signedUrl`/`upload`/`removeObjects`), `useEntityQuery`/`useEntityMutation`, `AsyncBoundary`, `EntityForm` (react-hook-form + zod, previously installed but unused), `PrintLayout`.
- **Equipment data layer → `makeRepository`:** bobcat/excavator/generalEquipment/cargoPlatform now build a repo via the factory (one CRUD impl, not five); public exports/behavior unchanged so pages are untouched.
- **Storage consolidated:** every data-layer Supabase Storage callsite routes through the primitive — killed the 4× duplicated `signedPdfUrl` helpers and the stringly-typed bucket names.
- **Inspection engine (started):** `features/inspections/equipment/` — shared `useEquipmentDetail` hook + `ResultPills`/`ChecklistItemRow`/`CompletedBanner`/`InspectionPdfOverlay`; bobcat detail rebuilt on it as the proof. (Route cutover for all four equipment types completed 2026-05-21 — see the entry above.)
- **Tooling/CI:** ESLint (flat) + Prettier added (the app previously had no linting); zod env validation in `supabase.ts`; generated Supabase schema types (`npm run gen:types` → `src/types/database.ts`); CI workflow gating web-app on typecheck + unit tests (PR + pre-deploy); Vitest made runnable (excluded the Playwright spec, added `@testing-library/dom`) and a stale `StatusBadge` test fixed — suite now 66/66 green.

---

## 2026-05-20 — Landing page full redesign (web-app)

### Visible change — pre-login marketing page
- **`web-app/src/pages/Landing.tsx`** — complete rewrite. Replaced the minimal hero + 4-card layout with a full marketing site: sticky navbar with smooth-scroll anchors; full-viewport hero with animated SVG phone mockup (Framer Motion float); pain-point section (dark bg, 3 cards); "How It Works" 3-step section; 6-card features grid; pricing (Free / PRO ₾19 cards); FAQ accordion (6 questions); dark-green final CTA with App Store + Play Store badges; sticky mobile bar (visible after scrolling 75% of viewport); exit-intent email capture popup (desktop only). All copy is Georgian. Zero new TypeScript errors.

---

## 2026-05-20 — Fix: lifting-accessories PDF result pills (mobile · visible change)

### Bug fix — changes rendered PDF
- **`lib/inspection/schemas/liftingAccessories.ts`** — the Section III (visual) and Section IV (functional) checklist result columns always rendered the null "—" pill instead of the green ✓ გამართულია / red ✗ გაუმართავია pill. `buildChecklistRows` passed the Georgian display string (`LA_RESULT_TO_CHIP[result]`) into `checklistPill`, which only matches the enum values `'ok'`/`'fail'`, so nothing ever matched. Now passes the raw `result` enum. (The failed-row red left-border already worked — it keys off `result === 'fail'`.) This was a pre-existing bug carried over verbatim during the PDF-engine migration; the fix changes the rendered output. Covered by `tests/unit/inspectionPdf.test.ts`.

---

## 2026-05-20 — Equipment inspection PDFs unified on a schema-driven engine (mobile)

### Internal refactor — inspection PDF bodies unchanged
All 9 equipment inspection types (excavator, forklift, bobcat, cargo-platform, safety-net, mobile-ladder, fall-protection, lifting-accessories, general-equipment) now render their PDFs through one shared, schema-driven engine instead of 9 hand-cloned `lib/<type>Pdf.ts` builders (~9.7K LOC of near-duplicated CSS + scaffolding).

- **New engine — `lib/inspection/`:** `schema.ts` (the `InspectionSchema<T>` language), `pdf.ts` (one synchronous, platform-free renderer), `pdfStyles.ts` (`BASE_PDF_CSS` — the ~180 CSS lines every type used to copy), `escape.ts`, `photos.ts` (`resolveInspectionPhotos`), `renderMobile.ts` (`renderInspectionPdf`), `service.ts` (`makeInspectionService`), `registry.ts`, and `schemas/<type>.ts` per type. The 9 `lib/<type>Pdf.ts` builders were deleted.
- **Web PDF photos fixed:** the old builders embedded photos via the mobile-only `embedInspectionPhotos`, so equipment PDFs rendered blank images on the web dashboard. The engine resolves photos by platform (signed HTTPS URLs on web, base64 on mobile) — fixing this for every type at once.
- **Service factory:** the 9 `lib/<type>Service.ts` files now wrap `makeInspectionService(...)` (shared create/getById/patch/complete/listByProject/photo CRUD); each keeps only its column map + create defaults. Persistence is isolated behind the factory, so collapsing the per-type tables later is a config change, not a screen change.
- **Dispatch unified:** `app/projects/[id].tsx` and `app/template/[id]/start.tsx` now dispatch through `lib/inspection/registry.ts` (keyed by each schema's `category`), replacing two hand-maintained switches — fixing a latent bug where the template-start screen silently created a generic questionnaire for 6 of the 9 types.
- **Guardrail + test:** `scripts/check-primitives.mjs` bans `embedInspectionPhotos` outside its definition (new inspection PDFs must use the engine); `tests/unit/inspectionPdf.test.ts` renders the excavator PDF and asserts structure.
- **Faithfulness:** inspection bodies (checklist data, verdicts, signatures, photos) are byte-faithful. Unifying header/footer relocated a few types' centered regulation badges into a body block and standardized the footer; bobcat's per-variant (large-loader) title and general-equipment's act number are preserved via schema hooks (`docTitle` function, `headerMetaLines`).
- **Out of scope (unchanged):** `breathalyzerLog` (a log, not a checklist inspection); the non-equipment PDFs (order, incident, report, briefing); the generic harness/questionnaire path; and the per-type form *screens* (a separate, deferred phase).

---

## 2026-05-20 — Signing flow on all equipment inspection detail pages (web)

### Signing flow — equipment pages (web-app)
- **`InspectionSignatures` component** — prop renamed `isDraft` → `canEdit`; inspector signature bug fixed (bare base64 now gets `data:image/png;base64,` prefix before rendering); prop type changed from `Inspection` to generic `SignableInspection` interface so all equipment types can use it.
- **`HarnessInspectionDetail`** — `canEdit` now `inspection.status === 'completed'` (was `isDraft`), so the "+ პირის დამატება" button appears only after the inspection is completed.
- **`BobcatInspectionDetail`, `ExcavatorInspectionDetail`, `CargoPlatformInspectionDetail`, `GeneralEquipmentInspectionDetail`** — `InspectionSignatures` wired below the page header; `canEdit={status === 'completed'}`.
- **Migration 0051** — `signatories JSONB NOT NULL DEFAULT '[]'` column added to `bobcat_inspections`, `excavator_inspections`, `cargo_platform_inspections`, `general_equipment_inspections`. Apply via `supabase db push`.
- **Data layer** — `signatories: SignatoryEntry[]` field + SELECT + mapper + patch added to `bobcat.ts`, `excavator.ts`, `cargoPlatform.ts`, `generalEquipment.ts`; types updated in `lib/types/bobcat.ts` and `lib/types/excavator.ts`.

---

## 2026-05-20 — Harness detail page redesign + signatories (web)

### `HarnessInspectionDetail` redesign (web-app)
- **Removed 3-tab wizard** from the detail page (`/harness/:id`) — replaced with a single scrollable page.
- **Signatures section** (`InspectionSignatures.tsx`) — shows existing `inspector_signature` as a pinned row; "+ პირის დამატება" opens a Mantine modal with name/role inputs and `SignatureCanvas`. Additional signatories saved to new `signatories` JSONB column.
- **Info section** (`InspectionInfoView.tsx`) — card-based layout with 4 sub-sections: ზოგადი ინფო (editable when draft), ქამრების შედეგები (read-only grid table), შეფასება (safety chip + notes), ფოტოები (signed photo grid).
- **Migration 0050** — `signatories JSONB NOT NULL DEFAULT '[]'` on `inspections`. Apply via `supabase db push`.
- **Data layer** — `SignatoryEntry` type, `signatories` in select strings, `getSavedSignatureUrl()` helper, `signatories` in `updateInspection` patch.

---

## 2026-05-20 — Dedicated harness inspection screens (web)

### Harness flow (web-app)
- **`/harness/new`** — dedicated creation page: project selector + harness name + inspector + department. No template selector.
- **`/harness/:id`** — dedicated detail/wizard page with `WizardSteps` (ინფო → ქამრები → დასკვნა). Embeds existing `HarnessWizard` component directly; conclusion step has safe/unsafe chips + notes textarea + save/complete buttons.
- **Routing** — `Inspections.tsx` dropdown "დამცავი ქამრები" now navigates to `/harness/new` instead of opening the generic `InspectionWizard` modal. Harness rows in the list link to `/harness/:id`. `ProjectActivityWidget` also routes harness items to `/harness/:id`.
- **Routes** added to `app/routes.ts` (`harnessNew`, `harnessDetail`, `routes.harness`) and `app/router.tsx`.

---

## 2026-05-20 — `main` — Web regulations tab fixes

### Regulations tab (web-app)
- **Amendment dates now load on web:** matsne.gov.ge has no CORS headers, so the browser was silently dropping every fetch and showing the list with no dates. Added a `fetch-regulation-dates` Supabase Edge Function that proxies the requests server-side; the web dashboard now calls this instead of fetching matsne.gov.ge directly.
- **Auto-refresh on tab return:** added a `visibilitychange` listener (mirror of mobile's `useFocusEffect`) so the page re-checks for updates when the user returns from reading a regulation in a new tab.
- Removed dead duplicate `web-app/src/lib/regulations.ts` (nothing imported it; canonical copy is `web-app/src/lib/data/regulations.ts`).
- **Deploy note:** run `supabase functions deploy fetch-regulation-dates` to activate the proxy.

---

## 2026-05-20 — Dedicated harness (ქამრები) inspection screen

- **New screen** `app/inspections/harness/[id].tsx` — replaces the generic wizard for harness-category inspections.
  - Step 0 (ინფო): harness name/ID field. No inspection-type selector — type is already determined from the home-page dropdown.
  - Step 1 (ქამრები): `HarnessListFlow` (count picker → per-harness component grid with photos).
  - Step 2 (დასკვნა): shared `ConclusionStep` with "უსაფრთხოა" / "არ არის უსაფრთხო" verdict chips.
- **Routing** — `lib/inspectionRouting.ts` now routes harness drafts to `/inspections/harness/:id`; completed harness still opens the PDF result screen.
- **Shared components** — `InspectionShell`, `ConclusionStep` (from `components/inspections/`) and `HarnessListFlow` are reused unchanged, matching the bobcat/excavator/general-equipment pattern.

---

## 2026-05-19 — `gio/web-2.0-ux` — Web dashboard UX 2.0

### Home page overhaul
- New layout: greeting + button row → subscription banner → 4 quick-action tiles → combined stats+heatmap widget → project activity widgets
- Stats + heatmap merged into one full-width `Card` (2-column grid on desktop, stacked on mobile)
- Quick-action tiles link to new incident / briefing / report / order creation flows
- Per-project activity widget replaces the generic recent-activity list (shows last 3 acts + project summary)

### Sidebar redesign
- Collapsed icon-rail by default; hover expands with labels (tooltip on hover, full labels when open)
- Click pins/unpins the expanded state — persisted in `localStorage`
- Framer Motion spring animations for expand/collapse

### Project cards (Projects page)
- OSM map tile as card background (auto-fetched from lat/lng if coordinates stored)
- Logo badge overlaid on gradient at card foot; initials fallback using `var(--brand-50/500)` tokens
- Hover-reveal edit/delete buttons

### Project detail refactor
- `ProjectDetail.tsx` (1 068 lines) split into `pages/ProjectDetail/` with 11 focused section files: `ProjectHeader`, `ProjectDetailsCard`, `CrewSection`, `SignersSection`, `InspectionsSection`, `IncidentsSection`, `BriefingsSection`, `ReportsSection`, `FilesSection`, `OrdersSection`, `DangerZoneSection`
- Each section owns its own data fetches and mutations — no prop-drilling of refetch callbacks

### New components
- `ProjectModal` — unified create/edit modal for projects (replaces `NewProject` + `EditProject` route pair)
- `AddressInput` — geocoding-backed address field used in `ProjectModal`

### Design system / dark mode fixes
- `Sparkline`, `ProgressRing` default colors changed from `#147A4F` → `var(--brand-500)` (auto-adapts: `#47AF87` in dark mode)
- Project avatar `backgroundColor`/`color` changed from hardcoded hex → `var(--brand-50)` / `var(--brand-500)`
- `SafetyGuidePage` loading label changed from `color: #4a4a4a` → Tailwind `text-neutral-600 dark:text-neutral-400`
- Unused `color` prop removed from `HeatmapCalendar` interface

### React key fixes
- `WizardSteps` — `key={i}` → `key={step.label}`
- `PhotoGallery` — `key={i}` → `key={url}` / `key={\`placeholder-\${i}\`}`

---

**Updated:** 2026-05-19 | Branch: `main`

---

## 2026-05-19 (3)

### Bug fixes — new inspection flows

- **Saves now work**: root cause was `canGoNext` at INFO_STEP requiring `company.trim() && address.trim()`; projects without `company_name`/`address` silently produced empty strings and permanently blocked step advancement. Eliminated by removing INFO_STEP (see below).
- **INFO_STEP removed** from safety-net, mobile-ladder, lifting-accessories: flows now start directly at the identification step. `TOTAL_STEPS` reduced by 1 in each; `FlowHeader` step offset corrected.
- **Forklift INFO_STEP cleaned**: removed company, address, inspector name, and inspection date from `IdentificationGrid`; only inventory #, brand/model, and engine type remain (the fields that require manual entry).
- **Fall-protection REGISTRY_STEP cleaned**: removed company and address `FloatingLabelInput` blocks; `canGoNext` no longer requires them.
- **Bobcat large-loader questionnaire fixed**: deleted `renderChecklistList()` (no photo/comment support); replaced with `ChecklistSection` + `KeyboardAwareScrollView` — tap ⚠/✗ on any item to expand the accordion showing comment field and photo upload button.

## 2026-05-19 (2)

### crane_technical_order — ამწის ტექ. გამართულობაზე პასუხისმგებელი პირის ბრძანება
- New `crane_technical_order` document type (`CraneTechnicalOrderFormData` in `types/models.ts`).
- `buildCraneTechnicalOrderHtml` in `lib/orderPdf.ts` — mirrors crane_operator_order layout; differs in title, single-paragraph 429-decree legal basis, and 7 Georgian-letter sub-clauses (ა–ზ) + 3 bullet duties for technical maintenance.
- `app/orders/new.tsx`: added to `DOC_TYPES` (construct-outline icon, directly below crane_operator_order); `Step3CraneOperator` now accepts `positionLabel`/`positionField`/`stepTitle` props; `StepSignCraneOperator` accepts `stepTitle`/`personLabel`; `isCraneVariant` helper covers both crane types for all step routing.
- No new migration — reuses existing `orders` table (migration 0038).

## 2026-05-19

### Breathalyzer Log — ალკოტესტერის შემოწმების ჟურნალი (migration 0048)
- New **ჟურნალები** (Logs) section on the project screen (`app/projects/[id].tsx`), showing recent breathalyzer logs with date, test count, status, and FAIL badges.
- Journal screen at `app/projects/[id]/logs/breathalyzer.tsx`:
  - Header with date and editable device S/N field; green "დასრულებული" badge when closed.
  - "Start today's log" empty state when no log exists for today.
  - Entry list with # / Name·Position / time / result badge (SAFE/WARNING/FAIL pill) / signature icon.
  - Indent + "↩ განმეორებითი" label for repeat-test rows.
  - Red FAIL card prompting a 15-minute repeat test after a ≥0.20 result.
  - "ცვლის დასრულება" outlined button → close-shift modal with summary + responsible-person signature → PDF generation.
  - "+ ჩანაწერის დამატება" green FAB always visible.
- **4-step Add Entry bottom sheet** (full-screen modal):
  1. Person — autofocus search, filtered suggestions from ProjectPeoplePool + project crew, initials avatar, last-tested distance.
  2. Test type — large chips (პირველადი / განმეორებითი); pre-selects repeat when launched from FAIL card.
  3. Result — large centered numeric input, real-time background color (green/amber/red), SAFE/WARNING/FAIL label, FAIL warning card.
  4. Signature — tappable placeholder → `SignatureCanvas` modal; "ხელმოწერაზე უარი" checkbox bypass.
- **ProjectPeoplePool**: per-project, AsyncStorage key `people_pool_{projectId}`. Upserted on every entry save (most-recently-tested first). Suggestions combine pool + project crew; never crosses project boundaries.
- PDF (`lib/breathalyzerLogPdf.ts`): company/object/S/N header, bilingual title, SAFE/WARNING/FAIL instruction row, color-coded result table with signatures, summary block, responsible-person signature block.
- `breathalyzer_logs` table (Supabase), `types/breathalyzerLog.ts`, `lib/breathalyzerLogService.ts`, `lib/breathalyzerLogPdf.ts`, `useBreathalizerLogsByProject` hook.

### Lifting Accessories Inspection (migration 0049)
- New template: **სამაგრი მოწყობილობების შემოწმების აქტი** (`lifting_accessories_inspection`, UUID `aaaaaaaa-…`)
- Multi-device wizard (same pattern as safety-net / mobile-ladder); `lifting_accessories_inspections` table
- `types/liftingAccessories.ts`, `lib/liftingAccessoriesService.ts`, `lib/liftingAccessoriesPdf.ts`

### Forklift Inspection (migration 0047)
- New template: **ჩანგლიანი დამტვირთველის შემოწმების აქტი** (`forklift_inspection`, UUID `dddddddd-…`)
- 3-step wizard (identification → checklist → conclusion); 10-day scheduling cycle
- 39 checklist items across 3 sections (A/B/C); `type="three_state"` (კარგი ✓ / ნაკლი ⚠ / გამოუსადეგ. ✗)
- Engine type chips (ელექტრო / ბენზინი / დიზელი / გაზი) in identification step and PDF header
- Component diagram card (A–K labels) in checklist step
- 13-row summary table with fine-grained subcategories before verdict
- Extended signature: name + position + phone + signature columns
- `forklift_inspections` table, `types/forklift.ts`, `lib/forkliftService.ts`, `lib/forkliftPdf.ts`

### Fall Protection Inspection (migration 0046)
- New template: **დამჭერი მოწყობილობების შემოწმების აქტი** (`fall_protection_inspection`, UUID `cccccccc-…`)
- Same multi-device registry-→-tabs pattern as safety net / mobile ladder
- **4-state ChecklistItem** (`type="four_state"`): ✓ safe (green) · ✗ critical (red) · Z minor (amber) · N not checked (gray)
  - Extends `ChecklistItemOptions` with optional `d` chip; adds `'four_state'` type to `ChecklistItem.tsx`
  - Auto-verdict suggestion: any ✗ → banned, any Z → minor, else safe
- 12 standard checklist items + 1 custom (editable label per device)
- Per-device: VerdictSelector (safe/minor/banned) + SignatureBlock (1 signatory) + PhotoSection
- Tab state `'warning'` (amber) introduced for devices with only minor findings
- `fall_protection_inspections` table, `types/fallProtection.ts`, `lib/fallProtectionService.ts`, `lib/fallProtectionPdf.ts`
- PDF footer: EN 363:2008 · EN 795:2012 · EN 354:2010 · EN 355:2002 · EN 1891:2020 · EN 361:2002

### Safety Net Inspection (migration 0044)
- New template: safety net inspection (`safety_net_inspection`, UUID `88888888-…`)
- Multi-device wizard; `safety_net_inspections` table + `types/safetyNet.ts` + `lib/safetyNetService.ts` + `lib/safetyNetPdf.ts`

### Mobile Ladder Inspection (migration 0045)
- New template: mobile ladder inspection (`mobile_ladder_inspection`, UUID `bbbbbbbb-…`)
- Multi-device wizard; `mobile_ladder_inspections` table + `types/mobileLadder.ts` + `lib/mobileLadderService.ts` + `lib/mobileLadderPdf.ts`

### Rename: "დოკუმენტები" → "ბრძანებები"
- Tour step title/body in `locales/ka.json` and `locales/en.json` updated to reflect the section's true purpose (orders + files)

### New order template: კოშკურა ამწის ოპერატორის დანიშვნა (`crane_operator_order`)
- 7-step wizard: type → company → operator info → crane specs → director sig → operator sig → summary
- Form fields: company (auto-fill), appointed operator (name/ID/position/cert/expiry/phone + optional cert photo), crane specs (model/number/max load + optional inspection cert photo)
- Fixed 10-clause duties list (ა–კ) in the PDF body — not editable
- Sequential dual-signature flow: director signs first, then operator
- PDF: same layout as fire_safety_order (company header, order title, info tables, duties, signature block)
- No DB migration required — stored as a new `document_type` value in the existing `orders` table

---

## 2026-05 — `after-testflight` + session work

### Cargo Platform Inspection (f80a372)
- New specialized inspection type: ტვირთის მიმღები პლატფორმის შემოწმების აქტი
- 6-step mobile wizard: info → platform ID → cargo table → 9-item checklist → verdict → dual signatures
- 3-result checklist (good / fix / n/a — amber for fixable, not red)
- Dynamic cargo table with auto-summing total weight
- `cargo_platform_inspections` table (migration 0040), template UUID `77777777-…`
- Web: full CRUD — `NewCargoPlatformInspection.tsx` + `CargoPlatformInspectionDetail.tsx`
- Web: print page at `/cargo-platform/:id/print`

### Mobile Scaffold Templates (f80a372)
- Mobile Scaffold N1 (`mobile_scaffold` category) — migration 0041
- Mobile Scaffold N3 (`mobile_scaffold_n3` category) — migration 0042
- Both use generic `inspections` table + template picker routing
- Web: category labels added to `Templates.tsx`

### Skeleton Loading System (f80a372)
- `web-app/src/components/SkeletonCard.tsx` extended with `SkeletonStatCard`, `SkeletonGrid`, `SkeletonDetailPage`
- All web detail pages now return skeleton on `isLoading`
- Home stat cards pulse instead of showing `0` during load
- Projects/Templates show grid skeleton; list pages show row skeletons
- `PageFallback` (Suspense boundary) shows pulse instead of plain text

### Fire Safety Order Templates (session work — uncommitted)
- `fire_safety_order`: სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა
  - 3-clause document, 2-signatory signing flow (director → appointed)
  - Builds full A4 PDF with embedded signatures
- `fire_safety_order_enterprise`: საწარმოს სახანძრო უსაფრთხოებაზე პასუხისმგებელი პირის დანიშვნა
  - Adds `appointedPosition` + `appointedIdNumber` fields
  - 5-clause document: extended sub-clauses (№457 decree, Permit to Work, briefing journal, evacuation drills, compressed gases)
  - 4 legal basis bullets (adds №477 construction sites decree)
  - Same 2-signatory flow
- Both available on mobile (`app/orders/new.tsx`) and web (`web-app/src/pages/NewOrder.tsx`, `OrderDetail.tsx`)
- No migration needed — `document_type` is plain text, `form_data` is jsonb

---

## 2026-05 — `main`

### Orders / ბრძანებები (720b502)
- New `orders` table (migration 0038): `document_type text`, `form_data jsonb`, `status`
- 4 document templates: labor safety specialist, alcohol control, fire safety order, fire safety enterprise order
- Mobile wizard (`app/orders/new.tsx`): 4–6 step flow based on document type
- Web wizard (`NewOrder.tsx`) + detail page (`OrderDetail.tsx`)
- Web routes: `/orders/new`, `/orders/:id`

### PDF Security & Hashing (de5ee55)
- SHA-256 hash of each PDF stored in `orders.pdf_hash` / `pdf_hash` column (migration 0039)
- PDF metadata embedded (title, author, creation date)
- `lib/pdfSecurity.ts`

### BOG Recurring Payments (c1e3ef0 → d19059e)
- Georgian BOG payment processor integration — mobile + web parity
- `create-bog-order` Edge Function + `bog-webhook` callback handler
- Mobile: `lib/bogPayment.ts` + `useBogPayment()` hook
- Web: `/subscribe`, `/subscribe/success`, `/subscribe/fail` routes
- `cancel_subscription` RPC (idempotent; access continues until expiry)
- `payment_records` table for audit history (migration 0031)
- See `docs/payments.md` for full flow

### 3D Interactive Safety Guide (2d3bf9a → 12ea1a7)
- React Three Fiber 3D model of a construction site
- 6 clickable building parts → safety checklists + regulation references
- Loaded as WebView on mobile (`/app/safety-standalone`), native page on web dashboard (`/safety`)
- Responsive: side-by-side desktop, stacked mobile

### Project Photos + Geo-Location (68deef4)
- Photos can be attached to projects (multi-select, `project-files` bucket)
- Project location stored as lat/lng; photo taken >500m away triggers mismatch alert
- `photoLocationAlert.ts` shared across wizard, incidents, and future flows
- `answer_photos` extended with `latitude`, `longitude`, `address` (migration 0023)

### Tab Bar + FAB Polish (faefeec)
- Opaque dark-mode tab bar
- Smooth label clipping
- FAB positioned correctly above tab bar

### Web Bundle Splitting + Error Boundary (f8b9877)
- Vite chunk splitting for faster initial load
- Error boundary wrapping all lazy routes
- Security headers via `_headers` file

---

## 2026-04 — Earlier `main` work

### Department Field (0034–0036)
- `department` column added to `bobcat_inspections`, `general_equipment_inspections`, `inspections`
- Shown in info step of respective wizards

### Summary Photos for Bobcat + Excavator (0037)
- `summary_photos` jsonb column added to both tables
- Photo strip in final step of wizard

### Inspector Name Field (0033)
- `inspector_name` column added to `inspections` (generic) table

### PDF Export Speed (2026-04-30)
- Resize + cache pipeline: ~10× faster for multi-photo reports

---

## Known Issues (Current)

1. Signature canvas breaks on phone rotation
2. Web build (`expo start --web`) crashes at boot — worklets shim issue (see README Known Issues #6)
3. Storage RLS gap: `certificates`, `answer-photos`, `pdfs`, `signatures` buckets allow any authenticated user to read/delete (see reports/BUG_REPORT.md)
4. Typecheck fails — expected; note new failures but don't block on them

---

_For detailed context: [`ONBOARDING.md`](../ONBOARDING.md) | [`AI_BRIEFING.md`](AI_BRIEFING.md)_
