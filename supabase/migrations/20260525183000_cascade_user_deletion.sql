-- Add ON DELETE CASCADE foreign keys from every user-owned public table to
-- auth.users(id). Required for App Store Review Guideline 5.1.1(v): account
-- deletion must actually delete user data, not orphan it.
--
-- Discovers candidate columns dynamically. Uses pg_catalog (not information_schema)
-- for the existence check because information_schema cannot see FKs that
-- reference the auth schema. Cleans orphaned rows before adding each FK.

DO $$
DECLARE
  r RECORD;
  cn TEXT;
BEGIN
  FOR r IN
    SELECT table_name AS tbl, column_name AS col
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type = 'uuid'
      AND (column_name ILIKE '%user_id%'
           OR column_name ILIKE '%owner_id%'
           OR column_name ILIKE '%created_by%'
           OR column_name ILIKE '%uploaded_by%')
  LOOP
    cn := r.tbl || '_' || r.col || '_auth_users_fkey';

    IF EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_class c ON con.conrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
      WHERE n.nspname = 'public'
        AND c.relname = r.tbl
        AND a.attname = r.col
        AND con.contype = 'f'
        AND con.confrelid = (
          SELECT oid FROM pg_class
          WHERE relname = 'users'
            AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
        )
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'DELETE FROM public.%I WHERE %I IS NOT NULL AND %I NOT IN (SELECT id FROM auth.users)',
      r.tbl, r.col, r.col
    );

    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
      r.tbl, cn
    );

    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
      r.tbl, cn, r.col
    );
  END LOOP;
END $$;
