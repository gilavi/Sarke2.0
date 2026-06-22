-- ui_strings: runtime overlay for the mobile app's i18n texts.
--
-- The mobile app ships its UI strings bundled in locales/en.json + locales/ka.json
-- (loaded synchronously by lib/i18n.ts). This table lets non-engineer co-workers
-- *correct* those texts via the password-gated CMS (cms/, hubble.ge/cms/) without
-- shipping a new App Store build: the app fetches these rows on launch and overlays
-- them on top of the bundled defaults (see lib/i18nOverlay.ts). The bundled JSON
-- remains the offline / first-launch fallback, so a missing/failed fetch is harmless.
--
-- One row per flattened, dotted i18n key (e.g. 'common.save'); array members get
-- numeric segments (e.g. 'calendar.monthLabels.0'). Seeded from the locale files by
-- scripts/seed-ui-strings.mjs.
--
-- SECURITY: This is the first intentionally PUBLIC-READ table in the schema. It is
-- safe because it holds only non-sensitive UI labels (no PII, no business data) and
-- the login screen needs strings before any user is authenticated. Writes are NOT
-- public: there is no write policy, so anon/authenticated clients cannot mutate it.
-- All edits go through the cms-texts edge function using the service role, which
-- bypasses RLS. See cms/AGENTS.md.

create table if not exists public.ui_strings (
  key        text primary key,            -- dotted path, e.g. 'common.save'
  en         text,                        -- English value (nullable: not every key has both langs)
  ka         text,                        -- Georgian value
  updated_at timestamptz not null default now(),
  updated_by text                         -- free-text editor name from the CMS (no real accounts)
);

alter table public.ui_strings enable row level security;

-- Apps (anon key) read freely. Non-sensitive labels; needed pre-login.
drop policy if exists "ui_strings public read" on public.ui_strings;
create policy "ui_strings public read" on public.ui_strings
  for select using (true);

-- Deliberately NO insert/update/delete policy: clients cannot write.
-- The cms-texts edge function uses the service role for all mutations.
