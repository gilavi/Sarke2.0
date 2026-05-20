/**
 * HTML-escaping + date formatting for inspection PDF rendering.
 *
 * Single source of truth, replacing the drifted duplicates:
 *   - escHtml (4 replacements) in lib/pdfShared.ts
 *   - escapeHtml (5 replacements) in lib/inspectionPdfTemplate.ts
 *   - fmtDate in lib/pdfShared.ts / formatDate in lib/inspectionPdfTemplate.ts
 */

/**
 * Escape a string for inclusion in HTML.
 *
 * Apostrophes are escaped because interpolated values can land inside
 * single-quoted JS string literals in `<img onerror="...">` fallback handlers;
 * an unescaped apostrophe (e.g. a name like O'Brien) would break the handler
 * and suppress the broken-image fallback. In plain text content `&#39;` and a
 * literal `'` render identically, so this is strictly safer with no visual change.
 */
export function escapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Localized long date in Georgian (e.g. "13 მაისი 2025").
 * Returns an em dash for empty input and echoes the raw string for unparseable input.
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Short numeric date+time (dd.mm.yyyy hh:mm), used in photo captions.
 */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}
