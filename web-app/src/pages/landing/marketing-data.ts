import {
  ClipboardList,
  MapPin,
  Lock,
  PenLine,
  Calendar,
  BookOpen,
  AlertTriangle,
  GraduationCap,
  FileBarChart,
  HardHat,
  Building2,
  Briefcase,
  ShieldCheck,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Fingerprint,
  Server,
  Zap,
  CloudOff,
  type LucideIcon,
} from 'lucide-react';

export type FAQItem = { q: string; a: string };

export const painPoints = [
  { emoji: '🗂', text: 'საათობით ქაღალდზე ხელით ავსებ ფორმებს' },
  { emoji: '📋', text: 'PDF-ს ვერ გააკეთებ სამშენებლო მოედნიდან — მოგიწევს ოფისში დაბრუნება' },
  { emoji: '⚠️', text: 'ინსპექცია ჩამოვა და დოკუმენტაცია არასრული' },
];

export const steps = [
  { n: '01', title: 'შეარჩიე შემოწმების ტიპი', desc: '10+ შაბლონი: ხარაჩო, ექსკავატორი, ქამარი, ბობკატი და სხვა', label: 'template selector' },
  { n: '02', title: 'შეავსე პირდაპირ ობიექტზე', desc: 'GPS ფოტოები, ხელმოწერები, კომენტარები — ყველაფერი ერთ ადგილას', label: 'checklist screen' },
  { n: '03', title: 'PDF — 30 წამში', desc: 'სრული, დაცული, ციფრულად ხელმოწერილი დოკუმენტი', label: 'PDF result' },
];

export const features: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: ClipboardList, title: '10+ შემოწმების შაბლონი', desc: 'ფასადის ხარაჩო, ქამარი, ბობკატი, ექსკავატორი...' },
  { Icon: MapPin, title: 'GPS ფოტო ტეგირება', desc: 'ყოველი ფოტო — ლოკაციით და დროის ნიშნულით' },
  { Icon: Lock, title: 'დაშიფრული PDF', desc: 'SHA256 ჰეში, კანონიერი ძალის მქონე დოკუმენტი' },
  { Icon: PenLine, title: 'ციფრული ხელმოწერები', desc: 'პირდაპირ ეკრანზე, PDF-ში ჩაშენებული' },
  { Icon: Calendar, title: 'კალენდარი და შეხსენებები', desc: '10-დღიანი ციკლი, ვადაგადაცილების გაფრთხილება' },
  { Icon: BookOpen, title: 'ქართული კანონმდებლობა', desc: '№477 დადგენილება, matsne.gov.ge მონიტორინგი' },
];

/** The four product pillars surfaced on the Home "Features" section. */
export const subModules: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: ClipboardList, title: 'აქტები', desc: 'ციფრული შემოწმების აქტები — ხარაჩო, ამწე, ქამარი და სხვა, PDF-ად წამებში.' },
  { Icon: AlertTriangle, title: 'ინციდენტი', desc: 'უბედური შემთხვევებისა და კინაღამ-ინციდენტების აღრიცხვა და ანგარიში.' },
  { Icon: GraduationCap, title: 'ინსტრუქტაჟი', desc: 'თანამშრომელთა ინსტრუქტაჟის ჩატარება და ხელმოწერების ფიქსაცია.' },
  { Icon: FileBarChart, title: 'რეპორტები', desc: 'სტატისტიკა და პერიოდული ანგარიშები ერთ სივრცეში.' },
];

/** "ვისთვის" — target audiences on the Home page. */
export const audiences: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: ShieldCheck, title: 'შრომის უსაფრთხოების სპეციალისტი', desc: 'ერთ აპლიკაციაში — შემოწმება, ხელმოწერა და დაცული PDF.' },
  { Icon: Building2, title: 'სამშენებლო კომპანია', desc: 'ყველა ობიექტის დოკუმენტაცია ცენტრალიზებულად, ინსპექციისთვის მზად.' },
  { Icon: Briefcase, title: 'აუთსორს კონსულტანტი', desc: 'რამდენიმე კლიენტის მართვა ერთი ანგარიშიდან, სწრაფი ანგარიშგება.' },
  { Icon: HardHat, title: 'ობიექტის მენეჯერი', desc: 'რეალურ დროში ხედავ რა შემოწმდა და რა ვადაგადაცილებულია.' },
];

