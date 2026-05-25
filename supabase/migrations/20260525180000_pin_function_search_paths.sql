-- Pin search_path on all public functions to immunize against missing-type
-- errors when functions are invoked from contexts with restricted search_path
-- (e.g. auth.admin operations).
--
-- Root cause discovered tonight: trigger functions block_answer_write_when_completed
-- and block_answer_photo_write_when_completed declared variables of type
-- questionnaire_status (a public-schema enum). When auth.admin.deleteUser ran with
-- empty search_path, those functions could not resolve the type, aborting the
-- delete and producing the "Database error deleting user" 500 in TestFlight.

DO $$
DECLARE func RECORD;
BEGIN
  FOR func IN
    SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proconfig IS NULL
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', func.sig);
  END LOOP;
END $$;
