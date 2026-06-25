-- Drop the redundant NO ACTION FK on breathalyzer_logs.user_id so in-app
-- account deletion works.
--
-- 0048_breathalyzer_log.sql created the column as
--   user_id uuid not null references auth.users(id)
-- i.e. with the default NO ACTION delete rule (constraint
-- `breathalyzer_logs_user_id_fkey`). A later change added a second,
-- ON DELETE CASCADE foreign key to the SAME column
-- (`breathalyzer_logs_user_id_auth_users_fkey`) but never dropped the original.
--
-- Postgres enforces BOTH constraints, so whenever a user had even one
-- breathalyzer log, deleting their auth.users row (the `delete-account` Edge
-- Function → supabase.auth.admin.deleteUser) violated the NO ACTION constraint
-- and aborted the cascade. The function returned 500 and the app surfaced the
-- opaque "Edge Function returned a non-2xx status code". See app/profile.tsx
-- and supabase/functions/delete-account/index.ts.
--
-- Dropping the legacy NO ACTION constraint leaves the CASCADE FK to clean up a
-- user's logs when the account is deleted. Idempotent.

alter table public.breathalyzer_logs
  drop constraint if exists breathalyzer_logs_user_id_fkey;
