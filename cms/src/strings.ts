// All CMS interface text, in Georgian — the editor is a Georgian-only,
// non-technical user, so nothing here is in English.
export const T = {
  title: 'Hubble — ტექსტების რედაქტორი',
  subtitle: 'მოძებნეთ ან აირჩიეთ განყოფილება, შეასწორეთ ტექსტი და დააჭირეთ „შენახვა“. ცვლილება აისახება აპის მომდევნო გახსნისას.',

  // Password gate
  passwordPrompt: 'გასაგრძელებლად შეიყვანეთ პაროლი.',
  passwordPlaceholder: 'პაროლი',
  enter: 'შესვლა',
  checking: 'მოწმდება…',
  wrongPassword: 'არასწორი პაროლი.',
  connectError: 'დაკავშირება ვერ მოხერხდა. სცადეთ თავიდან.',

  // Filters
  searchPlaceholder: 'ძებნა ტექსტის მიხედვით…',
  allSections: 'ყველა განყოფილება',
  missingOnly: 'თარგმანი აკლია',
  count: (n: number) => `${n} ტექსტი`,
  showingOf: (shown: number, total: number) => `ნაჩვენებია ${shown} / ${total} — დააზუსტეთ ძებნა`,
  noMatch: 'არჩეულ ფილტრს ვერაფერი ემთხვევა.',

  // Row
  english: 'ინგლისური',
  georgian: 'ქართული',
  edited: 'შეცვლილია',
  keepTokens: 'არ შეცვალოთ — ავტომატურად ჩაისმება:',
  brokenTokens: 'დააბრუნეთ ეს სიმბოლო ისე, როგორც იყო:',

  // Save bar
  noUnsaved: 'შენახვის მოლოდინში არაფერია',
  unsaved: (n: number) => `შესანახია: ${n}`,
  saved: 'შენახულია — აისახება აპის მომდევნო გახსნისას.',
  saveBtn: 'შენახვა',
  saving: 'ინახება…',
  saveError: 'შენახვა ვერ მოხერხდა. შეამოწმეთ კავშირი და სცადეთ თავიდან.',
  staleError: 'ტექსტები შეიცვალა სერვერზე. გადატვირთეთ გვერდი და სცადეთ თავიდან.',
  fixTokensFirst: (n: number) =>
    `${n} ტექსტში დაზიანდა ავტომატური სიმბოლო ({{…}}). შეასწორეთ წითლად მონიშნული, შემდეგ შეინახეთ.`,
};
