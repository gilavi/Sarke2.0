# Migrations

`supabase/migrations/00*.sql` — applied in order against the hosted Supabase project. Each migration is intentionally small and self-contained.

| # | File | Summary |
| --- | --- | --- |
| 0001 | `0001_init.sql` | Initial schema: `users`, `certificates` (qual scans), `projects`, `project_signers`, `templates`, `questions`, `questionnaires`, `answers`, `answer_photos`, `signatures`. Enums + RLS policies established. |
| 0002 | `0002_terms_acceptance.sql` | Adds `users.tc_accepted_version` + `tc_accepted_at` for the T&C gate. |
| 0003 | `0003_feature_additions.sql` | Adds answer comments, photo captions, conclusion fields. |
| 0004 | `0004_signatures_v2.sql` | Refactors signatures: introduces `status: 'signed' \| 'not_present'`, allows null `signature_png_url` when not present, adds `person_name` for ad-hoc signers. |
| 0005 | `0005_schedules_automation.sql` | Adds `project_items` and `schedules` (recurring inspection cadence + optional `google_event_id`). |
| 0006 | `0006_inspections_certificates.sql` | **Renames `questionnaires` → `inspections`** and reuses the `certificates` name for the new "generated PDF" concept. The `questionnaire_status` enum keeps its name to avoid a schema-ripple. The pre-existing `certificates` table is renamed to `qualifications`. |
| 0007 | `0007_rename_required_qualifications.sql` | Renames `templates.required_cert_types` → `required_qualifications`. |
| 0008 | `0008_freeze_completed_inspections.sql` | Trigger preventing edits to `inspections` rows with `status = 'completed'`. |
| 0009 | `0009_notes_column.sql` | Adds `answers.notes` (separate from `comment`). |
| 0010 | `0010_freeze_completed_at.sql` | Trigger preventing `completed_at` from being unset / moved earlier. |
| 0011 | `0011_remote_signing.sql` | Adds `remote_signing_requests` + `remote-signatures` storage bucket conventions. |
| 0012 | `0012_project_location.sql` | Adds `projects.latitude` + `projects.longitude`. |
| 0013 | `0013_project_crew.sql` | Adds `projects.crew jsonb` (array of `CrewMember`). |
| 0014 | `0014_project_files.sql` | Adds `project_files` table. |

## Naming history (read this if you're confused)

The most disorienting rename is in `0006`:

| Old name (pre-`0006`) | New name | What it is |
| --- | --- | --- |
| `certificates` | `qualifications` | Expert credentials (xaracho_inspector cert, harness_inspector cert, …) |
| `questionnaires` | `inspections` | The on-site record |
| *(did not exist)* | `certificates` | Generated PDFs derived from inspections |

The Postgres enum `questionnaire_status` and the FK column `answers.questionnaire_id` were intentionally **not renamed** to keep the migration small. `types/models.ts` keeps `QuestionnaireStatus` and `Questionnaire` as `@deprecated` aliases.
