# document-details

## What this module does
The reusable **DocumentDetails** screen — what you reach by **tapping a saved
record** in a list (Home / History / Drafts / project sections). It is the
non-celebratory sibling of `components/success/FlowSuccessScreen`: a real top bar
with a back button, a tile + title + type + status pill (no check disc), a
visible **Edit · Duplicate · Delete** chip row, sticky scroll tabs, a read-only
Info list, a type-specific content slot, and the editable/view-only signature +
certificate lists. Footer = **Share PDF**.

One presentational shell, four `type`s (`act | incident | report | instruction`);
only the content body and which optional sections appear vary. Each route is a
thin data loader that resolves the props (same pattern as the FlowSuccessScreen
routes).

## Public API (from index.ts)
- `DocumentDetails` — the shell. Props in `types.ts` (`DocumentDetailsProps`):
  `type`, `tileIcon`, `title`, `typeLabel`, `status?`, `info[]`, `contentLabel`,
  `contentTab`, `children`, `signatures?`, `certificates?`, `onEdit`,
  `onDuplicate`, `onDelete`, `onSharePdf`, `onBack`, plus loading flags.
- `InspectionPointsContent` — act content (template questions → OK/issue rows).
- `NoteBlocksContent` / `NoteBlock` — incident + instruction content (titled note
  cards).
- `ReportSlidesContent` — report content (horizontal slide thumbnail strip;
  tap → `/reports/[id]/slide/[slideId]`).

## Internal files
- `DocumentDetails.tsx` — shell; owns the ScrollView, sticky tabs
  (`stickyHeaderIndices`), section offsets, scroll-to-section on tab press, and
  active-tab-on-scroll.
- `DocumentDetailsHeader.tsx` — tile + title + type + status `Badge`.
- `DocumentActionChips.tsx` — the Edit/Duplicate/Delete pill row (Delete danger).
- `DocumentTabs.tsx` — presentational sticky tab bar.
- `DocumentInfoSection.tsx` — read-only key/value list.

## Gotchas / non-obvious things
- **Routing:** list taps must land here, NOT on a success screen. For the act the
  two were conflated at `/inspections/[id]`; the success screen now lives at
  `/inspections/[id]/done` (FlowSuccessScreen) and `/inspections/[id]` renders
  this. Incident/report/instruction list taps already hit their `[id]` detail
  routes, which now render this.
- **Intentional divergence from the reference mockup — Info is read-only.** The
  mockup shows editable Project + Expert rows with a picker. Our model has no
  per-document expert (it is always the authoring user, no expert picker) and the
  incident/report update APIs omit `project_id`, so a saved document's project
  isn't reassignable. To change either, use **Edit** (reopens the create flow).
- **Certificates are act-only** (the `inspection_attachments` table is
  inspection-scoped). The reference table lists certs for incidents too — our
  schema doesn't, so incident shows signatures but no certificates.
- **Signatures reuse `components/success`** (`SuccessSignatureSection` opens the
  real `SignaturesScreen` modal; `SuccessCertificateSection` opens the
  `CertificatesManager` route). This module builds no new sheets. The act/incident
  no-persistence rule for captured signatures is unchanged (see
  `features/signatures/AGENTS.md`).
- **Terminology:** the role is **Expert (შრომის უსაფრთხოების ექსპერტი)**, never
  "inspector". Keep `expert` in all copy + new code here.

## Canonical helpers used
- `components/primitives` (`A11yText`, `Badge`, `Button`, `IconButton`),
  `components/success/*` (signature/certificate sections + `SuccessListRow`),
  `lib/theme`, `lib/accessibility`, `lib/imageUrl`, `lib/reportSlides`.
