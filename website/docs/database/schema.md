# Database Schema

Postgres 15+ on Supabase. All user-scoped tables have **Row-Level Security** turned on, scoping reads and writes to `auth.uid()`.

## Tables (current state)

| Table | Purpose | First introduced |
| --- | --- | --- |
| `users` | App-side mirror of `auth.users` (name, T&C state, saved signature) | `0001` (+ `0002`, `0004`) |
| `qualifications` | Expert credentials. **Originally** named `certificates` — renamed in `0006` | `0001` (renamed `0006`) |
| `projects` | Inspection sites. Has `latitude/longitude` (`0012`), `crew[]` JSON (`0013`), `logo_url` (collaborator migration) | `0001` |
| `project_files` | Documents attached to a project | `0014` |
| `project_signers` | Pre-registered humans tied to a project | `0001` |
| `project_items` | Tracked assets (specific harnesses, sections) under a project | `0005` |
| `templates` | Inspection form definitions; `required_cert_types` was renamed to `required_qualifications` in `0007` | `0001` |
| `questions` | Form fields belonging to a template | `0001` |
| `inspections` | The on-site record. Postgres **table** was renamed from `questionnaires` in `0006`; the **enum type** is still named `questionnaire_status` | `0001` (renamed `0006`) |
| `answers` | One row per (inspection, question) | `0001` (+ `0009` `notes`) |
| `answer_photos` | Photo attachments for an answer | `0001` |
| `signatures` | One row per (inspection, signer_role); refactored in `0004` to support `not_present` status | `0001` |
| `certificates` *(reused name)* | Generated PDFs derived from inspections | `0006` |
| `schedules` | Recurring-inspection cadence per `project_item` (with optional Google Calendar event id) | `0005` |
| `remote_signing_requests` | Async signer invitations (token, SMS) | `0011` |

## Storage buckets

| Bucket | Contents |
| --- | --- |
| `certificates` | Qualification scans (the file_url for `qualifications` rows — pre-rename name) |
| `answer-photos` | Photos attached to inspection answers |
| `signatures` | Saved signature PNGs (project signers + crew members) |
| `pdfs` | Generated certificate PDFs |
| `remote-signatures` | Signature PNGs collected via remote signing flow |

## RLS shape

The `0001` policies set the pattern that every later migration follows:

```sql
-- Owner-only access on root entities
create policy "proj owner" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Child entities reach through their parent
create policy "signers via project" on project_signers
  for all using (exists (
    select 1 from projects p where p.id = project_id and p.user_id = auth.uid()
  ));
```

System templates are public-readable (`is_system = true`); user-owned templates are owner-scoped.

## Enums

```sql
create type question_type           as enum ('yesno','measure','component_grid','freetext','photo_upload');
create type questionnaire_status    as enum ('draft','completed');   -- still its original name
create type signer_role             as enum ('expert','xaracho_supervisor','xaracho_assembler');
```

`SignatureStatus` and `RemoteSigningStatus` are stored as `text` with check constraints rather than dedicated enums.

## Frozen rows

Migrations `0008` and `0010` install triggers that **prevent updates** to `inspections` rows where `status = 'completed'` (and prevent rolling back `completed_at`). Re-opening a completed inspection requires creating a new draft.