export const freeFeatures = ['3 PDF გენერაცია', 'ყველა შაბლონი', 'GPS ფოტოები', 'ციფრული ხელმოწერები'];
export const proFeatures = ['შეუზღუდავი PDF', 'ყველა უფასო ფუნქცია +', 'PDF ისტორია', 'პრიორიტეტული მხარდაჭერა', 'ყოველი ახალი შაბლონი'];

/** Free vs PRO feature-by-feature comparison for the dedicated Pricing page. */
export const pricingComparison: { feature: string; free: boolean | string; pro: boolean | string }[] = [
  { feature: 'PDF გენერაცია', free: '3 / თვეში', pro: 'შეუზღუდავი' },
  { feature: 'ყველა შემოწმების შაბლონი', free: true, pro: true },
  { feature: 'GPS ფოტო ტეგირება', free: true, pro: true },
  { feature: 'ციფრული ხელმოწერები', free: true, pro: true },
  { feature: 'PDF ისტორია და არქივი', free: false, pro: true },
  { feature: 'პრიორიტეტული მხარდაჭერა', free: false, pro: true },
  { feature: 'ახალი შაბლონები პირველ რიგში', free: false, pro: true },
];

export const faqs: FAQItem[] = [
  { q: 'რა ფორმატშია PDF?', a: 'HUBBLE გენერირებს სრულ PDF დოკუმენტს SHA256 ჰეშით, GPS კოორდინატებით, ფოტოებითა და ციფრული ხელმოწერებით. ფაილი ინახება Supabase Storage-ში და ხელმისაწვდომია ნებისმიერ დროს.' },
  { q: 'iOS-ზე ხელმისაწვდომია?', a: 'დიახ. HUBBLE ამჟამად iOS-ზეა ხელმისაწვდომი App Store-ის მეშვეობით. Android-ის ვერსია მუშავდება.' },
  { q: 'ინტერნეტის გარეშე მუშაობს?', a: 'შემოწმების ფორმების შევსება ოფლაინ რეჟიმშიც შესაძლებელია. PDF გენერაცია და ფოტოების ატვირთვა ინტერნეტ კავშირს საჭიროებს.' },
  { q: 'BOG-ის გარდა სხვა გადახდა?', a: 'ამჟამად მხოლოდ BOG-ს მხარს ვუჭერთ. სხვა ბანკებისა და Visa/Mastercard-ის მხარდაჭერა ახლო მომავალში დაემატება.' },
  { q: 'მონაცემები სად ინახება?', a: 'ყველა მონაცემი ინახება Supabase-ის EU-ზონაში. ორგანიზაციის მონაცემები სხვა ორგანიზაციისთვის მიუწვდომელია (Row Level Security).' },
  { q: 'კორპორატიული ტარიფი გაქვს?', a: '5-ზე მეტი სპეციალისტისთვის გთავაზობთ კორპორატიულ ტარიფს. კონტაქტი: hello@hubble.ge' },
];

export const pricingFaqs: FAQItem[] = [
  { q: 'უფასო ტარიფი მართლა უფასოა?', a: 'დიახ. უფასო ტარიფი მოიცავს 3 PDF-ს თვეში, ყველა შაბლონს, GPS ფოტოებსა და ხელმოწერებს — საკრედიტო ბარათის გარეშე.' },
  { q: 'როგორ ხდება PRO-ზე გადახდა?', a: 'PRO ტარიფი ₾19/თვეში, გადახდა ხდება BOG-ის მეშვეობით. გაუქმება ნებისმიერ დროს შესაძლებელია.' },
  { q: 'კორპორატიული ტარიფი გაქვს?', a: '5-ზე მეტი სპეციალისტისთვის გთავაზობთ კორპორატიულ ტარიფს. დაგვიკავშირდით: hello@hubble.ge' },
  { q: 'შემიძლია ტარიფის შეცვლა?', a: 'დიახ — ნებისმიერ დროს გადახვალ PRO-ზე ან დაბრუნდები უფასოზე. შეზღუდვა არ არის.' },
];

