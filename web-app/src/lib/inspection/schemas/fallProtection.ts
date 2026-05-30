/**
 * Fall-protection inspection schema — web mirror (flattened single-device) of the
 * Expo app's `lib/inspection/schemas/fallProtection.ts` (the `@root` import is
 * eslint-banned). General info + a single device checklist (4-state) + verdict,
 * as custom blocks. The persisted signature section is omitted (regulatory).
 */
import { escapeHtml, fmtDate } from '../escape';
import type { InspectionSchema, PhotoMap } from '../schema';
import {
  FP_CHECKLIST_ITEMS,
  FP_RESULT_TO_CHIP,
  FP_VERDICT_LABELS,
  FALL_PROTECTION_TEMPLATE_ID,
  type FallProtectionInspection,
  type FPResult,
} from '@/lib/types/fallProtection';

const EXTRA_CSS = `
  :root { --redText: #991B1B; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
  .info-row { display: flex; flex-direction: column; gap: 2px; }
  .info-label { font-size: 10px; color: var(--inkFaint); }
  .info-value { font-size: 12px; font-weight: 600; color: var(--ink); }
  .cl-table th { text-align: left; }
  .chip-safe { color: #065F46; font-weight: 700; }
  .chip-critical { color: var(--redText); font-weight: 700; }
  .chip-minor { color: #92400E; font-weight: 700; }
  .chip-na { color: var(--inkFaint); }
  .col-result { width: 90px; }
  .verdict-band { margin-top: 12px; padding: 12px 14px; border: 0.5px solid var(--hairline); border-radius: 8px; }
  .verdict-safe { color: #065F46; font-weight: 800; font-size: 13px; }
  .verdict-minor { color: #92400E; font-weight: 800; font-size: 13px; }
  .verdict-banned { color: var(--redText); font-weight: 800; font-size: 13px; }
`;

function chipClass(result: FPResult | null): string {
  if (result === 'safe') return 'chip-safe';
  if (result === 'critical') return 'chip-critical';
  if (result === 'minor') return 'chip-minor';
  return 'chip-na';
}
function chipDisplay(result: FPResult | null): string {
  return result ? FP_RESULT_TO_CHIP[result] : '—';
}
function verdictClass(v: string | null): string {
  if (v === 'safe') return 'verdict-safe';
  if (v === 'minor') return 'verdict-minor';
  if (v === 'banned') return 'verdict-banned';
  return '';
}

function renderGeneral(insp: FallProtectionInspection): string {
  return `
    <div class="section-title">I — ზოგადი ინფორმაცია</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">ობიექტის დასახელება</span><span class="info-value">${escapeHtml(insp.company) || '—'}</span></div>
      <div class="info-row"><span class="info-label">მისამართი</span><span class="info-value">${escapeHtml(insp.address) || '—'}</span></div>
      <div class="info-row"><span class="info-label">უსაფრთხ. ხელმძღვ.</span><span class="info-value">${escapeHtml(insp.safetyLeaderName) || '—'}</span></div>
      <div class="info-row"><span class="info-label">ტელეფონი</span><span class="info-value">${escapeHtml(insp.safetyLeaderPhone) || '—'}</span></div>
      <div class="info-row"><span class="info-label">მოწყობილობის ტიპი</span><span class="info-value">${escapeHtml(insp.deviceType) || '—'}</span></div>
      <div class="info-row"><span class="info-label">განთავსების ადგილი</span><span class="info-value">${escapeHtml(insp.deviceLocation) || '—'}</span></div>
      <div class="info-row"><span class="info-label">შემოწმების თარიღი</span><span class="info-value">${fmtDate(insp.inspectionDate)}</span></div>
    </div>
  `;
}

function renderChecklist(insp: FallProtectionInspection, photos: PhotoMap): string {
  const rows = FP_CHECKLIST_ITEMS.map((entry) => {
    const state = insp.items.find((i) => i.id === entry.id);
    const result = state?.result ?? null;
    const photoHtml = (state?.photo_paths ?? [])
      .map((p) => (photos[p] ? `<span class="item-photo"><img src="${escapeHtml(photos[p])}" /></span>` : ''))
      .join('');
    return `
      <tr>
        <td class="col-num">${entry.id}</td>
        <td>${escapeHtml(entry.label)}${photoHtml ? `<div style="margin-top:4px">${photoHtml}</div>` : ''}</td>
        <td class="col-result ${chipClass(result)}">${chipDisplay(result)}</td>
        <td class="item-comment">${escapeHtml(state?.comment ?? '')}</td>
      </tr>`;
  }).join('');
  return `
    <div class="section-title">II — შემოწმების ჩეკლისტი</div>
    <table class="cl-table">
      <thead><tr><th class="col-num">#</th><th>პარამეტრი</th><th class="col-result">შეფ.</th><th>კომენტარი</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderVerdict(insp: FallProtectionInspection): string {
  const label = insp.verdict ? FP_VERDICT_LABELS[insp.verdict] : '—';
  return `
    <div class="section-title">III — დასკვნა</div>
    <div class="verdict-band">
      <div class="${verdictClass(insp.verdict)}">${escapeHtml(label)}</div>
      ${insp.verdictComment ? `<div class="item-comment" style="margin-top:6px;">${escapeHtml(insp.verdictComment)}</div>` : ''}
    </div>
  `;
}

export const fallProtectionSchema: InspectionSchema<FallProtectionInspection> = {
  category: 'fall_protection_inspection',
  table: 'fall_protection_inspections',
  pathPrefix: 'fall-protection',
  templateId: FALL_PROTECTION_TEMPLATE_ID,

  docTitle: 'დამჭერი მოწყობილობების<br>შემოწმების აქტი',
  docSubtitle: 'Fall Protection Equipment Inspection',
  pdfFooterLabel: 'EN 363 · EN 795 · EN 354 · EN 355 · EN 1891 · EN 361',
  pdfNameLabel: 'FallProtectionInspection',
  extraCss: EXTRA_CSS,

  meta: (d) => ({ docId: d.id.slice(-8).toUpperCase(), docDate: fmtDate(d.completedAt ?? d.createdAt) }),

  collectPhotoPaths: (d) => d.items.flatMap((i) => i.photo_paths ?? []),

  blocks: [
    { kind: 'custom', render: (d) => renderGeneral(d) },
    { kind: 'custom', render: (d, photos) => renderChecklist(d, photos) },
    { kind: 'custom', render: (d) => renderVerdict(d) },
  ],
};
