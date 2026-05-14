-- Mobile scaffold N3 inspection template.
-- Identical to mobile_scaffold (0041) except:
--   - item 6 has a longer name (includes "/ სტაბილიზატორი")
--   - 3 extra component rows (items 15-17)
-- No new tables, screens, or routing changes needed.
--
-- Template UUID: 44444444-4444-4444-4444-444444444444

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

-- Section 1: yes/no checklist — identical to N1
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

-- Section 2: component grid — 12 rows (9 from N1 + 3 new; item 6 name differs)
insert into questions (template_id, section, "order", type, title, grid_rows, grid_cols) values
 ('44444444-4444-4444-4444-444444444444', 2, 1, 'component_grid',
   'კომპონენტების მდგომარეობა',
   '["რეგულირებადი ხრახნიანი საყრდენი ფირფიტა / სტაბილიზატორი","გადაყირავების საწინააღმდეგო დგარები","ვერტიკალური საყრდენი ჩარჩო","პლატფორმა / ლუქიანი პლატფორმა","დიაგონალური გამაგრება","ზედა და შუა დამცავი მოაჯირი","10 სმ დამცავი დაფა","ასასვლელი კიბე","სამოძრაო გორგოლაჭები და მუხრუჭი","ხარაჩოს საყრდენი ჩარჩო","ხარაჩოს ზედა ჩარჩო","გამაგრების საკეტი"]'::jsonb,
   '["აღენიშნება დაზიანება","გამართულია","არ გააჩნია"]'::jsonb);

-- Section 3: summary photos
insert into questions (template_id, section, "order", type, title) values
 ('44444444-4444-4444-4444-444444444444', 3, 1, 'photo_upload',
   'ხარაჩოს საერთო ფოტოები');

-- Section 4: conclusion (skipped as standalone step by wizard.tsx)
insert into questions (template_id, section, "order", type, title) values
 ('44444444-4444-4444-4444-444444444444', 4, 1, 'freetext',
   'დასკვნითი ნაწილი');
