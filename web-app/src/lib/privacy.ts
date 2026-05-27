// Web-app's own copy of the privacy policy content. Do NOT import from outside web-app —
// per CLAUDE.md the web-app must not share code with the Expo project.
//
// This page must remain publicly accessible (no auth) — App Store Connect's Privacy
// Policy URL field is fetched by Apple reviewers without logging in.
export const PRIVACY_VERSION = '2026-05-27';

export const PRIVACY_PUBLIC_URL = 'https://hubble.ge/privacy';

export interface PrivacyBody {
  heading: string;
  updated: string;
  intro: string;
  sections: { title: string; body: string }[];
  contactLabel: string;
}

export const privacyKa: PrivacyBody = {
  heading: 'კონფიდენციალურობის პოლიტიკა',
  updated: `ბოლო განახლება: ${PRIVACY_VERSION}`,
  intro:
    'ეს დოკუმენტი აღწერს, თუ რა მონაცემებს აგროვებს Sarke 2.0 (Hubble) აპლიკაცია და ვებ-პლატფორმა, ' +
    'რა მიზნით და როგორ ვიცავთ მათ. აპლიკაცია იყენებს Supabase-ის ინფრასტრუქტურას მონაცემთა ' +
    'შესანახად და Sentry-ს ანონიმური ავარიული ანგარიშებისთვის.',
  contactLabel: 'საკონტაქტო ინფორმაცია',
  sections: [
    {
      title: '1. რა მონაცემებს ვაგროვებთ',
      body:
        'ანგარიშის შექმნისას — სახელი, გვარი და ელ-ფოსტა. შემოწმების აქტის შექმნისას — ფოტოები ' +
        '(ფოტოს ფაილებიდან EXIF მონაცემები ავტომატურად იშლება), ხელმოწერები, ფაკულტატური ' +
        'ტელეფონის ნომერი ხელმომწერისთვის, და ფაკულტატური ზუსტი ადგილმდებარეობა (GPS), რომელიც ' +
        'მიემაგრება შემოწმების ფოტოებს. ვაგროვებთ ასევე უნიკალურ მომხმარებლის ID-ს Supabase Auth-ის ' +
        'მეშვეობით და ანონიმური ავარიული ანგარიშებს Sentry-ის მეშვეობით.',
    },
    {
      title: '2. რა მიზნით ვიყენებთ',
      body:
        'მონაცემები გამოიყენება მხოლოდ აპლიკაციის ფუნქციონირებისთვის: ფოტოები და ხელმოწერები ' +
        'ჩნდება შემოწმების PDF ანგარიშებში; ადგილმდებარეობა გამოიყენება PDF-ში გეო-მონიშვნისთვის; ' +
        'ანგარიშის მონაცემები — ავთენტიფიკაციისთვის. მონაცემები არ გამოიყენება რეკლამისთვის, ' +
        'არც სხვა აპლიკაციებთან თქვენი ქცევის თვალყურის დევნებისთვის (Apple App Tracking Transparency).',
    },
    {
      title: '3. მონაცემთა შენახვის ადგილი',
      body:
        'ყველა მონაცემი ინახება Supabase-ის ღრუბლოვან ინფრასტრუქტურაში (PostgreSQL ბაზა და ' +
        'Storage), წვდომა შეზღუდულია თქვენი ანგარიშისთვის Row-Level Security პოლიტიკებით. ' +
        'ფაილების წაკითხვა ხორციელდება დროებითი ხელმოწერილი (signed) URL-ების მეშვეობით — ' +
        'საცავი არ არის საჯაროდ ხელმისაწვდომი.',
    },
    {
      title: '4. მესამე მხარეები',
      body:
        'მონაცემთა გადამამუშავებლები: (a) Supabase Inc. — ბაზა, Auth და Storage; (b) Sentry — ' +
        'ანონიმური ავარიული ანგარიშები (PII იშლება გაგზავნამდე); (c) Bank of Georgia — გადახდები ' +
        'ვებ გამოწერებისთვის (აპში გადახდის მონაცემები არ ინახება). მონაცემები არ იყიდება და არ ' +
        'გადაეცემა მესამე მხარეებს მარკეტინგული მიზნებისთვის.',
    },
    {
      title: '5. ფოტოები და EXIF',
      body:
        'ფოტოები გადადის expo-image-manipulator-ში გადატანამდე, რომელიც ავტომატურად შლის EXIF-ის ' +
        'მთლიან მონაცემთა ბლოკს (კამერის სერიული ნომერი, საწყისი GPS კოორდინატები, დროის შტამპები). ' +
        'GPS კოორდინატები ცალკე ინახება მხოლოდ თქვენი წინასწარი ნებართვით.',
    },
    {
      title: '6. ხელმოწერები',
      body:
        'შემოწმების ფინალური ხელმოწერა გროვდება ეკრანზე და მყისიერად ფიქსირდება PDF-ში, ხოლო ' +
        'საცავში პერსისტენტულად აღარ ინახება — ეს არის რეგულატორული მოთხოვნა. სხვა ნაკადებში ' +
        '(პროექტის ხელმომწერი, ინციდენტი, ბრიფინგი) ხელმოწერა ინახება შესაბამისი ბიზნეს-' +
        'მოთხოვნებიდან გამომდინარე.',
    },
    {
      title: '7. ანგარიშის წაშლა',
      body:
        'ანგარიშის წაშლა შესაძლებელია აპლიკაციის შიგნით: მენიუ → პროფილი → "ანგარიშის წაშლა". ' +
        'წაშლა ხდება სრულად და შეუქცევადად — ყველა შემოწმება, ფოტო, ხელმოწერა და სხვა მონაცემი ' +
        'წაიშლება Postgres-ის CASCADE წესით. ალტერნატივად მოგვწერეთ: support@hubble.ge.',
    },
    {
      title: '8. მონაცემთა შენახვის ვადა',
      body:
        'მონაცემები ინახება მანამ, სანამ ანგარიში აქტიურია. ანგარიშის წაშლის შემდეგ მონაცემები ' +
        'ფიზიკურად იშლება სერვერებიდან. Sentry-ის ანონიმური ავარიული ანგარიშები ინახება 90 დღემდე.',
    },
    {
      title: '9. ბავშვები',
      body:
        'აპლიკაცია არ არის განკუთვნილი 16 წელზე ნაკლები ასაკის მომხმარებლებისთვის და ' +
        'ცნობიერად არ ვაგროვებთ ბავშვების მონაცემებს.',
    },
    {
      title: '10. ცვლილებები',
      body:
        'ამ პოლიტიკის ცვლილების შემთხვევაში განვაახლებთ თარიღს ზემოთ. არსებითი ცვლილებების ' +
        'შესახებ შეგატყობინებთ აპლიკაციის ან ელ-ფოსტის მეშვეობით.',
    },
    {
      title: '11. კონტაქტი',
      body:
        'კონფიდენციალურობასთან დაკავშირებული შეკითხვებისთვის ან მონაცემთა წვდომის / გასწორების / ' +
        'წაშლის თხოვნისთვის: support@hubble.ge.',
    },
  ],
};

