// Web-app mirror of the mobile `lib/inspectionDisplayName.ts` helper.
// Mobile and web-app are separate codebases (only Supabase is shared), so the
// mapping is duplicated here intentionally. Keep the two files in sync — if
// you add a new template, update both.
//
// Maps the formal `templates.name` (as stored in the DB / used in PDF reports)
// to the short UI display name shown in dashboard list rows, cards, and
// titles. PDF prints (`web-app/src/pages/print/*`) MUST continue to use the
// full formal name.

const DISPLAY_NAME_MAP: Record<string, string> = {
  'ფასადის ხარაჩოს შემოწმების აქტი': 'ფასადის ხარაჩო',
  'მობილური ხარაჩოს შემოწმების აქტი': 'მობილური ხარაჩო',
  'მობილური ხარაჩოს შემოწმების აქტი N3': 'მობილური ხარაჩო N3',
  'დამცავი ქამრების შემოწმების აქტი': 'დამცავი ქამრები',
  'ციცხვიანი დამტვირთველის შემოწმების აქტი': 'ციცხვიანი დამტვირთველი',
  'დიდი ციცხვიანი დამტვირთველის შემოწმება': 'დიდი ციცხვიანი დამტვირთველი',
  'ექსკავატორის ტექნიკური შემოწმების აქტი': 'ექსკავატორი',
  'ტექნიკური აღჭურვილობის შემოწმების აქტი': 'ტექნიკური აღჭურვილობა',
  'ტვირთის მიმღები პლატფორმის შემოწმების აქტი': 'ტვირთის მიმღები პლატფორმა',
};

export function getInspectionDisplayName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return DISPLAY_NAME_MAP[fullName] ?? fullName;
}