export const aboutFaqs: FAQItem[] = [
  { q: 'ვინ დგას HUBBLE-ს უკან?', a: 'HUBBLE შეიქმნა საქართველოში, შრომის უსაფრთხოების სპეციალისტებთან ერთად, რეალური ობიექტური საჭიროებებიდან გამომდინარე.' },
  { q: 'რატომ ქართულად?', a: 'პლათფორმა აგებულია ქართული კანონმდებლობისა (№477 დადგენილება) და ქართველი სპეციალისტების სამუშაო პროცესის გარშემო.' },
  { q: 'როგორ დავიწყო თანამშრომლობა?', a: 'დაგვიკავშირდით hello@hubble.ge-ზე ან გამოიყენეთ კონტაქტის გვერდი — გიპასუხებთ უმოკლეს დროში.' },
];

export const contactFaqs: FAQItem[] = [
  { q: 'რამდენ ხანში მპასუხობთ?', a: 'ჩვეულებრივ ვპასუხობთ სამუშაო დღეებში 24 საათის განმავლობაში.' },
  { q: 'ტექნიკური პრობლემა მაქვს — სად მივწერო?', a: 'მოგვწერეთ hello@hubble.ge-ზე ან გამოიყენეთ AI ასისტენტი ამ გვერდზე — ბევრ კითხვაზე მყისიერად გიპასუხებთ.' },
  { q: 'დემო ხელმისაწვდომია?', a: 'დიახ. დაგვიკავშირდით და მოვაწყობთ ინდივიდუალურ დემოს თქვენი გუნდისთვის.' },
];

/** Placeholder team members — TODO: replace with real names/photos/roles. */
export const teamMembers: { name: string; role: string; initials: string }[] = [
  { name: 'სახელი გვარი', role: 'დამფუძნებელი', initials: 'სგ' }, // TODO: real
  { name: 'სახელი გვარი', role: 'პროდუქტი', initials: 'სგ' }, // TODO: real
  { name: 'სახელი გვარი', role: 'ინჟინერია', initials: 'სგ' }, // TODO: real
  { name: 'სახელი გვარი', role: 'მხარდაჭერა', initials: 'სგ' }, // TODO: real
];

/** Placeholder social links — TODO: replace href with real handles. */
export const socialLinks: { Icon: LucideIcon; label: string; href: string }[] = [
  { Icon: Facebook, label: 'Facebook', href: '#' }, // TODO: real
  { Icon: Instagram, label: 'Instagram', href: '#' }, // TODO: real
  { Icon: Linkedin, label: 'LinkedIn', href: '#' }, // TODO: real
  { Icon: Youtube, label: 'YouTube', href: '#' }, // TODO: real
];

/** Headline metrics for the Home stats band. */
export const stats: { value: string; label: string }[] = [
  { value: '10+', label: 'შემოწმების შაბლონი' },
  { value: '30წმ', label: 'PDF გენერაცია' },
  { value: '15+', label: 'კომპანია ენდობა' },
  { value: '100%', label: 'ქართულ კანონზე მორგებული' },
];

/** Logo-cloud company names — TODO: real client logos/names. */
export const companies = ['ალიანს ჯგუფი', 'მშენებელი+', 'საქ-ინფრა', 'ვერტექს', 'ბილდ კო', 'ტერა'];

/** "რატომ HUBBLE" deep value props — alternating showcase rows on Home. */
export const valueProps: { Icon: LucideIcon; eyebrow: string; title: string; desc: string; bullets: string[] }[] = [
  {
    Icon: Zap,
    eyebrow: 'სიჩქარე',
    title: 'შემოწმებიდან PDF-მდე — 30 წამში',
    desc: 'აღარ დაბრუნდე ოფისში დოკუმენტის გასაფორმებლად. შეავსე ჩეკლისტი ობიექტზევე და მიიღე მზა, ხელმოწერილი PDF მყისიერად.',
    bullets: ['10+ მზა შაბლონი', 'ავტომატური ფორმატირება', 'ერთი შეხებით გაზიარება'],
  },
  {
    Icon: MapPin,
    eyebrow: 'მტკიცებულება',
    title: 'ყოველი ფოტო — ლოკაციითა და დროით',
    desc: 'GPS კოორდინატები და დროის ნიშნული ავტომატურად ერთვის ფოტოს. ინსპექციისას გაქვს უტყუარი მტკიცებულება, რომ სამუშაო შესრულდა.',
    bullets: ['GPS ტეგირება', 'დროის ნიშნული', 'ფოტო-არქივი ობიექტის მიხედვით'],
  },
  {
    Icon: CloudOff,
    eyebrow: 'საიმედოობა',
    title: 'მუშაობს ინტერნეტის გარეშეც',
    desc: 'შეავსე ფორმები ოფლაინ რეჟიმში — კავშირის აღდგენისთანავე ყველაფერი ავტომატურად დასინქრონდება. სამშენებლო მოედანი ხშირად ცუდი ქსელია.',
    bullets: ['ოფლაინ შევსება', 'ავტომატური სინქი', 'მონაცემი არ იკარგება'],
  },
];

