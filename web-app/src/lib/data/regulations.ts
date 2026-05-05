export interface Regulation {
  id: string;
  title: string;
  description: string;
  url: string;
}

// Mirrors lib/regulations.ts (mobile). Kept as a flat list — no scraping,
// no AsyncStorage. If a new regulation is added in the mobile app, copy
// the entry here too.
export const REGULATIONS: Regulation[] = [
  {
    id: '4486188',
    title: 'შრომის უსაფრთხოების შესახებ (ორგანული კანონი)',
    description: 'ძირითადი ორგანული კანონი შრომის უსაფრთხოების სფეროში.',
    url: 'https://matsne.gov.ge/ka/document/view/4486188',
  },
  {
    id: '4103880',
    title: 'შრომის უსაფრთხოების შესახებ (კანონი)',
    description: 'შრომის უსაფრთხოების ზოგადი ნორმები და ვალდებულებები.',
    url: 'https://matsne.gov.ge/ka/document/view/4103880',
  },
  {
    id: '1155567',
    title: 'საქართველოს შრომის კოდექსი',
    description: 'შრომითი ურთიერთობების მარეგულირებელი კოდექსი.',
    url: 'https://matsne.gov.ge/ka/document/view/1155567',
  },
  {
    id: '5572284',
    title: 'სამუშაო სივრცის უსაფრთხოების ნიშნების ტექნიკური რეგლამენტი',
    description: 'უსაფრთხოების ნიშნების ფორმის, ფერისა და გამოყენების წესები.',
    url: 'https://matsne.gov.ge/ka/document/view/5572284',
  },
  {
    id: '4486188-scaffold',
    title: 'ფასადის ხარაჩოების ტექნიკური რეგლამენტი',
    description: 'ხარაჩოების აწყობის, ექსპლუატაციისა და დემონტაჟის ნორმები.',
    url: 'https://matsne.gov.ge/ka/document/view/4486188',
  },
];
