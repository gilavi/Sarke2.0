# Prompt: OTP-verified signer flow (Sarke 2.0)

You are working on **Sarke 2.0**, a Georgian-language React Native / Expo app
for workplace-safety inspections. Backend is Supabase (Postgres + Storage +
Auth + Edge Functions). See `CLAUDE.md` / `README.md` at the repo root for
conventions.

## Problem

Today, the expert (inspector) collects on-site signatures from other roles
(brigade leader, operator, client rep, …) by typing their name on the
expert's own device and drawing the squiggle themselves. See
`app/questionnaire/[id]/signing.tsx` — the `startSign` → `onCaptured` flow.

There is **no evidence** that the named person actually consented. If a
report is ever disputed (post-accident investigation, labour inspectorate
audit), "the expert drew it" is indefensible.

## Goal

Add a **lightweight in-person identity gate**: before a non-expert signer
can sign, they must receive a 6-digit SMS code on their own phone and type
it back into the inspector's device. Only then can they draw their
signature. The signature record stores an audit trail proving which phone
number consented at which moment.

**Non-goals** (explicitly out of scope for this change):

- Remote signing via web link. No signer-facing web app. No "pending"
  document state. Preserve the current offline-first, generate-PDF-at-the-end
  flow.
- Changing the expert's own signature flow (`app/signature.tsx`).
- Changing the `not_present` branch.

## High-level flow (new)

On `app/questionnaire/[id]/signing.tsx`, when the inspector taps
**ხელმოწერა** on a non-expert role card:

1. **Name + phone sheet.** Inspector enters signer's full name and Georgian
   phone number (+995 prefix, format validated). Autofill from roster when
   available (same auto-fill logic as today).
2. **Send OTP.** Tap "კოდის გაგზავნა" → call the `sms-otp` edge function.
   Show spinner, then move to code-entry step. Display masked phone
   (e.g. `+995 5•• ••• 234`). Countdown + "თავიდან გაგზავნა" after 30s.
3. **Enter OTP.** Signer reads the code off their own phone, types it into
   the 6-digit input on the inspector's device. On success → move to
   signature step. On fail → show error, allow retry (max 5 attempts per
   `verification_id`; server enforces).
4. **Draw signature.** Existing `SignatureCanvas` component. On confirm,
   persist signature row *with* OTP metadata.

If at any step the inspector wants to abandon: a "OTP-ის გარეშე გაგრძელება"
secondary action is available but gated by a confirm dialog warning it
creates a legally weaker record. (Keeps old behavior as an explicit
escape hatch, not the default.)

Offline behavior: if `!online`, disable the "კოდის გაგზავნა" button and show
"OTP საჭიროებს ინტერნეტს. სცადე მოგვიანებით, ან მონიშნე „არ იყო დამსწრე"."
`not_present` still works offline.

## Implementation

### 1. Data model — new migration `0006_signature_otp.sql`

```sql
-- OTP verification metadata for signatures captured with SMS gate.
alter table signatures
  add column if not exists otp_verified_at timestamptz,
  add column if not exists otp_phone text,
  add column if not exists otp_verification_id uuid;

-- New table: sms_otp_verifications — owned by edge function, not client-writable.
create table if not exists sms_otp_verifications (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,              -- sha256(code + id) — never store raw
  attempts int not null default 0,
  verified_at timestamptz,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists sms_otp_verifications_phone_idx
  on sms_otp_verifications(phone, created_at desc);

alter table sms_otp_verifications enable row level security;

-- Clients can read their own rows (to check status), but all writes go
-- through the edge function using the service role.
create policy "otp self read" on sms_otp_verifications
  for select using (created_by = auth.uid());
```

### 2. Edge function — `supabase/functions/sms-otp/index.ts`

Two actions on one function, dispatched by `{ action: 'send' | 'verify' }`:

- **`send`** — body: `{ phone: string }`. Rate-limit: max 3 sends / phone /
  hour, max 10 / inspector / hour. Generate 6-digit code, hash with
  `sha256(code + id)`, store row with 5-minute `expires_at`, send SMS via
  provider. Return `{ verification_id, expires_at }`. Never return code.
- **`verify`** — body: `{ verification_id: string, code: string }`. Increment
  attempts; if > 5 or expired → `{ ok: false, reason }`. If match → set
  `verified_at = now()`, return `{ ok: true, verification_id }`.

