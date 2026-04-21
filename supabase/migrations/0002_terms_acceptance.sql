-- Track T&C acceptance on the user profile.
-- When TERMS_VERSION in the app is bumped, existing users whose
-- tc_accepted_version < current version are prompted to re-accept on next sign-in.

alter table users
  add column if not exists tc_accepted_version text,
  add column if not exists tc_accepted_at timestamptz;
