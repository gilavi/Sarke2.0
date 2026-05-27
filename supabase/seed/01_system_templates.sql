-- Seed the two MVP system templates, verbatim Georgian content from the
-- reference docx files.

-- ---------- Template A: ფასადის ხარაჩოს შემოწმების აქტი ----------

insert into templates (id, owner_id, name, category, is_system, required_qualifications, required_signer_roles)
values (
  '11111111-1111-1111-1111-111111111111',
  null,
  'ფასადის ხარაჩოს შემოწმების აქტი',
  'xaracho',
  true,
  array['xaracho_inspector'],
  array['expert','xaracho_supervisor','xaracho_assembler']::signer_role[]
)
on conflict (id) do nothing;

-- Section 1: yes/no checklist
insert into questions (template_id, section, "order", type, title) values
 ('11111111-1111-1111-1111-111111111111', 1, 1, 'yesno',
   'გააჩნია თუ არა ხარაჩოს პასპორტი ქართულად ნათარგმნი?'),
 ('11111111-1111-1111-1111-111111111111', 1, 2, 'yesno',
   'გააჩნია თუ არა ხარაჩოს ვადიანი, ქართულად ნათარგმნი სერთიფიკატი?'),
 ('11111111-1111-1111-1111-111111111111', 1, 3, 'yesno',
   'ხარაჩო აწყობილია სწორ და მყარ ზედაპირზე?'),
 ('11111111-1111-1111-1111-111111111111', 1, 4, 'yesno',
   'სამუშაო პლათფორმის გვერდებსა და შენობის ნაგებობას შორის დაშორება აღემატება 25 სანტიმეტრს?'),
 ('11111111-1111-1111-1111-111111111111', 1, 5, 'yesno',
   'ხარაჩოს პლათფორმაზე დამატებით განთავსებულია კუსტარული კიბე ან სადგამი პლათფორმა?');

-- Section 2: component grid
insert into questions (template_id, section, "order", type, title, grid_rows, grid_cols, grid_row_hints) values
 ('11111111-1111-1111-1111-111111111111', 2, 1, 'component_grid',
   'დეტალური აღწერა',
   '["რეგულირებადი დომკრატი","სადგამი, საბაზისო ფირფიტა","ვერტიკალური საყრდენი ჩარჩო","ლუქიანი პლათფორმა","ჰორიზონტალური ქვედა დამცავი დაფა","ზედა და შუა დამცავი მოაჯირი","გვერდის დამცავი მოაჯირი","ასასვლელი კიბე","ანკერული გამაგრება"]'::jsonb,
   '["აღენიშნება დაზიანება","გამართულია","არ გააჩნია"]'::jsonb,
   '[null,"ფირფიტა უნდა ეყრდნობოდეს მთლიანად ზედაპირს მყარად და არ უნდა იყოს დაზიანებული","ჩარჩო არ უნდა იყოს დარუნული, დაზიანებული. მჭიდროდ უნდა იყოს დაერთებული","პლატფორმა უნდა იყოს დაუზიანებელი, აღჭურვილი შესაბამისი სამაგრებით, მუშა პროცესის დროს ლუქი არ უნდა იყოს ღია","10 სმ სიმაღლის დაფა პლატფორმასთან უნდა იყოს მყარად დაფიქსირებული","მოაჯირი უნდა იყოს დაუზიანებელი, საიმედოდ დაფიქსირებული ხარაჩოს საყრდენზე შიდა მხრიდან","გვერდის მოაჯირი ხარაჩოს ორივე მხრიდან უნდა იყოს საიმედოდ დაფიქსირებული","ხარაჩოს ყველა სართულზე უნდა იყოს კიბე, დაუზიანებელი, მყარად დამაგრებული","ანკერო მაგრდება შენობის მყარ კონსტრუქციაზე მჭიდროდ. თვითნაკეთი სამაგრის გამოყენება დაუშვებელია"]'::jsonb);

-- Section 3: photos
insert into questions (template_id, section, "order", type, title) values
 ('11111111-1111-1111-1111-111111111111', 3, 1, 'photo_upload',
   'ხარაჩოს საერთო ფოტოები');

-- Section 4: conclusion
insert into questions (template_id, section, "order", type, title) values
 ('11111111-1111-1111-1111-111111111111', 4, 1, 'freetext',
   'დასკვნითი ნაწილი');

-- ---------- Template B: მობილური ხარაჩოს შემოწმების აქტი ----------

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

insert into questions (template_id, section, "order", type, title, grid_rows, grid_cols) values
 ('33333333-3333-3333-3333-333333333333', 2, 1, 'component_grid',
   'კომპონენტების მდგომარეობა',
   '["რეგულირებადი ხრახნიანი სადგამი ფირფიტა","გადაყირავების საწინააღმდეგო დგარები","ვერტიკალური საყრდენი ჩარჩო","პლატფორმა / ლუქიანი პლატფორმა","დიაგონალური გამაგრება","ზედა და შუა დამცავი მოაჯირი","10 სმ დამცავი დაფა","ასასვლელი კიბე","სამოძრაო გორგოლაჭები და მუხრუჭი"]'::jsonb,
   '["აღენიშნება დაზიანება","გამართულია","არ გააჩნია"]'::jsonb);

