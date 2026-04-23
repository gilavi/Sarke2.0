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
insert into questions (template_id, section, "order", type, title, grid_rows, grid_cols) values
 ('11111111-1111-1111-1111-111111111111', 2, 1, 'component_grid',
   'დეტალური აღწერა',
   '["რეგულირებადი დომკრატი","სადგამი, საბაზისო ფირფიტა","ვერტიკალური საყრდენი ჩარჩო","ლუქიანი პლათფორმა","ჰორიზონტალური ქვედა დამცავი დაფა","ზედა და შუა დამცავი მოაჯირი","გვერდის დამცავი მოაჯირი","ასასვლელი კიბე","ანკერული გამაგრება"]'::jsonb,
   '["აღენიშნება დაზიანება","გამართულია","არ გააჩნია"]'::jsonb);

-- Section 3: photos
insert into questions (template_id, section, "order", type, title) values
 ('11111111-1111-1111-1111-111111111111', 3, 1, 'photo_upload',
   'ხარაჩოს საერთო ფოტოები');

-- Section 4: conclusion
insert into questions (template_id, section, "order", type, title) values
 ('11111111-1111-1111-1111-111111111111', 4, 1, 'freetext',
   'დასკვნითი ნაწილი');

-- ---------- Template B: დამცავი ქამრების შემოწმების აქტი ----------

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
