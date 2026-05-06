import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const KA_MONTHS_LONG = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];

/** "04 მაისი 2026" */
export function fmtDateKa(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${KA_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** "04 მაისი 2026, 19:30" */
export function fmtDateTimeKa(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${fmtDateKa(d)}, ${hh}:${mm}`;
}

/** "04 მაისი" (no year — for calendar cards) */
export function fmtDayMonthKa(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${String(d.getDate()).padStart(2, '0')} ${KA_MONTHS_LONG[d.getMonth()]}`;
}
