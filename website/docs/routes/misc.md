# Misc Routes

| Path | File | Purpose |
| --- | --- | --- |
| `/terms` | `app/terms.tsx` | T&C acceptance gate; writes `users.tc_accepted_version` + `_at` |
| `/history` | `app/history.tsx` | All-time inspections across all projects (read-only) |
| `/signature` | `app/signature.tsx` | Reusable signature-capture screen |
| `/photo-picker` | `app/photo-picker.tsx` | Modal photo picker (camera / library / files) |

## T&C gate

`app/_layout.tsx` checks `users.tc_accepted_version` against the current version constant in [`lib/terms.ts`](../lib.md#termsts). If they don't match, navigation is locked to `/terms` until the user accepts.
