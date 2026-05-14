# Database Schema

Postgres 15+ on Supabase. All user-scoped tables have **Row-Level Security** turned on, scoping reads and writes to `auth.uid()`.

## Tables (current state — 42 migrations applied)

| Table | Purpose | First introduced |
| --- | --- | --- |
| `users` | App-side mirror of `auth.users` (name, T&C, saved signature, subscription fields) | `0001` (+ `0002`, `0004`, `0028`) |
| `qualifications` | Expert credentials. **Originally** named `certificates` — renamed in `0006` | `0001` (renamed `0006`) |
| `projects` | Inspection sites. Has `latitude/longitude` (`0012`), `crew[]` JSON (`0013`), `logo` (`0015`), `contact_phone` (`0022`) | `0001` |
| `project_files` | Documents attached to a project | `0014` |
| `project_signers` | Pre-registered humans tied to a project | `0001` |
| `project_items` | Tracked assets (harnesses, scaffold sections) under a project | `0005` |
| `templates` | Inspection form definitions; `required_cert_types` renamed to `required_qualifications` in `0007` | `0001` |
| `questions` | Form fields belonging to a template | `0001` |
| `inspections` | Generic on-site record (renamed from `questionnaires` in `0006`); includes `inspector_name` (`0033`), `department` (`0036`), `signature` (`0032`) | `0001` (renamed `0006`) |
| `answers` | One row per (inspection, question) | `0001` (+ `0009` notes) |
| `answer_photos` | Photo attachments for an answer. Has `latitude/longitude/address` from `0023` | `0001` |
| `signatures` | One row per (inspection, signer_role) | `0001` |
| `certificates` *(reused name)* | Generated PDFs derived from inspections | `0006` |
| `schedules` | Recurring-inspection cadence per `project_item` | `0005` |
| `remote_signing_requests` | Async signer invitations (token, SMS) | `0011` |
| `inspection_attachments` | Equipment certificates uploaded against an inspection | `0021` |
| `incidents` | Workplace incidents with photos | `0017` |
| `briefings` | Safety briefings + participant signatures | `0018` |
| `reports` | Site reports | `0019` |
| `bobcat_inspections` | Bobcat / Large Loader inspection (30/33-item JSONB checklist, verdict, department) | `0024` (+ `0034`, `0037`) |
| `excavator_inspections` | Excavator inspection (6-section JSONB, registration number, verdict) | `0026` (+ `0030`, `0037`) |
| `general_equipment_inspections` | General equipment inspection (user-built JSONB equipment list, verdict, department) | `0027` (+ `0035`) |
| `cargo_platform_inspections` | Cargo platform inspection (platform ID, JSONB cargo table, 9-item checklist, dual signatures) | `0040` |
| `orders` | Appointment orders / ბრძანებები (`document_type text`, `form_data jsonb`) | `0038` |
| `payment_records` | BOG payment status transitions (one row per callback) | `0031` |

## Storage buckets

| Bucket | Contents |
| --- | --- |
| `certificates` | Qualification scans (file for `qualifications` rows) |
| `answer-photos` | Photos attached to inspection answers |
| `signatures` | Saved signature PNGs (project signers + crew) |
| `pdfs` | Generated certificate PDFs |
| `remote-signatures` | Signature PNGs collected via remote signing |
| `incident-photos` | Photos attached to incidents |
| `report-photos` | Photos attached to reports |
| `project-files` | Documents attached to projects |

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
create type question_type        as enum ('yesno','measure','component_grid','freetext','photo_upload');
create type questionnaire_status as enum ('draft','completed');   -- still its original name
create type signer_role          as enum ('expert','xaracho_supervisor','xaracho_assembler','other');
```

`SignatureStatus`, `RemoteSigningStatus`, and `OrderDocumentType` are stored as `text` with check constraints rather than dedicated enums.

## Specialized inspection tables (own schema per type)

The four specialized inspection types each have their own table because their schema diverges too much from the generic question/answer model.

```sql
-- Shared pattern across all four:
CREATE TABLE <type>_inspections (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  template_id uuid references templates(id) on delete set null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'draft' check (status in ('draft','completed')),
  -- type-specific columns...
  items / equipment / cargo  jsonb,    -- checklist or item list
  signatures                 jsonb,    -- [{name, position, signature (base64), date}]
  verdict                    text,
  completed_at               timestamptz,
  created_at / updated_at    timestamptz
);
```

## Frozen rows

Migrations `0008` and `0010` install triggers that **prevent updates** to `inspections` rows where `status = 'completed'`. Re-opening a completed generic inspection requires creating a new draft. Specialized inspection tables do not have this freeze trigger — they can be edited after completion.
