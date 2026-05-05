-- Adds სახელმწიფო / ს.ნ ნომერი (state plate number) to excavator inspections,
-- mirroring the registration_number column on bobcat_inspections.

alter table excavator_inspections
  add column if not exists registration_number text;
