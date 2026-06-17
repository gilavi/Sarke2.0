// Shared utilities for the inspection PDF renderers.
//
// PDF output is locked to Georgian - `tPdf(...)` resolves keys against
// `locales/ka.json` regardless of the user's current i18n locale.

import ka from '../../../locales/ka.json';

export function tPdf(key: string, vars?: Record<string, string | number>): string | undefined {
  const parts = key.split('.');
  let val: any = ka;
  for (const p of parts) {
    val = val?.[p];
    if (val === undefined) break;
  }
  if (typeof val !== 'string') return undefined;
  if (!vars) return val;
  return val.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => String(vars[k] ?? ''));
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function escapeHtml(s: string | null | undefined): string {
  // Apostrophes matter here because some interpolated values land inside
  // single-quoted JS strings in onerror handlers (e.g. names like O'Brien
  // would break the handler and prevent the fallback UI from rendering).
  if (s == null) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
