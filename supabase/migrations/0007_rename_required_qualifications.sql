-- 0007_rename_required_qualifications.sql
--
-- Cleanup: the `templates.required_cert_types` column semantically holds
-- the `qualifications.type` values required by a template (after the 0006
-- decoupling renamed the old `certificates` table to `qualifications`).
-- Rename the column so code reads naturally.
--
-- No other tables or types depend on the column name; array values stay as
-- text (e.g. 'xaracho_inspector').

alter table templates
  rename column required_cert_types to required_qualifications;
