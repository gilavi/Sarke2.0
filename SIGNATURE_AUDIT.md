# Signature Surface Audit — 2026-05-26

**Scope (per user direction):** inspection signature flow only. Out of scope and intentionally left alone: project-signer witness flow (`project_signers` + the in-person signing pattern), tokenized remote signing (`web/` sarke-sign, `remote-signatures` bucket, `remote_signings` table, `send-signing-sms` Edge Function), order signatures (`orders.form_data`), briefing signing, incident signatures, breathalyzer signatures.

This audit catalogs every file and store that the inspection-scoped signature flow currently reaches, so phases 2–6 can remove it deliberately.

---

## A. Files touching the inspection signature flow

### A1. Capture UI

| File | Role |
|---|---|
| [components/SignatureCanvas.tsx](components/SignatureCanvas.tsx) | Full-screen modal wrapping `react-native-signature-canvas`. Returns the captured base64 PNG via `onConfirm`. **Reusable for the new module** — no persistence inside the file. |
| [components/inspection-parts/SignatureBlock.tsx](components/inspection-parts/SignatureBlock.tsx) | The "name + position + role + sign" card layout used by per-inspection signatory captures. Holds editable inputs and opens `SignatureCanvas`. **The pattern being removed.** |
| [components/inspection-parts/SignatureSheet.tsx](components/inspection-parts/SignatureSheet.tsx) | Bottom-sheet wrapper around `SignatureBlock`. Title `ხელმოწერები`. Used by every equipment inspection's result view. **Removed in Phase 5.** |
| [components/SignaturesActionSheet.tsx](components/SignaturesActionSheet.tsx) | Alternative sheet keyed by `signer_role` enum. Writes through `signaturesApi.upsert` → `signatures` table + uploads to `signatures` storage bucket. Used only by the legacy `InspectionResultView` path. **The pattern being removed.** |

### A2. Inspection-type screens that mount one of the sheets above

The cargo-platform pattern stores **two** signatures in a typed array (`inspection.signatures[]`); fall-protection stores a single nested `inspection.signature` object; the other five equipment types all map a single signatory onto the row's `inspectorName` / `inspectorPosition` / `inspectorSignature` columns. All seven mount `<SignatureSheet>` from a `renderSignaturesSheet` prop on the post-completion `<InspectionResultView>`.

| File | Pattern |
|---|---|
| [app/inspections/[id].tsx](app/inspections/[id].tsx) | Generic (harness, scaffold). Uses an in-component `EphemeralSignatureSheet` (in-memory only, not DB-persisted) but still renders signatures into the PDF via `signatoriesToRecords(...)`. Reads `template.required_signer_roles` to seed slots. |
| [app/inspections/bobcat/[id].tsx](app/inspections/bobcat/[id].tsx) | Single inspector, writes to `bobcat_inspections.inspector_signature` column. |
| [app/inspections/excavator/[id].tsx](app/inspections/excavator/[id].tsx) | Single inspector, writes to `excavator_inspections.inspector_signature`. |
| [app/inspections/general-equipment/[id].tsx](app/inspections/general-equipment/[id].tsx) | Single inspector, writes to `general_equipment_inspections.inspector_signature`. |
| [app/inspections/cargo-platform/[id].tsx](app/inspections/cargo-platform/[id].tsx) | Multi-signatory (two), persists into `cargo_platform_inspections.signatures` JSONB. |
| [app/inspections/safety-net/[id].tsx](app/inspections/safety-net/[id].tsx) | Multi-device with per-device signatures inside the row JSON. |
| [app/inspections/mobile-ladder/[id].tsx](app/inspections/mobile-ladder/[id].tsx) | Multi-device, same as above. |
| [app/inspections/forklift/[id].tsx](app/inspections/forklift/[id].tsx) | Extended signature (name + position + phone). |
| [app/inspections/fall-protection/[id].tsx](app/inspections/fall-protection/[id].tsx) | Per-device signature inside `deviceData[].signature`. |
| [app/inspections/lifting-accessories/[id].tsx](app/inspections/lifting-accessories/[id].tsx) | Multi-device, same as safety-net. |
| [app/inspections/harness/[id].tsx](app/inspections/harness/[id].tsx) | No signature UI of its own — uses the generic `[id].tsx` for the result view. |

