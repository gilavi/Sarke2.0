-- Project logo (optional). Stored as a base64 data URL on the row so it
-- renders everywhere — list, header, PDF — without a separate storage
-- fetch. Initials are derived from `name` at render time and not stored.
alter table projects add column if not exists logo text;
