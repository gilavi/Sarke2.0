# Certificate Routes

A **certificate** is the PDF artifact generated from a completed inspection. The same inspection can have many certificates over time (re-generated on demand).

| Path | File | Purpose |
| --- | --- | --- |
| `/certificates/new` | `app/certificates/new.tsx` | Pick a project + template to start the inspection that will produce a certificate |
| `/certificates/[id]` | `app/certificates/[id].tsx` | View / re-share a generated PDF |

`is_safe_for_use` and `conclusion_text` are **snapshotted** into the certificate row at generation time (see [`Certificate` in the data model](../data-model.md#certificate)) — the certificate stays internally consistent even if the underlying inspection's editable fields are later read differently by a UI tweak.

PDF storage:

- Generated locally via `expo-print` from an HTML template in [`lib/pdf.ts`](../lib.md#pdfts).
- Uploaded to the `pdfs` storage bucket; signed URL stored in `certificates.pdf_url`.
- Re-shared via the system share sheet ([`lib/sharePdf.ts`](../lib.md#sharepdfts)).