### A3. Wizard

| File | Role |
|---|---|
| [features/inspection-wizard/ConclusionStep.tsx](features/inspection-wizard/ConclusionStep.tsx) | Final wizard step. **Currently has no signature UI** — only safe/unsafe verdict, harness name, photos, conclusion text. This is where Phase 4 attaches the new SignaturesScreen entry row. |

### A4. PDF rendering

| File | Role |
|---|---|
| [lib/pdf/inspection/renderSignatures.ts](lib/pdf/inspection/renderSignatures.ts) | Renders `SignatureRecord[]` into the generic PDF. Filters `status === 'signed'` rows with a base64 PNG. |
| [lib/pdf/inspection/template.ts](lib/pdf/inspection/template.ts) | Calls `renderSignatures`. |
| [lib/pdf/inspection/template.css.ts](lib/pdf/inspection/template.css.ts) | Signature-block CSS. |
| [lib/inspection/pdf.ts](lib/inspection/pdf.ts), [lib/inspection/pdfStyles.ts](lib/inspection/pdfStyles.ts) | The equipment-inspection PDF engine. Renders signatories per type via the schema's hooks. |
| [lib/inspection/schemas/bobcat.ts](lib/inspection/schemas/bobcat.ts), [excavator.ts](lib/inspection/schemas/excavator.ts), [generalEquipment.ts](lib/inspection/schemas/generalEquipment.ts), [cargoPlatform.ts](lib/inspection/schemas/cargoPlatform.ts), [safetyNet.ts](lib/inspection/schemas/safetyNet.ts), [mobileLadder.ts](lib/inspection/schemas/mobileLadder.ts), [forklift.ts](lib/inspection/schemas/forklift.ts), [fallProtection.ts](lib/inspection/schemas/fallProtection.ts), [liftingAccessories.ts](lib/inspection/schemas/liftingAccessories.ts) | Each schema embeds the type's signatory layout into the PDF (e.g. cargo-platform renders two side-by-side blocks, forklift renders the extended phone+position block). All call `escapeHtml(sig.signature)` and emit `<img src="data:image/png;base64,…">`. |

### A5. State / storage layer

| File | Role |
|---|---|
| [lib/services/real/signatures.ts](lib/services/real/signatures.ts) | `signaturesApi.list / upsert / remove` against the `signatures` Postgres table. Used only by `SignaturesActionSheet`. |
| [lib/services/mock/signatures.ts](lib/services/mock/signatures.ts) | Mock equivalent. |
| [lib/signatures.ts](lib/signatures.ts) | `compressSignature`, `uploadSignature`, `flushPendingSignatures`, `saveExpertSignature`. Uploads to Supabase Storage bucket `signatures`; queues failed uploads in AsyncStorage `pending-signatures`; persists `users.saved_signature_url`. |
| [lib/localSignatures.ts](lib/localSignatures.ts) | AsyncStorage key prefix `local-sigs:`. **Exports defined but no importers** — dead code. Still a violation to delete. |
| Equipment service files: [lib/bobcatService.ts](lib/bobcatService.ts), [lib/excavatorService.ts](lib/excavatorService.ts), [lib/generalEquipmentService.ts](lib/generalEquipmentService.ts), [lib/cargoPlatformService.ts](lib/cargoPlatformService.ts), [lib/forkliftService.ts](lib/forkliftService.ts), [lib/fallProtectionService.ts](lib/fallProtectionService.ts), [lib/safetyNetService.ts](lib/safetyNetService.ts), [lib/mobileLadderService.ts](lib/mobileLadderService.ts), [lib/liftingAccessoriesService.ts](lib/liftingAccessoriesService.ts) | Map the inspector_signature / signatories columns onto each type's TypeScript model. |

### A6. Reused elsewhere (do NOT delete — out of scope)

