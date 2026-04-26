# Project Routes

| Path | File | Purpose |
| --- | --- | --- |
| `/projects/new` | `app/projects/new.tsx` | Create-project form with `<MapPicker />` |
| `/projects/[id]` | `app/projects/[id].tsx` | Project detail: crew, project items, inspections, files, logo |
| `/projects/[id]/signer` | `app/projects/[id]/signer.tsx` | Add / edit a `project_signers` row |

## Project detail

The detail screen aggregates several feature areas:

- **Header** — name, company, address, [`<ProjectLogo />`](../components.md#projectlogo).
- **Crew** — [`<CrewSection />`](../components.md#crewsection): editable list of `crew[]` (JSON column on `projects`, see migration `0013`).
- **Project items** — assets that get inspected on a recurring schedule (e.g. specific harnesses).
- **Inspections** — list of past + draft inspections for this project.
- **Files** — uploaded supporting documents ([`<UploadedFilesSection />`](../components.md#uploadedfilessection); migration `0014`).

## Signers

`project_signers` are pre-registered humans tied to a project. Their stored `signature_png_url` is reused across inspections so they don't have to sign every time. Roles come from the [`SignerRole`](../data-model.md#enums) enum.
