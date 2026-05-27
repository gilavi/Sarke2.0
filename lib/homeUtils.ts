/**
 * Pure helper utilities for the Home screen.
 * No React imports — safe to import in tests without RN mocks.
 */

export const TIP_KEYS = [
  'home.tip1', 'home.tip2', 'home.tip3', 'home.tip4',
  'home.tip5', 'home.tip6', 'home.tip7',
] as const;

/** Placeholder index arrays hoisted so .map() doesn't allocate on every render. */
export const PROJECT_SKELETONS = [0, 1] as const;
export const RECENT_SKELETONS  = [0, 1, 2] as const;

export function greetingFor(name: string, t: (key: string) => string) {
  const hour = new Date().getHours();
  const base =
    hour < 5  ? t('home.greetingNight')     :
    hour < 12 ? t('home.greetingMorning')   :
    hour < 18 ? t('home.greetingAfternoon') :
                t('home.greetingEvening');
  return name ? `${base}, ${name}` : base;
}

export const KA_MONTH_FULL = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];
export const KA_MONTH_SHORT = [
  'იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ',
  'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ',
];
// JS getDay(): 0=Sunday … 6=Saturday
export const KA_WEEKDAY_FULL = [
  'კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი',
  'ხუთშაბათი', 'პარასკევი', 'შაბათი',
];

export function todayFormatted(lang: string) {
  const d = new Date();
  if (lang.startsWith('en')) {
    try {
      return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch { return ''; }
  }
  return `${KA_WEEKDAY_FULL[d.getDay()]} ${d.getDate()} ${KA_MONTH_FULL[d.getMonth()]}`;
}

export function relativeTime(
  iso: string,
  t: (key: string, opts?: any) => string,
  lang: string,
) {
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return t('home.relNow');
  if (m < 60) return t('home.relMinAgo', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('home.relHourAgo', { n: h });
  const days = Math.floor(h / 24);
  if (days < 7) return t('home.relDayAgo', { n: days });
  if (lang.startsWith('en')) {
    try { return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }); } catch { return ''; }
  }
  return `${d.getDate()} ${KA_MONTH_SHORT[d.getMonth()]}`;
}

export function tipOfTheDay(t: (key: string) => string) {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return t(TIP_KEYS[day % TIP_KEYS.length]);
}

function dateGroupLabel(iso: string, lang: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return lang.startsWith('en') ? 'Today' : 'დღეს';
  if (diff === 1) return lang.startsWith('en') ? 'Yesterday' : 'გუშინ';
  if (lang.startsWith('en')) {
    try { return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }); } catch { return ''; }
  }
  return `${d.getDate()} ${KA_MONTH_SHORT[d.getMonth()]}`;
}

export function groupByDate<T extends { created_at: string }>(
  items: T[],
  lang: string,
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label    = dateGroupLabel(item.created_at, lang);
    const existing = groups.find(g => g.label === label);
    if (existing) existing.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
