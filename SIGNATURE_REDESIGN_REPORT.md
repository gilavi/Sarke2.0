# Signature Redesign — Session Report (2026-05-26)

Local-only redesign of the inspection signature flow. Scope confirmed up front: **inspections only**. Out-of-scope flows left unchanged: project-signer witnesses, tokenized remote signing (`web/` sarke-sign + the SMS Edge Function), order signatures, and the incident/briefing reusable expert signature.

Branch state: 14 commits ahead of the pre-session tag `pre-signature-redesign`. **No push performed.** The Phase 2 destructive SQL migration is committed but not executed — the user reviews and applies it manually.

## Per-phase summary

### Phase 1 — Discovery audit
- `765f364 docs: audit current signature implementation and persistence`

Produced [SIGNATURE_AUDIT.md](SIGNATURE_AUDIT.md): every file, table, column, bucket, and AsyncStorage key the inspection signature surface reached, categorized by capture UI / per-screen wiring / PDF rendering / state-storage / out-of-scope reuse. Flagged six categories of persistence violations to remove or migrate (DB columns/tables, storage objects, AsyncStorage prefixes).

### Phase 2 — Persistence cleanup migration
- `6c4cd00 fix(signatures): migration to remove persisted inspection signatures`

Wrote [`supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql`](supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql). Destructive — drops the `signatures` table + `signature_status` enum, four `inspector_signature` columns, five `signatories` JSONB columns + the older `cargo_platform_inspections.signatures` JSONB, and storage objects in the `signatures` bucket whose first path segment is not `expert` or `project`. Multi-device per-row signature stripping inside JSONB columns is left as commented opt-in SQL. **Apply manually.**

### Phase 3 — features/signatures module
- `1312adb feat(signatures): scaffold features/signatures module with types and state hook`
- `5f2d3d6 feat(signatures): SignatureCanvasModal with no-persistence guarantee`
- `654856d feat(signatures): SignaturesScreen + CreatorSignatureCard + AdditionalRowCard`
- `09c83a2 docs(signatures): AGENTS.md for the new module`

New module at [features/signatures/](features/signatures/). 9 files (types, hook, screen, two cards, canvas modal, styles, index, AGENTS). Public API: `SignaturesScreen`, `useSignaturesState`, `SignaturesState`, `SignatureData`, `AdditionalSignatureRow`, plus the cross-screen session-store helpers (added later in Phase 4). Component files all under the 200-line budget after the styles split.

### Phase 4 — Wire SignaturesScreen into the wizard
- `e2bccc7 feat(wizard): wire SignaturesScreen into last step; remove gating from Generate PDF`

Added the in-memory cross-screen session store at [`features/signatures/sessionStore.ts`](features/signatures/sessionStore.ts) (RAM only, no disk persistence). Instantiated `useSignaturesState` in `InspectionWizard.tsx`; mounted `SignaturesScreen` as a full-screen Modal at the wizard scope; new "ხელმოწერები" section in `ConclusionStep` with a status row ([SignaturesEntryRow.tsx](features/inspection-wizard/SignaturesEntryRow.tsx)) that opens the modal. The wizard's finish handler stashes the captured snapshot into the session store before navigating to the result screen. Generate-PDF is not gated by signature state.

### Phase 5 — Remove old per-type signature implementations
- `4c7dd39 refactor(signatures): delete unused lib/localSignatures.ts`
- `0a1176a refactor(inspections): remove signature plumbing from result screens`
- `b33b77e refactor(signatures): delete orphan signature components and services`
- `d9a3ea1 refactor(inspections): drop dead signature handler callbacks`

Stripped the signatures button + props from `InspectionResultView`. Cleaned the 9 equipment screens + generic `app/inspections/[id].tsx`: dropped `SignatureSheet` imports, `renderSignaturesSheet` prop blocks, the generic screen's `EphemeralSignatureSheet` + `signatoriesToRecords`, signatures button + count badge, and per-screen `handleSign` / `handleSignChange` / `handleSignerChange` / `handleSignatoryChange` / `handleSignatorySign` callbacks. Deleted `components/SignaturesActionSheet.tsx`, `components/inspection-parts/SignatureSheet.tsx`, `components/inspection-parts/SignatureBlock.tsx`, `lib/services/{real,mock}/signatures.ts`, `lib/localSignatures.ts`. Removed `signaturesApi` re-exports across the services dispatcher + aggregators, the `useSignatures` query hook, the `signatures: SignatureRecord[]` field + seed in the mock store, and the orphan delete in `lib/services/mock/inspections.ts`.

### Phase 6 — PDF signatures section
- `e02ede5 feat(pdf): render new signatures section with captured + empty hand-sign slots`
- `746ec50 feat(pdf): equipment-engine signatures section (single hook)`

Two PDF pipelines updated. Generic template ([lib/pdf/inspection/template.ts](lib/pdf/inspection/template.ts)) drops the legacy `renderSignatures(SignatureRecord[])` for the new [`renderSignaturesSection`](lib/pdf/inspection/renderSignaturesSection.ts) reading a `SignaturesSectionData` snapshot. CSS rewritten in `template.css.ts` for the new layout (creator block: 100px signature image over a horizontal line + name + Georgian-formatted date; empty hand-sign slots with hairline separators). Equipment engine ([lib/inspection/pdf.ts](lib/inspection/pdf.ts) + the same `renderSignaturesSection`) wired through a single change in [`lib/inspection/useInspectionFlow.ts`](lib/inspection/useInspectionFlow.ts) so all 9 equipment types pick up the section without per-screen changes. `handlePdf` in both pipelines reads from `getSignaturesSession`, layers the creator's profile name, passes through, and calls `clearSignaturesSession` after a successful share.

