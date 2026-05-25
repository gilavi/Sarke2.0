-- Drop duplicate *_auth_users_fkey constraints from the prior migration where
-- an equivalent CASCADE FK already existed on the same column. Most tables
-- already had FKs that information_schema was hiding from the migration's
-- existence check, so duplicates were added. This is the cleanup pass.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, con.conname AS conname
    FROM pg_constraint con
    JOIN pg_class c ON con.conrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND con.contype = 'f'
      AND con.confrelid = (
        SELECT oid FROM pg_class
        WHERE relname = 'users'
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
      )
      AND con.conname LIKE '%_auth_users_fkey'
      AND EXISTS (
        SELECT 1 FROM pg_constraint con2
        WHERE con2.conrelid = con.conrelid
          AND con2.contype = 'f'
          AND con2.confrelid = con.confrelid
          AND con2.conkey = con.conkey
          AND con2.conname <> con.conname
          AND pg_get_constraintdef(con2.oid) LIKE '%ON DELETE CASCADE%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;
