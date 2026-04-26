# Qualification Routes

A **qualification** is the expert's professional credential (e.g. `xaracho_inspector` certificate with number, issue + expiry dates, scanned PDF). Templates can require specific qualification types via `templates.required_qualifications`; missing quals block inspection start.

| Path | File | Purpose |
| --- | --- | --- |
| `/qualifications` | `app/qualifications/index.tsx` | List of the current user's quals |
| `/qualifications/new` | `app/qualifications/new.tsx` | Add a qual (type, number, expiry, file upload) |

Naming history: this row was originally called `Certificate` and was renamed in migration `0006` to free that name for the PDF-output concept; the column rename followed in `0007`.
