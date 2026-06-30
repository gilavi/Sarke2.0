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

/**
 * Reusable captioned photo figure for order ("ბრძანება") PDFs — bordered card,
 * centered image, caption below. Self-contained inline styles (the order
 * builders have no shared stylesheet) and `page-break-inside: avoid` so a photo
 * never splits across pages.
 *
 * @param dataUrl A `data:image/...;base64,...` URL (produced by `pdfPhotoEmbed`
 *   before the synchronous builder runs). The data URL is already URL-safe and
 *   is NOT HTML-escaped (mirrors how signature base64 is embedded). Falsy input
 *   renders nothing — callers can pass it unconditionally.
 * @param caption Human-readable label, HTML-escaped before output.
 * @returns An HTML `<figure>` string, or `''` when `dataUrl` is empty.
 */
export function renderOrderPhoto(
  dataUrl: string | null | undefined,
  caption: string,
): string {
  if (!dataUrl) return '';
  return `<figure style="border:1px solid #000;border-radius:4pt;padding:6pt;margin:8pt 0;text-align:center;page-break-inside:avoid;">
  <img src="${dataUrl}" alt="${escHtml(caption)}" style="max-width:100%;max-height:240pt;display:block;margin:0 auto;"/>
  <figcaption style="font-size:9pt;color:#555;margin-top:4pt;">${escHtml(caption)}</figcaption>
</figure>`;
}

/**
 * Render `n` empty hand-sign slots for an order PDF — labeled blank blocks
 * (ხელმოწერა / სახელი / თარიღი) signed by hand on the printed copy. Mirrors the
 * inspection PDF's additional-signature slots so the two read the same. The
 * order flow captures no digital signatures; these are graphs only.
 *
 * @param n Count (clamped to 0…20). Falsy/≤0 renders nothing.
 */
export function renderBlankSignatureRows(n: number | null | undefined): string {
  const count = Math.max(0, Math.min(20, Number(n) || 0));
  if (count === 0) return '';
  let out = '';
  for (let i = 0; i < count; i += 1) {
    out += `<div style="border:1px solid #000;border-radius:4pt;padding:8pt;margin-top:8pt;page-break-inside:avoid;">
  <div style="font-size:9pt;color:#555;">ხელმოწერა</div>
  <div style="border-bottom:1px solid #000;height:22pt;"></div>
  <div style="display:flex;justify-content:space-between;margin-top:6pt;font-size:9pt;color:#555;">
    <span>სახელი, გვარი: ___________________________</span>
    <span>თარიღი: _______________</span>
  </div>
</div>`;
  }
  return out;
}
