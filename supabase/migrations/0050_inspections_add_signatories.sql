-- Migration 0050: Add signatories JSONB column to inspections
-- Each element: { name: string, role: string, signature: string, signed_at: string }
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS signatories JSONB NOT NULL DEFAULT '[]'::jsonb;
