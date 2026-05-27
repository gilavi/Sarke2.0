-- email_exists(p_email text) — returns true if an account with the given
-- email is registered. Used by the login screen to distinguish
-- "no such account" from "wrong password", and to gate the password-reset
-- suggestion that fires after repeated failed sign-in attempts.
--
-- SECURITY DEFINER because RLS hides auth.users from anon and authenticated
-- roles. This is a deliberate user-enumeration vector — the trade-off is
-- accepted to provide clear login errors (same modern UX Apple/Google now
-- expose). Mitigations: the function returns a single boolean (no PII
-- leakage beyond existence), and PostgREST applies per-second rate limits
-- at the API gateway, so brute-force enumeration of large lists is bounded.
--
-- Granted to `anon` because the login screen is hit before a session exists.
CREATE OR REPLACE FUNCTION public.email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE lower(email) = lower(p_email)
  );
$$;

GRANT EXECUTE ON FUNCTION public.email_exists(text) TO anon, authenticated;
