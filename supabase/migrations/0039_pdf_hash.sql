-- Add pdf_hash column to all tables that store generated PDF URLs.
-- Populated after PDF generation via hashPdf() in lib/pdfSecurity.ts.
-- Used by verifyPdf() to detect post-generation tampering.

ALTER TABLE certificates ADD COLUMN IF NOT EXISTS pdf_hash TEXT;
ALTER TABLE incidents    ADD COLUMN IF NOT EXISTS pdf_hash TEXT;
ALTER TABLE reports      ADD COLUMN IF NOT EXISTS pdf_hash TEXT;
ALTER TABLE orders       ADD COLUMN IF NOT EXISTS pdf_hash TEXT;