Deferred: per-schema "Section V — პასუხისმგებელი პირი" blocks in the equipment schemas are part of the legal-document layout and were left in place — they now render as labeled blank slots (no UI populates them post-Phase-5). Migrating them out needs a formal-document review.

### Phase 7 — Documentation
- `50f625d docs: update for signatures redesign across README, CLAUDE, AI_BRIEFING, WHATS_NEW`

[docs/WHATS_NEW.md](docs/WHATS_NEW.md) prepended dated entry (Redesigned / New / Regulatory / Cleanup / Removed / Audit). [docs/AI_BRIEFING.md](docs/AI_BRIEFING.md) bumped + Signatures core-fact paragraph added. [CLAUDE.md](CLAUDE.md) gained a "do not persist captured inspection signature data" entry under Things to Avoid and a migration-range note covering the timestamp-prefixed naming. [README.md](README.md) lists `features/signatures/` and the new migration. [BUG_REPORT.md](BUG_REPORT.md) opened a P0 entry covering the audit findings — marked CODE FIXED, MIGRATION PENDING.

### Phase 8 — Final verification
- This file: `SIGNATURE_REDESIGN_REPORT.md`.

## Files added

- `SIGNATURE_AUDIT.md`, `SIGNATURE_REDESIGN_REPORT.md` (this file).
- `supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql`.
- `features/signatures/AGENTS.md`, `features/signatures/AdditionalRowCard.tsx`, `features/signatures/CreatorSignatureCard.tsx`, `features/signatures/SignatureCanvasModal.tsx`, `features/signatures/SignaturesScreen.tsx`, `features/signatures/SignaturesScreen.styles.ts`, `features/signatures/index.ts`, `features/signatures/sessionStore.ts`, `features/signatures/types.ts`, `features/signatures/useSignaturesState.ts`.
- `features/inspection-wizard/SignaturesEntryRow.tsx`.
- `lib/pdf/inspection/renderSignaturesSection.ts`.

## Files removed

- `components/SignaturesActionSheet.tsx`, `components/inspection-parts/SignatureSheet.tsx`, `components/inspection-parts/SignatureBlock.tsx`.
- `lib/services/real/signatures.ts`, `lib/services/mock/signatures.ts`.
- `lib/localSignatures.ts`, `lib/pdf/inspection/renderSignatures.ts`.

## Inspection types touched

All 10 inspection paths (the 9 equipment types plus the generic harness/scaffold flow): bobcat, excavator, general-equipment, cargo-platform, safety-net, mobile-ladder, forklift, fall-protection, lifting-accessories, generic. Each was edited to drop the old `SignatureSheet`/`renderSignaturesSheet` plumbing and (where present) the dead signature handler callbacks. The generic screen also lost its in-line `EphemeralSignatureSheet` + bottom-bar signatures button.

## No-save rule audit — passed

- `git grep -i "signature" -- 'app/' 'features/' 'components/' 'lib/'` returns hits only in the canonical modules (`features/signatures/`, `lib/pdf/inspection/`, `lib/inspection/`) and the explicitly out-of-scope flows (`app/_layout.tsx` flushPendingSignatures for the shared retry queue, `app/briefings/*` briefing signing, `app/incidents/*` saved expert signature embedding). No orphan inspection-signature paths remain.
- `git grep "AsyncStorage\|SecureStore\|MMKV\|writeAsync" -- 'features/signatures/' 'lib/pdf/'` returns only comment lines forbidding persistence — no actual calls.
- `npm run lint` clean (tsc --noEmit + scripts/check-primitives.mjs).
- `npm run test:unit` — 61 / 61 passing.
- `npm run test:integration` — 30 / 30 passing.

## Manual verification steps (user)

1. Open any inspection type, walk to the final wizard step, tap the ხელმოწერები row → modal opens; empty state shows the user's name placeholder and "ხელმოწერისთვის შეეხეთ".
2. Tap the creator card → canvas opens → draw → tap შენახვა → returns to the screen → card flips to the captured state (signature + name + Georgian date + შეცვლა button).
3. Tap `+ ხაზის დამატება` three times → three numbered ხაზი #1 / #2 / #3 cards appear with non-interactive placeholder labels for ხელმოწერა / სახელი / თარიღი and an × in each top-right corner.
4. Tap the × on ხაზი #2 → remaining cards renumber to #1 and #2.
5. Tap დასრულება → result screen → tap გადმოწერა → PDF includes the captured signature at the top of the section (image + name + date), then two labeled empty slots below.
6. Generate a second PDF without re-signing → since `clearSignaturesSession` ran after step 5, the section is empty and is omitted entirely from the PDF.
7. Walk through each of the 9 equipment types and confirm the same end-to-end flow on the wizard, and that their PDFs include the new section at the bottom (the per-schema "Section V" legal block remains above it — see the deferred note in Phase 6).
8. Verify in Supabase: zero new objects in the `signatures` bucket from any of the above flows; the `inspections.inspector_signature`, `inspections.signatories`, equivalent equipment columns are untouched (or absent if the Phase 2 migration has been applied).

## Phase 2 migration — manual apply

The destructive SQL is at [`supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql`](supabase/migrations/20260526002032_remove_persisted_inspection_signatures.sql). Review, take a backup, then apply with `supabase db query --linked` or the Management API. Inspect step 5 (the commented JSONB-strip block) before opting in.

## Rollback

```sh
git reset --hard pre-signature-redesign
```

(The tag was created at the start of the session, before any of the 14 commits above.)