/** Security / compliance points for the dark Trust band. */
export const trustPoints: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: Fingerprint, title: 'SHA256 ჰეში', desc: 'ყოველ PDF-ს აქვს უნიკალური ციფრული ანაბეჭდი — გაყალბება გამორიცხულია.' },
  { Icon: Lock, title: 'დაცული წვდომა (RLS)', desc: 'Row Level Security — შენი ორგანიზაციის მონაცემი სხვისთვის მიუწვდომელია.' },
  { Icon: Server, title: 'EU მონაცემთა ზონა', desc: 'ყველა მონაცემი ინახება ევროკავშირის სერვერებზე.' },
  { Icon: PenLine, title: 'ციფრული ხელმოწერა', desc: 'ხელმოწერა ჩაშენებულია PDF-ში და იცავს დოკუმენტის მთლიანობას.' },
];

/** Customer testimonials — TODO: replace with real quotes/names/photos. */
export const testimonials: { quote: string; name: string; role: string; initials: string }[] = [
  { quote: 'ადრე ერთ ობიექტზე დღეს ვკარგავდი ქაღალდებში. ახლა შემოწმება და PDF რამდენიმე წუთია — და ინსპექციისთვის ყველაფერი მზადაა.', name: 'სახელი გვარი', role: 'უსაფრთხოების სპეციალისტი', initials: 'სგ' },
  { quote: 'GPS ფოტოები და ხელმოწერები ერთ ფაილში — ეს ზუსტად ის მტკიცებულებაა, რასაც ინსპექცია ითხოვს.', name: 'სახელი გვარი', role: 'ობიექტის მენეჯერი', initials: 'სგ' },
  { quote: 'რამდენიმე ობიექტს ერთი ანგარიშიდან ვმართავ. დანერგვა ერთ დღეში მოხდა, გუნდმა მაშინვე აიტაცა.', name: 'სახელი გვარი', role: 'აუთსორს კონსულტანტი', initials: 'სგ' },
];

/** Final CTA band copy. */
export const ctaBand = {
  title: 'მზად ხარ ქაღალდი ციფრულით ჩაანაცვლო?',
  subtitle: '3 PDF უფასოდ. საკრედიტო ბარათი არ გჭირდება. დანერგვა — წუთებში.',
};

/** Placeholder blog articles for the Legislation page — TODO: real articles. */
export const blogArticles: { title: string; excerpt: string; date: string; url: string }[] = [
  {
    title: '№477 დადგენილება — რა უნდა იცოდე 2026 წელს',
    excerpt: 'შრომის უსაფრთხოების მთავარი მარეგულირებელი დოკუმენტის მოკლე მიმოხილვა და პრაქტიკული ნაბიჯები.',
    date: '2026-05-01',
    url: '#', // TODO: real article
  },
  {
    title: 'ხარაჩოს შემოწმება — ხშირი შეცდომები',
    excerpt: '5 ყველაზე გავრცელებული დარღვევა ფასადის ხარაჩოს შემოწმებისას და როგორ ავიცილოთ თავიდან.',
    date: '2026-04-18',
    url: '#', // TODO: real article
  },
  {
    title: 'ციფრული დოკუმენტაცია vs ქაღალდი',
    excerpt: 'რატომ ითხოვს ინსპექცია სულ უფრო ხშირად ციფრულ, დროის ნიშნულიან დოკუმენტებს.',
    date: '2026-03-30',
    url: '#', // TODO: real article
  },
];
