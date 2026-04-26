import { IllustrationKey, illustrationKeyFor } from '../components/QuestionAvatar';

export interface ScaffoldHelpEntry {
  key: IllustrationKey;
  name: string;
  oneLiner: string;
}

// Section 1 questions — also get a "?" help icon, but are NOT shown in the
// onboarding tour (the tour focuses on the 9 scaffold components).
export const SECTION1_HELP: ScaffoldHelpEntry[] = [
  {
    key: 'passport',
    name: 'ხარაჩოს პასპორტი',
    oneLiner: 'შეამოწმე, რომ პასპორტი გაცემულია და მოქმედია.',
  },
  {
    key: 'certificate',
    name: 'სერთიფიკატი',
    oneLiner: 'ხარაჩოს გამოსაყენებლად საჭიროა მოქმედი სერთიფიკატი.',
  },
  {
    key: 'levelSurface',
    name: 'მყარი/სწორი ზედაპირი',
    oneLiner: 'ხარაჩო უნდა იდგეს მყარ, სწორ და მდგრად ზედაპირზე.',
  },
  {
    key: 'distance25',
    name: '25 მეტრიანი დაშორება',
    oneLiner: 'შეამოწმე ელ.სადენებიდან მინიმუმ 25 მეტრის დაცილება.',
  },
  {
    key: 'improvisedLadder',
    name: 'კუსტარული/თვითნაკეთი კიბე',
    oneLiner: 'არ გამოიყენო კუსტარული ან თვითნაკეთი კიბე.',
  },
];

export const SCAFFOLD_HELP: ScaffoldHelpEntry[] = [
  {
    key: 'jack',
    name: 'რეგულირებადი დომკრატი',
    oneLiner: 'შეამოწმე ხრახნი არ არის გადახრილი ან დაზიანებული.',
  },
  {
    key: 'basePlate',
    name: 'სადგამი/საბაზისო ფირფიტა',
    oneLiner: 'ფირფიტა მთლიანად ეყრდნობა მყარ ზედაპირს.',
  },
  {
    key: 'vertFrame',
    name: 'ვერტიკალური საყრდენი ჩარჩო',
    oneLiner: 'ჩარჩო არ არის მოღუნული, შესაერთებლები მთელია.',
  },
  {
    key: 'hatchPlatform',
    name: 'ლუქიანი პლათფორმა',
    oneLiner: 'ლუქი ღიად ფიქსირდება, ზედაპირი არ არის გაცვეთილი.',
  },
  {
    key: 'toeBoard',
    name: 'ჰორიზონტალური ქვედა დამცავი დაფა',
    oneLiner: 'დაფა მთელ პერიმეტრზეა და მაგრად ფიქსირდება.',
  },
  {
    key: 'topMidRail',
    name: 'ზედა და შუა დამცავი მოაჯირი',
    oneLiner: 'ორივე დონის მოაჯირი ადგილზეა და არ ირყევა.',
  },
  {
    key: 'sideRail',
    name: 'გვერდის დამცავი მოაჯირი',
    oneLiner: 'გვერდის მოაჯირები მთელ პერიმეტრზეა დამონტაჟებული.',
  },
  {
    key: 'ladder',
    name: 'ასასვლელი კიბე',
    oneLiner: 'კიბე უსაფრთხოდ ფიქსირდება, საფეხურები მთელია.',
  },
  {
    key: 'anchor',
    name: 'ანკერული გამაგრება',
    oneLiner: 'გამაგრება უძრავად დამაგრებულია კედელზე/კონსტრუქციაზე.',
  },
];

const BY_KEY: Record<string, ScaffoldHelpEntry> = [
  ...SCAFFOLD_HELP,
  ...SECTION1_HELP,
].reduce(
  (acc, e) => {
    acc[e.key] = e;
    return acc;
  },
  {} as Record<string, ScaffoldHelpEntry>,
);

// TODO: harness help copy — fill once user provides per-row guidance
const HARNESS_FALLBACK: ScaffoldHelpEntry = {
  key: 'certificate',
  name: '',
  oneLiner: 'შეამოწმე კომპონენტის მთლიანობა და მექანიკური დაზიანებები.',
};

export function helpForRow(rowLabel: string | null | undefined): ScaffoldHelpEntry {
  const key = illustrationKeyFor(rowLabel);
  if (key && BY_KEY[key]) return BY_KEY[key];
  return { ...HARNESS_FALLBACK, name: rowLabel ?? '' };
}

export const TOUR_SEEN_KEY = 'haraco_tour_seen';
