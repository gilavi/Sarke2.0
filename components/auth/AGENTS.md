# components/auth

## What this module does

Auth-screen building blocks shared by `app/(auth)/login.tsx` (login + register
modes).

## Public API

- `SocialAuthButtons({ mode, onError })` — the third-party sign-in block.
  - `mode: 'login' | 'register'` picks the Apple button type (SIGN_IN/SIGN_UP)
    and the Google label.
  - `onError(message | null)` surfaces failures to the host form's inline
    error slot; cancellations are swallowed internally.

## Internal files

- `SocialAuthButtons.tsx` — owns the platform fork and its busy state.

## Gotchas

- **iOS shows ONLY Sign in with Apple** (Apple guideline 4.8 — offering Google
  without Apple is a rejection; `googleIosClientId` in `app.json` is empty, so
  Google never worked on iOS anyway). Android keeps Google unchanged.
- The native Apple button needs the `expo-apple-authentication` native module:
  invisible in Expo Go / old builds — requires a dev client or TestFlight
  build, plus the Apple provider enabled in Supabase (Client ID `ge.sarke2.app`).
- `AppleAuthentication.isAvailableAsync()` gates rendering; when unavailable
  the component renders `null` and email/password auth remains.
- Apple HIG: button min-height 44pt (we use 48 to match `Button`).

## Canonical helpers it consumes

- `lib/session.tsx` — `signInWithApple()` (nonce + `signInWithIdToken` +
  first-auth name persistence) and `signInWithGoogle()`.
- `lib/errorMap.ts` — `friendlyError`, `isCancelledError`.
- `lib/theme` `useTheme().isDark` — Apple button style (BLACK on light theme,
  WHITE on dark).
