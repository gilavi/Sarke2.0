# features/breathalyzer-log

## What this module does

The breathalyzer log (ალკოტესტის ჟურნალი) — the project "ჟურნალები" section. A
per-project, per-day alcohol-test register: start a log, add test readings through
a full-screen wizard, then close the shift with a responsible-person signature and
a generated PDF. Built to match the inspection flow's patterns (FlowHeader +
WizardStepTransition + canonical primitives), monochrome throughout.

## Public API

Exported from `index.ts`, consumed only by the thin route shells under
`app/projects/[id]/logs/breathalyzer/`:

- `BreathalyzerLogScreen({ projectId, logId? })` — `index.tsx`. Today's log, or a
  historical one when `logId` is set. Header + info bar + entry list + action bar.
- `AddEntryWizard({ projectId, logId, repeatForId? })` — `add.tsx`. The 4-step
  full-screen add-test wizard. `repeatForId` prefills a repeat test.
- `CloseShiftScreen({ projectId, logId })` — `close.tsx`. Summary + responsible
  person + signature → close + PDF.

## Internal files

- `useBreathalyzerEntry.ts` — add-entry state: form, step, people-pool suggestions,
  and the save mutation (append entry → upsert pool → invalidate the three log keys).
- `breathalyzerSchema.ts` — pure helpers: `parseResult`, `canAdvanceEntry`,
  `canSaveEntry`, `pendingRepeatEntry`, `todayISO`, `timeDisplay`, `initials`,
  `daysSince`, the `EntryForm` shape, and `ADD_ENTRY_STEP_KEYS`.
- `resultMeta.ts` — status → Lucide icon + i18n label keys (long + short). Keeps
  `types/breathalyzerLog.ts` free of UI concerns.
- `ResultStatus.tsx` — monochrome safe/warning/fail indicator (icon + optional
  reading + optional descriptive label). Reused by `EntryRow`, `ResultStep`, and
  the project-detail `BreathalyzerSection` (which uses the same icons).
- `EntryRow.tsx`, `SummaryStats.tsx` — list row + close-shift counts (monochrome).
- `steps/` — `PersonStep` (search + pool + name/position), `TestTypeStep`
  (StatusChip primary/repeat), `ResultStep` (numeric entry + monochrome status),
  `SignatureStep` (SignatureCanvas + refuse toggle).
- `styles.ts` — themed factory. Monochrome only; no hardcoded hex.

## Gotchas

- **Monochrome rule.** Result severity is carried by icon + label, never color
  (matches the inspection answer-control rule). There is intentionally no result
  color palette — `BL_RESULT_COLORS` was removed from `types/`. Don't reintroduce it
  in the UI. The PDF (`lib/breathalyzerLogPdf.ts`) keeps its own print colors.
- **Repeat banner is derived, not stored.** `pendingRepeatEntry(log)` returns the
  latest FAIL with no logged repeat; the log screen shows the "repeat required"
  banner from this. Survives reloads — there is no ephemeral post-save flag.
- **Two queries, one enabled.** `BreathalyzerLogScreen` calls both
  `useBreathalyzerLog(logId)` and `useBreathalyzerLogByDate(...)`; the inactive one
  is passed an undefined id so it stays disabled (no redundant fetch, no conditional
  hooks). Mutations invalidate `qk.breathalyzerLog.byProject` + `.byId` + `.byDate`.
- **Signatures persist here.** Unlike inspection result-screen signatures, the
  tested-person + responsible-person signatures are the legal record and are stored
  base64 in the `entries` / `responsible_person` JSONB (like order/incident
  signatures). The no-persist rule does NOT apply to this log.
- **People pool is AsyncStorage**, project-scoped, for autocomplete only
  (`peoplePoolApi`). Not React Query.

## Canonical helpers consumed

- UI: `Button`, `Screen` (`components/ui`), `FlowHeader`, `WizardStepTransition`,
  `StatusChip`, `FloatingLabelInput`, `ScreenHeader`, `SkeletonListCard`,
  `SignatureCanvas`.
- Keyboard: `KeyboardAwareScrollView` + `KeyboardStickyView`
  (`react-native-keyboard-controller`) — never `KeyboardAvoidingView`.
- Behaviour: `useSubmitGuard` (enabled button + on-press error reveal), `haptic.*`,
  `useToast`, `useTheme`.
- Data: `useBreathalyzerLog` / `useBreathalyzerLogByDate` / `useBreathalizerLogsByProject`
  + `qk.breathalyzerLog` (`lib/apiHooks`), `breathalyzerLogApi` + `peoplePoolApi`
  + `makeBLEntry` (`lib/breathalyzerLogService`), `buildBreathalizerLogPdfHtml`
  (`lib/breathalyzerLogPdf`), `generateAndSharePdf` (`lib/pdfOpen`).
