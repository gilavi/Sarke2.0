/**
 * Standardized PDF filename generator.
 *
 * Format: [ProjectName]_[DocType]_[Date]_[ShortID].pdf
 *
 * Rules:
 * - ProjectName: first 10 chars, spaces → underscore
 * - Date: DDmonYYYY (Latin month abbreviations — Supabase Storage requires ASCII keys)
 * - ShortID: first 4 chars of document ID uppercase
 * - Invalid filename chars replaced with _
 * - Max total length: 60 characters (truncates ProjectName first)
 *
 * Note: Supabase Storage validates object keys and rejects raw Georgian/Unicode
 * characters. We transliterate to Latin so the filename stays human-readable
 * while remaining ASCII-safe.
 */

const MONTH_ABBR = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

/** Georgian → Latin transliteration map (standard Mkhedruli to Latin). */
const GEO_TO_LATIN: Record<string, string> = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z',
  'თ': 't', 'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o',
  'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'p',
  'ქ': 'k', 'ღ': 'gh', 'ყ': 'q', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz',
  'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h',
};

function transliterate(input: string): string {
  return input
    .split('')
    .map((ch) => GEO_TO_LATIN[ch] ?? ch)
    .join('');
}

function sanitize(input: string): string {
  return input
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) : str;
}

export function generatePdfName(
  projectName: string,
  docType: string,
  date: Date,
  id: string,
): string {
  const shortProject = truncate(sanitize(transliterate(projectName)), 10);
  const sanitizedDocType = sanitize(transliterate(docType));
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_ABBR[date.getMonth()];
  const year = date.getFullYear();
  const dateStr = `${day}${month}${year}`;
  const shortId = id.slice(0, 4).toUpperCase();

  let name = `${shortProject}_${sanitizedDocType}_${dateStr}_${shortId}.pdf`;

  // Max total length 60 chars — truncate ProjectName first
  if (name.length > 60) {
    const overage = name.length - 60;
    const adjustedProject = shortProject.slice(
      0,
      Math.max(1, shortProject.length - overage),
    );
    name = `${adjustedProject}_${sanitizedDocType}_${dateStr}_${shortId}.pdf`;
  }

  return name;
}
