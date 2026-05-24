// Shared helpers for the order PDF builders.

export function fmtDate(iso: string): string {
  if (!iso) return '___________';
  return new Date(iso).toLocaleDateString('ka-GE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function escHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
