-- Add optional contact phone number to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS contact_phone text;
