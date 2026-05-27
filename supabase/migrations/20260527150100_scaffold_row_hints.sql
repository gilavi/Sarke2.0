-- Add grid_row_hints to questions table for per-row inspection guidance text.
--
-- Rationale: ClickUp comments 2–9 on "ფასადის ხარაჩოს შემოწმების აქტი"
-- specify inspector guidance text for each of the 9 component grid rows.
-- grid_row_hints is a nullable JSONB array parallel to grid_rows; null entries
-- mean no hint for that row.  Non-scaffold question types leave it null.
--
-- Apply via:
--   supabase db query --linked --file supabase/migrations/20260527150100_scaffold_row_hints.sql

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS grid_row_hints jsonb;

-- Populate hints for ფასადის ხარაჩოს შემოწმების აქტი (system template A).
-- Rows: [დომკრატი, სადგამი/ფირფიტა, ჩარჩო, პლათფორმა, დაფა, ზედა მოაჯირი,
--        გვერდის მოაჯირი, კიბე, ანკერი]  — index 0 has no comment from field test.
UPDATE questions
  SET grid_row_hints = '[
    null,
    "ფირფიტა უნდა ეყრდნობოდეს მთლიანად ზედაპირს მყარად და არ უნდა იყოს დაზიანებული",
    "ჩარჩო არ უნდა იყოს დარუნული, დაზიანებული. მჭიდროდ უნდა იყოს დაერთებული",
    "პლატფორმა უნდა იყოს დაუზიანებელი, აღჭურვილი შესაბამისი სამაგრებით, მუშა პროცესის დროს ლუქი არ უნდა იყოს ღია",
    "10 სმ სიმაღლის დაფა პლატფორმასთან უნდა იყოს მყარად დაფიქსირებული",
    "მოაჯირი უნდა იყოს დაუზიანებელი, საიმედოდ დაფიქსირებული ხარაჩოს საყრდენზე შიდა მხრიდან",
    "გვერდის მოაჯირი ხარაჩოს ორივე მხრიდან უნდა იყოს საიმედოდ დაფიქსირებული",
    "ხარაჩოს ყველა სართულზე უნდა იყოს კიბე, დაუზიანებელი, მყარად დამაგრებული",
    "ანკერო მაგრდება შენობის მყარ კონსტრუქციაზე მჭიდროდ. თვითნაკეთი სამაგრის გამოყენება დაუშვებელია"
  ]'::jsonb
WHERE template_id = '11111111-1111-1111-1111-111111111111'
  AND type = 'component_grid';
