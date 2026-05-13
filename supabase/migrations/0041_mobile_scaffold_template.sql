-- Mobile scaffold inspection template.
-- Reuses the generic inspections/questions/answers tables and the existing
-- wizard screen — no new tables needed.
--
-- Template UUID: 33333333-3333-3333-3333-333333333333
-- Same signer roles as facade scaffold (expert + supervisor + assembler).

insert into templates (id, owner_id, name, category, is_system, required_qualifications, required_signer_roles)
values (
  '33333333-3333-3333-3333-333333333333',
  null,
  'მობილური ხარაჩოს შემოწმების აქტი',
  'mobile_scaffold',
  true,
  array['xaracho_inspector'],
  array['expert','xaracho_supervisor','xaracho_assembler']::signer_role[]
)
on conflict (id) do nothing;

-- Section 1: yes/no checklist (5 items)
-- Item 5 is intentionally worded so that "კი" (yes) = problem (inverted logic).
insert into questions (template_id, section, "order", type, title) values
 ('33333333-3333-3333-3333-333333333333', 1, 1, 'yesno',
   'გააჩნია თუ არა ხარაჩოს პასპორტი ქართულად ნათარგმნი?'),
 ('33333333-3333-3333-3333-333333333333', 1, 2, 'yesno',
   'გააჩნია თუ არა ხარაჩოს ვადიანი სერთიფიკატი ქართულად?'),
 ('33333333-3333-3333-3333-333333333333', 1, 3, 'yesno',
   'ხარაჩო განთავსებულია სწორ და მყარ ზედაპირზე?'),
 ('33333333-3333-3333-3333-333333333333', 1, 4, 'yesno',
   'ხარაჩოს პლათფორმა არანაკლებ 80 სმ?'),
 ('33333333-3333-3333-3333-333333333333', 1, 5, 'yesno',
   'პლათფორმაზე კუსტარული კიბე ან სადგამი დამატებულია?');

-- Section 2: component grid (9 mobile scaffold components)
-- Columns match the facade scaffold exactly so GridRowStep reuses the same
-- scaffoldColStyle colour logic (damage=red, working=accent, none=gray).
insert into questions (template_id, section, "order", type, title, grid_rows, grid_cols) values
 ('33333333-3333-3333-3333-333333333333', 2, 1, 'component_grid',
   'კომპონენტების მდგომარეობა',
   '["რეგულირებადი ხრახნიანი სადგამი ფირფიტა","გადაყირავების საწინააღმდეგო დგარები","ვერტიკალური საყრდენი ჩარჩო","პლატფორმა / ლუქიანი პლატფორმა","დიაგონალური გამაგრება","ზედა და შუა დამცავი მოაჯირი","10 სმ დამცავი დაფა","ასასვლელი კიბე","სამოძრაო გორგოლაჭები და მუხრუჭი"]'::jsonb,
   '["აღენიშნება დაზიანება","გამართულია","არ გააჩნია"]'::jsonb);

-- Section 3: summary photos (folded into the conclusion screen by wizard.tsx)
insert into questions (template_id, section, "order", type, title) values
 ('33333333-3333-3333-3333-333333333333', 3, 1, 'photo_upload',
   'ხარაჩოს საერთო ფოტოები');

-- Section 4: conclusion (skipped as a standalone step; conclusion textarea lives
-- on the conclusion screen which every wizard flow shares)
insert into questions (template_id, section, "order", type, title) values
 ('33333333-3333-3333-3333-333333333333', 4, 1, 'freetext',
   'დასკვნითი ნაწილი');
