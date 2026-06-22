// Plain-Georgian label for each top-level key namespace, so a non-technical
// editor sees *where in the app* a text lives instead of a code word.
// Unmapped namespaces fall back to the raw key.
export const SECTION_LABELS: Record<string, string> = {
  a11y: 'ხმოვანი წამკითხველის ტექსტები',
  account: 'ანგარიში',
  auth: 'შესვლა / რეგისტრაცია',
  briefings: 'ინსტრუქტაჟები',
  calendar: 'კალენდარი',
  certificates: 'სერტიფიკატები',
  common: 'საერთო (ღილაკები, სტატუსები)',
  components: 'საერთო ელემენტები',
  crew: 'ბრიგადა',
  errors: 'შეცდომის შეტყობინებები',
  geocode: 'მისამართის ძებნა',
  history: 'ისტორია',
  home: 'მთავარი გვერდი',
  inspections: 'ინსპექტირებები',
  more: 'მენიუ „მეტი“',
  notFound: 'გვერდი ვერ მოიძებნა',
  notifications: 'შეტყობინებები',
  pdf: 'PDF დოკუმენტები',
  projectSigner: 'პროექტის ხელმომწერი',
  projects: 'პროექტები',
  qualifications: 'კვალიფიკაციები',
  regulations: 'რეგულაციები',
  remoteSigner: 'დისტანციური ხელმოწერა',
  roles: 'როლები',
  signature: 'ხელმოწერა',
  tabs: 'ქვედა მენიუ',
  termsScreen: 'წესები და პირობები',
};

export function sectionLabel(ns: string): string {
  return SECTION_LABELS[ns] ?? ns;
}