SMS provider: default to **Twilio** (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_FROM`). Keep the send call behind a single `sendSms(to, body)`
function so a Georgian gateway can be swapped in later without touching
anything else.

SMS body (Georgian): `"თქვენი კოდი: 123456. Sarke. არ გაუზიაროთ არავის."`

### 3. Client library — `lib/otp.ts` (new)

```ts
export async function sendOtp(phone: string): Promise<{ verificationId: string; expiresAt: string }>;
export async function verifyOtp(verificationId: string, code: string): Promise<void>;
// throws typed errors: OtpExpired, OtpAttemptsExceeded, OtpInvalidCode, OtpNetworkError
```

Implement by invoking the edge function via `supabase.functions.invoke`.

### 4. UI — `components/OtpSignatureSheet.tsx` (new)

Full-screen modal with three steps (`'phone' | 'code' | 'draw'`). Props:

```ts
type Props = {
  visible: boolean;
  role: SignerRole;
  initialName?: string;
  initialPhone?: string;
  onCancel(): void;
  onConfirm(result: {
    personName: string;
    phone: string;
    signatureBase64: string;
    otpVerificationId: string;  // empty string if user chose escape hatch
    otpVerifiedAt: string | null;
  }): void;
};
```

- Phone input: require `+995` + 9 digits. Use a mask. Validate before enabling
  "Send code".
- Code input: 6 cells, auto-advance, auto-paste support.
- Resend countdown: 30s button cooldown.
- Escape hatch: small "OTP-ის გარეშე გაგრძელება" link on the phone step →
  confirm dialog → skip directly to draw step. Resulting record has
  `otpVerifiedAt = null`.
- Draw step: embed the existing `SignatureCanvas` (don't duplicate it).

### 5. Signing screen wiring — `app/questionnaire/[id]/signing.tsx`

Replace `startSign` + `onCaptured` + `SignatureCanvas` usage for non-expert
roles with `OtpSignatureSheet`. When it confirms, persist via
`signaturesApi.upsert` — extend that API and `SignatureRecord` type to
include `otp_verified_at`, `otp_phone`, `otp_verification_id`.

Roster auto-fill (`applyRoster`) stays: if a roster match has a saved
signature already, reuse it as today — do NOT re-OTP on reuse. Rationale:
the OTP attested the *first* time that person signed on this project;
reusing their roster signature is analogous to today's behavior.

Expert card (`ExpertCard`) is unchanged.

### 6. PDF rendering — `lib/pdf.ts`

Below each signature image, render a small caption:

- If `otp_verified_at && otp_phone`:
  `SMS-ით დამოწმებული • +995 5•• ••• NNN • 2026-04-24 14:32`
  (mask middle digits of phone)
- Else if legacy signed (no OTP): render nothing extra (backwards-compatible).
- Else if `not_present`: unchanged.

### 7. Types — `types/models.ts`

Extend `SignatureRecord`:

```ts
otp_verified_at: string | null;
otp_phone: string | null;
otp_verification_id: string | null;
```

### 8. Service layer — `lib/services.ts`

Thread the three new fields through `signaturesApi.upsert` and `list`.

## Acceptance criteria

1. A new signature created through the UI without completing OTP cannot be
   saved *unless* the inspector explicitly confirmed the escape-hatch
   dialog. No silent bypass.
2. OTP rows are created, hashed, verified, and expire correctly. Raw codes
   are never stored. Attempts > 5 locks the verification. Expired > 5 min
   locks it.
3. Rate limits are enforced server-side (3/phone/hour, 10/inspector/hour)
   and return a friendly toast-able error.
4. Offline mode: "Send code" is disabled; the offline banner explains why.
   `not_present` still works offline.
5. Legacy signatures (created before this migration) continue to display
   and export correctly. No backfill required.
6. PDF clearly distinguishes OTP-verified vs. legacy vs. not-present
   signatures.
7. Migration is additive and reversible (provide `down` in commit message
   if not inline).

## Things to flag to the human, don't guess

- Whether to use Twilio or a Georgian SMS gateway (ask before adding env vars
  to `supabase/functions/_env.example`).
- Exact wording for the Georgian strings — propose translations but flag
  them in the PR for review.
- Whether the "OTP-ის გარეშე გაგრძელება" escape hatch should be available
  to all inspectors or feature-flagged / admin-only.

## Out of scope (don't touch)

- `app/signature.tsx` (expert's own saved signature)
- Certificates flow
- Scheduling / Google Calendar
- PDF layout beyond the tiny caption line
- Any remote/web signer UI
