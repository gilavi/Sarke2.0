// Bump TERMS_VERSION when the content below changes. Existing users will be
// prompted to re-accept on next sign-in.
export const TERMS_VERSION = '2026-04-22';

export const TERMS_PUBLIC_URL = 'https://sarke.ge/terms';

export interface TermsBody {
  heading: string;
  updated: string;
  sections: { title: string; body: string }[];
  agreeLabel: string;
  declineLabel: string;
  linkLabel: string;
}

export const termsKa: TermsBody = {
  heading: 'წესები და პირობები',
  updated: `ბოლო განახლება: ${TERMS_VERSION}`,
  agreeLabel: 'ვეთანხმები',
  declineLabel: 'უარი',
  linkLabel: 'სრული ტექსტი',
  sections: [
    {
      title: '1. მომსახურების აღწერა',
      body:
        'Sarke 2.0 არის შრომის უსაფრთხოების ექსპერტის აპლიკაცია ხარაჩოებისა და ' +
        'ინდივიდუალური დაცვის საშუალებების ინსპექტირებისთვის. აპლიკაცია შეიცავს ' +
        'კითხვარებს, ფოტო/ხელმოწერების შეგროვებას და PDF ანგარიშების გენერაციას.',
    },
    {
      title: '2. მონაცემთა შენახვა',
      body:
        'ანგარიშის შექმნისას თქვენი პერსონალური მონაცემები (სახელი, გვარი, იმეილი), ' +
        'ინსპექციის მონაცემები, ფოტოები და ხელმოწერები ინახება Supabase-ის ' +
        'უსაფრთხო ინფრასტრუქტურაში. წვდომა შეზღუდულია თქვენი ანგარიშისთვის RLS პოლიტიკებით.',
    },
    {
      title: '3. ფოტო და ხელმოწერის შეგროვება',
      body:
        'აპი აგროვებს ფოტოებს და ხელმოწერებს მხოლოდ ინსპექციის PDF ანგარიშში ' +
        'გამოსაყენებლად. მესამე მხარეს მონაცემები არ გადაეცემა თქვენი ნებართვის გარეშე.',
    },
    {
      title: '4. PDF ანგარიშები',
      body:
        'გენერირებული PDF ანგარიშები ინახება თქვენს ანგარიშში და ხელმისაწვდომია ' +
        'ისტორიის გვერდიდან. თქვენ ხართ პასუხისმგებელი ანგარიშის შინაარსის სიზუსტეზე.',
    },
    {
      title: '5. ავთენტიფიკაცია',
      body:
        'აპლიკაცია იყენებს იმეილით ან Google-ით შესვლის მეთოდებს Supabase Auth-ის ' +
        'საშუალებით. თქვენი პაროლი არცერთ შემთხვევაში არ ინახება აპლიკაციის სერვერებზე.',
    },
    {
      title: '6. კანონთან შესაბამისობა',
      body:
        'აპლიკაცია შეესაბამება საქართველოს შრომის უსაფრთხოების კოდექსსა და პერსონალურ ' +
        'მონაცემთა დაცვის კანონს. ინსპექციის შედეგები უნდა გამოიყენოს მხოლოდ ' +
        'სერტიფიცირებულმა სპეციალისტმა.',
    },
    {
      title: '7. ცვლილებები',
      body:
        'ამ წესებში ცვლილების შემთხვევაში თქვენ მიიღებთ შეტყობინებას და მოგეთხოვებათ ' +
        'ხელახალი დათანხმება აპლიკაციის გამოყენების გასაგრძელებლად.',
    },
    {
      title: '8. საკონტაქტო',
      body:
        'კითხვებისთვის: support@sarke.ge',
    },
  ],
};

export const termsEn: TermsBody = {
  heading: 'Terms & Conditions',
  updated: `Last updated: ${TERMS_VERSION}`,
  agreeLabel: 'I agree',
  declineLabel: 'Decline',
  linkLabel: 'Full text',
  sections: [
    {
      title: '1. Service description',
      body:
        'Sarke 2.0 is an occupational safety inspection app for scaffolding and ' +
        'personal fall-protection equipment. It provides inspection questionnaires, ' +
        'photo and signature capture, and PDF report generation.',
    },
    {
      title: '2. Data storage',
      body:
        'Your personal information (name, email), inspection records, photos, and ' +
        'signatures are stored on Supabase infrastructure. Access is restricted to ' +
        'your account via row-level-security policies.',
    },
    {
      title: '3. Photo and signature collection',
      body:
        'Photos and signatures are collected solely for inclusion in inspection PDF ' +
        'reports. Data is not shared with third parties without your consent.',
    },
    {
      title: '4. PDF reports',
      body:
        'Generated PDFs are stored in your account and accessible from the history ' +
        'tab. You are responsible for the accuracy of report contents.',
    },
    {
      title: '5. Authentication',
      body:
        'Sign-in uses email or Google via Supabase Auth. Your password is never ' +
        'stored on our servers.',
    },
    {
      title: '6. Legal compliance',
      body:
        'The app is aligned with the Georgian Labor Safety Code and Personal Data ' +
        'Protection Law. Inspection output should be used only by certified specialists.',
    },
    {
      title: '7. Changes',
      body:
        'If these terms change, you will be notified and asked to re-accept before ' +
        'continuing to use the app.',
    },
    {
      title: '8. Contact',
      body: 'Questions: support@sarke.ge',
    },
  ],
};
