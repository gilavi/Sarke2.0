// Canonical catalog for briefing (ინსტრუქტაჟი) topics.
//
// Single source of truth for the topic KEYS and their Georgian labels, shared
// by the picker (components/briefings/TopicSelector — which adds the icons) and
// the PDF (lib/briefingPdf). Georgian is the authoritative label language: the
// PDF is always Georgian, and locales/ka.json mirrors BRIEFING_TOPIC_LABELS_KA
// key-for-key (guarded by tests/unit/briefingTopics.test.ts). English labels
// live only in locales/en.json (the app UI).
//
// Source document: „ინსტრუქტაჟის აღრიცხვის ჟურნალი" — its 15 თემატიკა rows,
// in the document's order. `other` (free text, stored as `custom:<text>`) is the
// only non-document entry and always sorts last.
//
// Pure module — NO react-native / lucide imports, so it stays unit-testable.

/** The 15 catalog topics (document order) + the free-text `other`. */
export const BRIEFING_TOPIC_KEYS = [
  'labor_safety_principles',
  'workplace_electrical',
  'evacuation',
  'risk_control',
  'height_work',
  'internal_regulations',
  'first_aid',
  'safety_signs',
  'load_handling',
  'heavy_machinery',
  'ergonomics',
  'monitor_radiation',
  'housekeeping',
  'technical_equipment',
  'chemical_safety',
  'other',
] as const;

export type BriefingTopicKey = (typeof BRIEFING_TOPIC_KEYS)[number];

/** Georgian labels for the catalog topics (used by the PDF + mirrored in ka.json). */
export const BRIEFING_TOPIC_LABELS_KA: Record<string, string> = {
  labor_safety_principles: 'შრომის უსაფრთხოების ნორმები და პრინციპები',
  workplace_electrical: 'სამუშაო სივრცისა და ელექტრო უსაფრთხოება',
  evacuation: 'საგანგებო სიტუაციები და ევაკუაცია',
  risk_control: 'საფრთხეები, რისკები და მათი კონტროლი',
  height_work: 'სიმაღლეზე მუშაობის უსაფრთხოება',
  internal_regulations: 'კომპანიის შინაგანაწესი',
  first_aid: 'პირველადი სამედიცინო დახმარება',
  safety_signs: 'უსაფრთხოების ნიშნები და მათი მნიშვნელობა',
  load_handling: 'ტვირთის სწორი ჩაბმა და გადაადგილება',
  heavy_machinery: 'მძიმე ტექნიკის უსაფრთხო ექსპლუატაცია',
  ergonomics: 'ერგონომიკა და მიკროკლიმატი',
  monitor_radiation: 'მონიტორის გამოსხივების უსაფრთხოება',
  housekeeping: 'სამუშაო სივრცის დალაგება-დასუფთავება',
  technical_equipment: 'ტექნიკური აღჭურვილობის უსაფრთხო ექსპლუატაცია',
  chemical_safety: 'ქიმიური ნივთიერებების უსაფრთხოება',
  other: 'სხვა',
};

/**
 * Legacy keys retired from the picker but kept so historical briefings that
 * stored them still render a real label (in the row, avatar, and PDF) instead
 * of the raw key. Do not offer these as new choices.
 */
export const LEGACY_BRIEFING_TOPIC_LABELS_KA: Record<string, string> = {
  scaffold_safety: 'ხარაჩოს უსაფრთხოება',
  ppe: 'დამცავი აღჭურვილობა',
  fire_safety: 'ხანძარსაწინააღმდეგო',
};

/** Every known topic key (catalog + legacy) — for label/icon resolution. */
export const KNOWN_BRIEFING_TOPIC_KEYS: readonly string[] = [
  ...BRIEFING_TOPIC_KEYS,
  ...Object.keys(LEGACY_BRIEFING_TOPIC_LABELS_KA),
];

/** Merged Georgian labels (catalog + legacy) for PDF rendering. */
export const ALL_BRIEFING_TOPIC_LABELS_KA: Record<string, string> = {
  ...BRIEFING_TOPIC_LABELS_KA,
  ...LEGACY_BRIEFING_TOPIC_LABELS_KA,
};
