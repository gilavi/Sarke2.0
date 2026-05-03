# Auth Routes

`app/(auth)/*` — screens shown to unauthenticated users (and a couple of recovery flows for authed users). The `(auth)` group's layout (`app/(auth)/_layout.tsx`) renders without the bottom tab bar.

| Path | File | Purpose |
| --- | --- | --- |
| `/login` | `app/(auth)/login.tsx` | Email + password sign-in via Supabase Auth |
| `/register` | `app/(auth)/register.tsx` | Sign-up; creates `users` row on first login |
| `/forgot` | `app/(auth)/forgot.tsx` | Request a password-reset email |
| `/reset` | `app/(auth)/reset.tsx` | Deep-linked landing for the reset email |
| `/verify-email` | `app/(auth)/verify-email.tsx` | Wait-for-verification screen |

Routing decisions live in [`app/_layout.tsx`](https://github.com/gilavi/Sarke2.0/blob/main/app/_layout.tsx) — that file is where un-authed traffic gets redirected here, and where T&C acceptance is enforced after login.

Related lib:

- [`lib/session.tsx`](../lib.md#sessiontsx) — `<SessionProvider>` and `useSession()`
- [`lib/supabase.ts`](../lib.md#supabasets) — Supabase client init, PKCE config
