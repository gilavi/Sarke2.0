// renderSignaturesSection.ts - renders the unified signatures section into
// inspection PDFs. Web-app mirror of the Expo app's
// `lib/pdf/inspection/renderSignaturesSection.ts` (the `@root` import is banned
// by eslint), kept byte-faithful so the printed signature block matches mobile.
//
// One section per PDF, with two parts:
//   1. The inspection creator's captured signature (digital, rasterized into the
//      printed page), shown over a horizontal rule with their name + capture date.
//   2. Zero or more empty hand-sign slots - labeled blanks for additional signers
//      to fill in on the printed copy.
//
// Regulatory: the captured signature is supplied in-memory by the result screen
// (SignatureCapture) and is NEVER read from persisted storage. If both parts are
// empty the section is omitted entirely.
import { escapeHtml } from './escape';

const KA_MONTH_FULL = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];

/**
 * Lightweight value shape consumed by this renderer. Mirrors what the inspection
 * result screen's SignatureCapture produces (`onGenerate` payload).
 */
export interface SignaturesSectionData {
  creatorSignature: {
    pngBase64: string;
    capturedAtIso: string;
    /** Inspector's full name pulled from profile by the wizard. */
    creatorName: string;
  } | null;
  additionalRowsCount: number;
}

function formatGeorgianDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${KA_MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

export function renderSignaturesSection(data: SignaturesSectionData | null | undefined): string {
  if (!data) return '';
  const hasCreator = !!data.creatorSignature;
  const rowCount = Math.max(0, data.additionalRowsCount | 0);
  if (!hasCreator && rowCount === 0) return '';

  const title = 'ხელმოწერები';

  const creatorBlock = hasCreator ? renderCreatorBlock(data.creatorSignature!) : '';
  const rowsBlock = rowCount > 0 ? renderEmptySlots(rowCount) : '';

  return `
    <div class="signatures-section">
      <div class="signatures-heading">
        <span class="signatures-heading-text">${escapeHtml(title)}</span>
        <div class="signatures-heading-rule"></div>
      </div>
      ${creatorBlock}
      ${rowsBlock}
    </div>
  `;
}

function renderCreatorBlock(
  creator: NonNullable<SignaturesSectionData['creatorSignature']>,
): string {
  const dateStr = formatGeorgianDate(creator.capturedAtIso);
  return `
    <div class="signatures-creator">
      <div class="signatures-creator-img">
        <img src="data:image/png;base64,${escapeHtml(creator.pngBase64)}" alt="ხელმოწერა" />
      </div>
      <div class="signatures-creator-rule"></div>
      <div class="signatures-creator-meta">
        <span class="signatures-creator-name">${escapeHtml(creator.creatorName || '-')}</span>
        ${dateStr ? `<span class="signatures-creator-date">${escapeHtml(dateStr)}</span>` : ''}
      </div>
    </div>
  `;
}

function renderEmptySlots(rowCount: number): string {
  const slots: string[] = [];
  for (let i = 0; i < rowCount; i += 1) {
    slots.push(`
      <div class="signatures-empty-slot">
        <div class="signatures-empty-row">
          <span class="signatures-empty-label">ხელმოწერა:</span>
          <span class="signatures-empty-line signatures-empty-line-long"></span>
        </div>
        <div class="signatures-empty-row signatures-empty-row-split">
          <span class="signatures-empty-half">
            <span class="signatures-empty-label">სახელი:</span>
            <span class="signatures-empty-line signatures-empty-line-short"></span>
          </span>
          <span class="signatures-empty-half">
            <span class="signatures-empty-label">თარიღი:</span>
            <span class="signatures-empty-line signatures-empty-line-short"></span>
          </span>
        </div>
      </div>
    `);
  }
  return slots.join('');
}
