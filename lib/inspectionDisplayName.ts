// Maps the formal `templates.name` (as stored in the DB / used in PDF reports)
// to the short UI display name shown in list rows, cards, and screen titles.
//
// PDF reports and any legal/printed artifact MUST continue to use the full
// formal name (e.g. `ექსკავატორის ტექნიკური შემოწმების აქტი`). Do NOT call this
// helper from `lib/pdf/**`.
//
// Templates added later that already have short Georgian names
// (`უსაფრთხოების ბადე`, `მობილური კიბე`, `დამჭერი მოწყობილობა`,
//  `ჩანგლიანი დამტვირთველი`, `ამწე მოწყ. / სლინგი / ჩამჭ.`) fall through the
// map unchanged and render as-is.

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
