# Migrations

`supabase/migrations/00*.sql` — applied in order against the hosted Supabase project. Each migration is intentionally small and self-contained.

| # | File | Summary |
| --- | --- | --- |
| 0001 | `0001_init.sql` | Initial schema: `users`, `certificates` (qual scans), `projects`, `project_signers`, `templates`, `questions`, `questionnaires`, `answers`, `answer_photos`, `signatures`. Enums + RLS policies established. |
| 0002 | `0002_terms_acceptance.sql` | Adds `users.tc_accepted_version` + `tc_accepted_at` for the T&C gate. |
| 0003 | `0003_feature_additions.sql` | Adds answer comments, photo captions, conclusion fields. |
| 0004 | `0004_signatures_v2.sql` | Refactors signatures: introduces `status: 'signed' \| 'not_present'`, allows null `signature_png_url` when not present, adds `person_name` for ad-hoc signers. |
| 0005 | `0005_schedules_automation.sql` | Adds `project_items` and `schedules` (recurring inspection cadence + optional `google_event_id`). |
| 0006 | `0006_inspections_certificates.sql` | **Renames `questionnaires` → `inspections`** and reuses the `certificates` name for the new "generated PDF" concept. The `questionnaire_status` enum keeps its name. The pre-existing `certificates` table is renamed to `qualifications`. |
| 0007 | `0007_rename_required_qualifications.sql` | Renames `templates.required_cert_types` → `required_qualifications`. |
| 0008 | `0008_freeze_completed_inspections.sql` | Trigger preventing edits to `inspections` rows with `status = 'completed'`. |
| 0009 | `0009_notes_column.sql` | Adds `answers.notes` (separate from `comment`). |
| 0010 | `0010_freeze_completed_at.sql` | Trigger preventing `completed_at` from being unset / moved earlier. |
| 0011 | `0011_remote_signing.sql` | Adds `remote_signing_requests` + `remote-signatures` storage bucket conventions. |
| 0012 | `0012_project_location.sql` | Adds `projects.latitude` + `projects.longitude`. |
| 0013 | `0013_project_crew.sql` | Adds `projects.crew jsonb` (array of `CrewMember`). |
| 0014 | `0014_project_files.sql` | Adds `project_files` table. |
| 0015 | `0015_project_logo.sql` | Adds `projects.logo` (base64 data URL for the project avatar). |
| 0016 | `0016_signer_role_other.sql` | Adds `'other'` to the `signer_role` enum for freeform crew members. |
| 0017 | `0017_incidents.sql` | Adds `incidents` table (workplace incidents with photos). |
| 0018 | `0018_briefings.sql` | Adds `briefings` table (safety briefings + participant signatures). |
| 0019 | `0019_reports.sql` | Adds `reports` table (site reports). |
| 0020 | `0020_storage_rls_and_timestamps.sql` | Tightens `incident-photos` and `report-photos` storage RLS to the row owner; adds `updated_at` + audit trigger to mutable tables; adds composite indexes. |
| 0021 | `0021_inspection_attachments.sql` | Adds `inspection_attachments` table for equipment certificates uploaded against an inspection. |
| 0022 | `0022_project_contact_phone.sql` | Adds `projects.contact_phone`. |
| 0023 | `0023_photo_location.sql` | Adds `latitude`, `longitude`, `address` to `answer_photos`; backfills from legacy `addr:` caption prefix. |
| 0024 | `0024_bobcat_inspections.sql` | Adds `bobcat_inspections` table, RLS, `updated_at` trigger, and system template rows for Bobcat (`33333333-…`, category `bobcat`). |
| 0025 | `0025_large_loader_template.sql` | Inserts the Large Loader system template (`44444444-…`, category `bobcat`, 33-item variant). |
| 0026 | `0026_excavator_template.sql` | Adds `excavator_inspections` table, RLS, `updated_at` trigger, and system template (`55555555-…`, category `excavator`). |
| 0027 | `0027_general_equipment_inspection.sql` | Adds `general_equipment_inspections` table (JSONB `equipment` array + `summary_photos`), RLS, trigger, and template (`66666666-…`, category `general_equipment`). |
| 0028 | `0028_pdf_usage_tracking.sql` | Adds `pdf_count`, `subscription_status`, `subscription_expires_at`, `bog_card_token` to `users`; defines `increment_pdf_count` RPC with 30-PDF free-tier cap. |
| 0029 | `0029_subscription_unlimited.sql` | Auto-expires lapsed subscriptions inside `increment_pdf_count`; grants unlimited PDFs to active subscribers. |
| 0030 | `0030_excavator_registration_number.sql` | Adds `registration_number` field to `excavator_inspections`. |
| 0031 | `0031_subscription_cancel_and_history.sql` | Adds `users.subscription_cancelled_at`, `cancel_subscription` RPC, and `payment_records` table. |
| 0032 | `0032_inspections_add_signature.sql` | Adds `signature` column to `inspections` for inspector's own signature. |
| 0033 | `0033_inspections_add_inspector_name.sql` | Adds `inspector_name` text column to `inspections`. |
| 0034 | `0034_bobcat_add_department.sql` | Adds `department` column to `bobcat_inspections`. |
| 0035 | `0035_general_equipment_add_department.sql` | Adds `department` column to `general_equipment_inspections`. |
| 0036 | `0036_inspections_add_department.sql` | Adds `department` column to generic `inspections`. |
| 0037 | `0037_summary_photos_bobcat_excavator.sql` | Adds `summary_photos jsonb` to `bobcat_inspections` and `excavator_inspections`. |
| 0038 | `0038_orders.sql` | Adds `orders` table (`document_type text`, `form_data jsonb`, `status`) for appointment orders / ბრძანებები. |
| 0039 | `0039_pdf_hash.sql` | Adds `pdf_hash text` column to `orders` (and relevant tables) for SHA-256 integrity. |
| 0040 | `0040_cargo_platform_inspection.sql` | Adds `cargo_platform_inspections` table, RLS, trigger, and system template (`77777777-…`, category `cargo_platform`). |
| 0041 | `0041_mobile_scaffold_template.sql` | Inserts Mobile Scaffold N1 system template (category `mobile_scaffold`). |
| 0042 | `0042_mobile_scaffold_n3_template.sql` | Inserts Mobile Scaffold N3 system template (category `mobile_scaffold_n3`). |

## Naming history (read this if you're confused)

The most disorienting rename is in `0006`:

| Old name (pre-`0006`) | New name | What it is |
| --- | --- | --- |
| `certificates` | `qualifications` | Expert credentials (inspector cert, harness cert, …) |
| `questionnaires` | `inspections` | The on-site record |
| *(did not exist)* | `certificates` | Generated PDFs derived from inspections |

The Postgres enum `questionnaire_status` and the FK column `answers.questionnaire_id` were intentionally **not renamed** to keep the migration small. `types/models.ts` keeps `QuestionnaireStatus` as a `@deprecated` alias.
