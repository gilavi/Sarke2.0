-- Add 'other' to the signer_role enum so freeform crew members captured via
-- the project participants widget (CrewRoleKey = 'other') can flow into the
-- `signatures` table on PDF generation.
--
-- The unique(inspection_id, signer_role) constraint stays — `project.crew`
-- already enforces one member per roleKey, so at most one 'other' signer
-- exists per inspection.

alter type signer_role add value if not exists 'other';