export const privacyEn: PrivacyBody = {
  heading: 'Privacy Policy',
  updated: `Last updated: ${PRIVACY_VERSION}`,
  intro:
    'This document describes what data the Sarke 2.0 (Hubble) mobile app and web platform ' +
    'collect, why, and how we protect it. The platform uses Supabase for data storage and ' +
    'Sentry for anonymous crash reports.',
  contactLabel: 'Contact',
  sections: [
    {
      title: '1. Data we collect',
      body:
        'On sign-up: first name, last name, and email address. During inspections: photos ' +
        '(EXIF metadata is stripped from every uploaded image), signatures, an optional phone ' +
        'number for the signer, and optional precise location (GPS) attached to inspection ' +
        'photos. We also collect a unique user ID issued by Supabase Auth and anonymous crash ' +
        'reports via Sentry.',
    },
    {
      title: '2. How we use it',
      body:
        'Data is used only for app functionality: photos and signatures appear in inspection ' +
        'PDF reports; location is geo-tagged into the PDF; account data powers authentication. ' +
        'We do not use any data for advertising and we do not track you across other companies\' ' +
        'apps or websites (no App Tracking Transparency required).',
    },
    {
      title: '3. Where data is stored',
      body:
        'All data is stored on Supabase cloud infrastructure (Postgres database and Storage). ' +
        'Access is restricted to your own account via Row-Level Security policies. File reads ' +
        'use short-lived signed URLs — storage buckets are not publicly accessible.',
    },
    {
      title: '4. Third parties',
      body:
        'Data processors: (a) Supabase Inc. — database, Auth, Storage; (b) Sentry — anonymous ' +
        'crash reports (PII is stripped before sending); (c) Bank of Georgia — payment ' +
        'processing for web subscriptions only (card data never reaches the app). We do not ' +
        'sell data or share it with third parties for marketing.',
    },
    {
      title: '5. Photos and EXIF metadata',
      body:
        'Every photo passes through expo-image-manipulator before upload, which strips the ' +
        'entire EXIF block (camera serial number, original GPS coordinates, timestamps). GPS ' +
        'coordinates are stored separately only with your explicit per-photo permission.',
    },
    {
      title: '6. Signatures',
      body:
        'The final inspection signature is captured on screen and rasterized into the PDF ' +
        'immediately — it is NOT persisted to storage. This is a regulatory requirement. ' +
        'Signatures in other flows (project signers, incidents, briefings) are stored as ' +
        'required by their respective business contexts.',
    },
    {
      title: '7. Account deletion',
      body:
        'You can delete your account inside the app: Menu → Profile → "Delete account". ' +
        'Deletion is permanent and irreversible — all your inspections, photos, signatures, ' +
        'and related rows are removed via Postgres CASCADE. Alternatively, email ' +
        'support@hubble.ge.',
    },
    {
      title: '8. Retention',
      body:
        'Data is retained while your account is active. After account deletion, your data is ' +
        'physically removed from our servers. Anonymous Sentry crash reports are retained for ' +
        'up to 90 days.',
    },
    {
      title: '9. Children',
      body:
        'The app is not directed to users under 16 and we do not knowingly collect data from ' +
        'children.',
    },
    {
      title: '10. Changes',
      body:
        'If this policy changes we update the date at the top. We will notify you of material ' +
        'changes through the app or by email.',
    },
    {
      title: '11. Contact',
      body:
        'Privacy questions, or requests to access / correct / delete your data: ' +
        'support@hubble.ge.',
    },
  ],
};
