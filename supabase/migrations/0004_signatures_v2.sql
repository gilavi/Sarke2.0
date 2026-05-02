-- Signature system v2
--
-- - users.saved_signature_url: the expert's reusable PNG path (in storage).
--   Reused automatically on every new inspection they run.
-- - signatures.status: 'signed' (default) or 'not_present'. Rendering path
--   decides whether to show an image or an "(არ იყო დამსწრე)" placeholder.
-- - signatures.person_name: ad-hoc name for a signer whose row was captured
--   inline (not tied to a project_signers roster entry). Existing rows keep
--   full_name; person_name is only set for ad-hoc inline captures.

-- ---------- users.saved_signature_url ----------

alter table users
  add column if not exists saved_signature_url text;

-- RLS already scoped to self via existing "users self" policy, no change.

-- ---------- signatures.status ----------

do $$ begin
  if not exists (select 1 from pg_type where typname = 'signature_status') then
    create type signature_status as enum ('signed', 'not_present');
  end if;
end $$;

alter table signatures
  add column if not exists status signature_status not null default 'signed',
  add column if not exists person_name text;

-- signature_png_url is no longer required when status = 'not_present'.
-- Drop the NOT NULL, enforced via check instead.
alter table signatures
  alter column signature_png_url drop not null;

-- Ensure a signed row has an image path.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'signatures_status_png_chk'
  ) then
    alter table signatures
      add constraint signatures_status_png_chk
      check (
        (status = 'signed' and signature_png_url is not null)
        or status = 'not_present'
      );
  end if;
end $$;
