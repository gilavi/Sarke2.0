-- Add inspector_signature to the inspections table so web-app can capture
-- a signature on harness / scaffolding inspection forms.
alter table inspections
  add column if not exists inspector_signature text;  -- base64 PNG, same convention as other inspection tables