The same `signatures` Supabase bucket and `lib/signatures.ts` helpers (specifically `uploadSignature`) are also used by:
- `lib/services/real/projects.ts` + [components/RoleSlotList.tsx](components/RoleSlotList.tsx) + [components/RoleSlotSheet.tsx](components/RoleSlotSheet.tsx) — project-signer witnesses (out of scope).
- [app/projects/[id]/signer.tsx](app/projects/[id]/signer.tsx) — project-signer capture flow (out of scope).
- [app/projects/[id]/participants.tsx](app/projects/[id]/participants.tsx) — project participants display (out of scope).
- [components/CertificatesActionSheet.tsx](components/CertificatesActionSheet.tsx) — qualification certificate signatures (out of scope).

This means **`lib/signatures.ts` and the `signatures` storage bucket cannot be deleted outright** — Phase 5 removes only the inspection-flow callers, leaving the file in place for the out-of-scope flows.

---

## B. Persistence audit — where the no-save rule is currently broken

### B1. Supabase Storage buckets

The `signatures` storage bucket exists ([README.md → Storage buckets](README.md#storage-buckets)) and currently holds inspection signature PNGs uploaded via `lib/signatures.ts → uploadSignature`. Path patterns observed in code:

- `${inspectionId}/${role}-${Date.now()}.png` — written by `SignaturesActionSheet` (inspection flow).
- `expert/${userId}.png` — written by `saveExpertSignature` (inspection-flow expert signature reuse).
- `project-signers/${projectId}/...` and similar — written by out-of-scope flows, must be preserved.

SQL queries the user should run to enumerate live objects (Claude Code can't reach Supabase from this sandbox):

```sql
-- All inspection signatures: by signer role naming convention
SELECT id, name, owner, created_at, metadata->>'size' AS size
FROM   storage.objects
WHERE  bucket_id = 'signatures'
ORDER  BY created_at DESC;

-- Bucket inventory check
SELECT id, name, public FROM storage.buckets WHERE id IN ('signatures', 'remote-signatures');
```

### B2. Supabase tables / columns

| Table | Column | Migration | Holds |
|---|---|---|---|
| `signatures` | `signature_png_url`, `status`, `person_name`, `full_name`, `phone`, `position`, `signer_role`, `signed_at` | 0001, 0004 | One row per (inspection_id, signer_role) — actual signature data stored in the `signatures` bucket; this table holds the pointer + metadata. |
| `users` | `saved_signature_url` | 0004 | Path into `signatures` bucket — the user's reusable expert signature. |
| `inspections` | `inspector_signature` (text/base64) | 0032 | Inline base64 PNG. |
| `inspections` | `signatories` (JSONB array of `{name, role, signature, signed_at}`) | 0050 | Inline base64 PNGs inside JSON. |
| `bobcat_inspections` | `inspector_signature` | 0024 | Inline base64 PNG. |
| `bobcat_inspections` | `signatories` JSONB | 0051 | Inline base64 PNGs. |
| `excavator_inspections` | `inspector_signature` | 0026 | Inline base64 PNG. |
| `excavator_inspections` | `signatories` JSONB | 0051 | Inline base64 PNGs. |
| `general_equipment_inspections` | `inspector_signature` | 0027 | Inline base64 PNG. |
| `general_equipment_inspections` | `signatories` JSONB | 0051 | Inline base64 PNGs. |
| `cargo_platform_inspections` | `signatures` JSONB (typed `[I, II]`) | 0040 | Two signatory blobs. |
| `cargo_platform_inspections` | `signatories` JSONB | 0051 | Additional signatory array. |
| `forklift_inspections` | per-row signature fields | 0047 | Extended (name + position + phone + signature). |
| `safety_net_inspections`, `mobile_ladder_inspections`, `lifting_accessories_inspections` | per-device signature fields inside row JSON | 0044/0045/0049 | Per-device signature PNGs. |
| `fall_protection_inspections` | per-device signature in `deviceData[].signature` | 0046 | Per-device signature PNG. |

Generated query the user should run to list every signature-bearing column currently in the DB:

```sql
SELECT table_schema, table_name, column_name, data_type
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  (column_name ILIKE '%signat%' OR column_name ILIKE '%sign\\_%')
ORDER  BY table_name, column_name;
```

### B3. Local persistence (AsyncStorage / file system / MMKV / SecureStore)

Greps from `app/`, `features/`, `components/`, `lib/`, `hooks/`:

| Site | Storage | Key / path | Scope |
|---|---|---|---|
| [lib/signatures.ts:9](lib/signatures.ts#L9) | AsyncStorage | `pending-signatures` | Retry queue for failed signature uploads. Holds `{path, base64, contentType}[]`. Inspection-flow only. **Violation.** |
| [lib/localSignatures.ts:7](lib/localSignatures.ts#L7) | AsyncStorage | `local-sigs:<inspectionId>` | Exports defined but no importers — dead writer. Still must be removed because the surface exists. **Violation.** |
| [lib/signatures.ts:48-56](lib/signatures.ts#L48-L56) | File system (`expo-file-system`) | `${cacheDir}/sig-<ts>-<rand>.png` | Temp file written before upload. Removed by Supabase upload on success; orphaned if upload fails. **Edge case.** Acceptable as transient because the file is the upload payload itself, but the path should be deleted by the new module right after the upload-then-rasterize path is gone. |

No matches for `SecureStore`, `MMKV`, or signature-keyed `FileSystem.writeAsync` outside the upload-temp path above.

### B4. In-memory state lifetime

For reference, this is what the new module needs to match or shorten:

- `app/inspections/[id].tsx` `EphemeralSignatureSheet`: per-screen, lost on unmount (already compliant in lifetime, but writes to PDF via state).
- Equipment screens (bobcat/excavator/etc.): held in `inspection` state via `useState`, persisted to DB on `onChanged()` callback fired from the signature sheet. The DB write is the violation, not the state.
- The new module's target lifetime: wizard-scope state, cleared explicitly after PDF generation (no autosave, no DB write at all).

---

## C. Inspection types map

| Inspection type | Current signature pattern | After redesign |
|---|---|---|
| Generic (harness, scaffold, mobile scaffold variants) | `EphemeralSignatureSheet` on result screen, reads `template.required_signer_roles` for slots; in-memory only but renders into PDF | New SignaturesScreen from wizard last step; one creator + N empty hand-sign slots in PDF |
| Bobcat (`bobcat`) | Single inspector via `SignatureSheet`, persisted to `bobcat_inspections.inspector_signature` | Same SignaturesScreen pattern; column dropped |
| Excavator (`excavator`) | Same as bobcat | Same |
| General equipment (`general_equipment`) | Same | Same |
| Cargo platform (`cargo_platform`) | **Two** signatories `[I ხელმომწერი, II ხელმომწერი]` persisted to `cargo_platform_inspections.signatures` JSONB | Same SignaturesScreen — creator + extra rows for the second signatory's slot |
| Safety net (`safety_net_inspection`) | Multi-device, per-device signature in row JSON | Same — single creator signature; per-device empty hand-sign slots if needed (TBD in Phase 3) |
| Mobile ladder (`mobile_ladder_inspection`) | Same as safety net | Same |
| Forklift (`forklift_inspection`) | Extended single signature (name + position + phone) | Same SignaturesScreen pattern; the printed-page slot can be larger to accommodate the extra fields |
| Fall protection (`fall_protection_inspection`) | Per-device single signatory in `deviceData[].signature` | Same — per-device sign slot becomes an empty hand-sign slot in the PDF |
| Lifting accessories (`lifting_accessories_inspection`) | Multi-device, same as safety net | Same |

---

## Cleanup needed (Phase 2)

The no-save rule is **currently broken**. The cleanup migration in Phase 2 must remove (or null out) every column listed in B2 and delete every object in the `signatures` storage bucket whose path is **not** a project-signer or qualification-certificate artifact. The destructive migration is written but **not executed from Claude Code** — the user will review and apply it manually via the Supabase Management API or `supabase db query --linked`.

The local AsyncStorage writers in B3 are removed in code as part of Phase 5 (no migration needed — the keys evaporate on next user-data purge).

Out-of-scope persistence (project signers, tokenized remote signing, order signatures) is preserved unchanged.