insert into questions (template_id, section, "order", type, title) values
 ('33333333-3333-3333-3333-333333333333', 3, 1, 'photo_upload',
   'ხარაჩოს საერთო ფოტოები');

insert into questions (template_id, section, "order", type, title) values
 ('33333333-3333-3333-3333-333333333333', 4, 1, 'freetext',
   'დასკვნითი ნაწილი');

-- ---------- Template C: მობილური ხარაჩოს შემოწმების აქტი N3 ----------

insert into templates (id, owner_id, name, category, is_system, required_qualifications, required_signer_roles)
values (
  '44444444-4444-4444-4444-444444444444',
  null,
  'მობილური ხარაჩოს შემოწმების აქტი N3',
  'mobile_scaffold_n3',
  true,
  array['xaracho_inspector'],
  array['expert','xaracho_supervisor','xaracho_assembler']::signer_role[]
)
on conflict (id) do nothing;

insert into questions (template_id, section, "order", type, title) values
 ('44444444-4444-4444-4444-444444444444', 1, 1, 'yesno',
   'გააჩნია თუ არა ხარაჩოს პასპორტი ქართულად ნათარგმნი?'),
 ('44444444-4444-4444-4444-444444444444', 1, 2, 'yesno',
   'გააჩნია თუ არა ხარაჩოს ვადიანი სერთიფიკატი ქართულად?'),
 ('44444444-4444-4444-4444-444444444444', 1, 3, 'yesno',
   'ხარაჩო განთავსებულია სწორ და მყარ ზედაპირზე?'),
 ('44444444-4444-4444-4444-444444444444', 1, 4, 'yesno',
   'ხარაჩოს პლათფორმა არანაკლებ 80 სმ?'),
 ('44444444-4444-4444-4444-444444444444', 1, 5, 'yesno',
   'პლათფორმაზე კუსტარული კიბე ან სადგამი დამატებულია?');

insert into questions (template_id, section, "order", type, title, grid_rows, grid_cols) values
 ('44444444-4444-4444-4444-444444444444', 2, 1, 'component_grid',
   'კომპონენტების მდგომარეობა',
   '["რეგულირებადი ხრახნიანი საყრდენი ფირფიტა / სტაბილიზატორი","გადაყირავების საწინააღმდეგო დგარები","ვერტიკალური საყრდენი ჩარჩო","პლატფორმა / ლუქიანი პლატფორმა","დიაგონალური გამაგრება","ზედა და შუა დამცავი მოაჯირი","10 სმ დამცავი დაფა","ასასვლელი კიბე","სამოძრაო გორგოლაჭები და მუხრუჭი","ხარაჩოს საყრდენი ჩარჩო","ხარაჩოს ზედა ჩარჩო","გამაგრების საკეტი"]'::jsonb,
   '["აღენიშნება დაზიანება","გამართულია","არ გააჩნია"]'::jsonb);

insert into questions (template_id, section, "order", type, title) values
 ('44444444-4444-4444-4444-444444444444', 3, 1, 'photo_upload',
   'ხარაჩოს საერთო ფოტოები');

insert into questions (template_id, section, "order", type, title) values
 ('44444444-4444-4444-4444-444444444444', 4, 1, 'freetext',
   'დასკვნითი ნაწილი');

-- ---------- Template D: დამცავი ქამრების შემოწმების აქტი ----------

insert into templates (id, owner_id, name, category, is_system, required_qualifications, required_signer_roles)
values (
  '22222222-2222-2222-2222-222222222222',
  null,
  'დამცავი ქამრების შემოწმების აქტი',
  'harness',
  true,
  array['harness_inspector'],
  array['expert']::signer_role[]
)
on conflict (id) do nothing;

-- Section 1: harness grid (rows are dynamic N1-N15, app generates on the fly
-- but we store the template column set here)
insert into questions (template_id, section, "order", type, title, grid_rows, grid_cols) values
 ('22222222-2222-2222-2222-222222222222', 1, 1, 'component_grid',
   'უსაფრთხოების ღვედების შემოწმება',
   '["N1","N2","N3","N4","N5","N6","N7","N8","N9","N10","N11","N12","N13","N14","N15"]'::jsonb,
   -- EN keys kept here for future i18n switcher:
   -- ["Shoulder Straps","Chest Strap","Side D-Ring","Leg Straps","Waist Belt",
   --  "Locking Hook","Rope Protector","Safety Rope","Locking Carabiner","Energy Absorber"]
   '["მხრის ღვედები","მკერდის ღვედი","გვერდითი D-ბეჭდები","ფეხის ღვედი","წელის ღვედი","ჩამკეტიანი კავი","თოკის დამცავი","დამცავი თოკი","ჩამკეტი კარაბინი","ენერგიის შთანთქმის მოწყობილობა"]'::jsonb);

-- Section 2: conclusion
insert into questions (template_id, section, "order", type, title) values
 ('22222222-2222-2222-2222-222222222222', 3, 1, 'freetext',
   'დასკვნითი ნაწილი');
