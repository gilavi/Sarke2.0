/**
 * General-equipment inspection schema - web mirror of the Expo app's
 * `lib/inspection/schemas/generalEquipment.ts` (the `@root` import is
 * eslint-banned). Flexible/custom template: a free-form equipment table (one row
 * per unit, problem rows highlighted), a conclusion block, and a 4-column
 * signature grid. Types live in the web data module (`@/lib/data/generalEquipment`).
 *
 * Label helpers (`INSPECTION_TYPE_LABEL`, signer-role labels) are inlined here
 * (the web data module doesn't export them); kept identical to mobile
 * `types/generalEquipment.ts`.
 *
 * Regulatory: the persisted signature section is NOT rendered here. The captured
 * signature is appended by `buildInspectionPdf` from the in-memory session.
 */
import { escapeHtml, fmtDate } from '../escape';
import type { InspectionSchema, PhotoMap } from '../schema';
import {
  GENERAL_EQUIPMENT_TEMPLATE_ID,
  type GeneralEquipmentInspection,
  type GECondition,
  type GEInspectionType,
} from '@/lib/data/generalEquipment';

const INSPECTION_TYPE_LABEL: Record<GEInspectionType, string> = {
  initial: 'პირველადი',
  repeat: 'განმეორებითი',
  scheduled: 'გეგმური',
};

const EXTRA_CSS = `
  :root { --amberBdr: #D97706; --red: #DC2626; --redBdr: #B91C1C; }
  .dot-warn { background: var(--amber); }

  .eq-table { width: 100%; border-collapse: collapse; }
  .eq-table th, .eq-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .eq-table thead tr { background: var(--catHdr); }
  .eq-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; text-align: center; }
  .col-check { width: 56px; text-align: center; }
  .col-note  { min-width: 100px; }

  .row-warn td:first-child { border-left: 3px solid var(--amberBdr); }
  .row-bad  td:first-child { border-left: 3px solid var(--redBdr); }
  .row-warn { background: #FFFBEB; }
  .row-bad  { background: #FFF5F5; }

  .ck-good { color: #059669; font-size: 14px; font-weight: 800; }
  .ck-warn { color: #D97706; font-size: 13px; font-weight: 800; }
  .ck-bad  { color: var(--red); font-size: 14px; font-weight: 800; }
  .ck-none { color: var(--inkFaint); }

  .item-note  { font-size: 10px; color: var(--inkSoft); font-style: italic; margin-top: 3px; }

  .conclusion-block { padding: 10px 12px; border: 0.5px solid var(--hairline); border-radius: 8px; min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.6; white-space: pre-wrap; margin-bottom: 10px; }
  .summary-photos { margin-top: 8px; }
  .summary-photos img { width: 90px; height: 90px; border-radius: 6px; }
`;

function conditionClass(c: GECondition | null): string {
  if (c === 'good') return 'ck-good';
  if (c === 'needs_service') return 'ck-warn';
  if (c === 'unusable') return 'ck-bad';
  return 'ck-none';
}
function conditionSymbol(c: GECondition | null): string {
  if (c === 'good') return '✓';
  if (c === 'needs_service') return '⚠';
  if (c === 'unusable') return '✗';
  return '-';
}

function renderInfo(insp: GeneralEquipmentInspection): string {
  const inspTypeLabel = insp.inspectionType ? INSPECTION_TYPE_LABEL[insp.inspectionType] : '-';
  return `
    <div class="section-title">I - ზოგადი ინფორმაცია / General Information</div>
    <table class="info-table">
      <tr>
        <td><span class="lbl">ობიექტის დასახელება / Object</span><span class="val">${escapeHtml(insp.objectName) || '-'}</span></td>
        <td><span class="lbl">მისამართი / Address</span><span class="val">${escapeHtml(insp.address) || '-'}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">საქმიანობის სახე / Activity Type</span><span class="val">${escapeHtml(insp.activityType) || '-'}</span></td>
        <td><span class="lbl">შემოწმების სახე / Inspection Type</span><span class="val">${escapeHtml(inspTypeLabel)}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">შემოწმების თარიღი / Inspection Date</span><span class="val">${fmtDate(insp.inspectionDate)}</span></td>
        <td><span class="lbl">შემომწმებელი / Inspector</span><span class="val">${escapeHtml(insp.inspectorName) || '-'}</span></td>
      </tr>
    </table>
  `;
}

function renderEquipment(insp: GeneralEquipmentInspection, photos: PhotoMap): string {
  const safeEquipment = Array.isArray(insp.equipment) ? insp.equipment : [];
  const legendHtml = `
    <div class="legend">
      <div class="legend-item"><div class="dot dot-good"></div>✓ კარგი / Good</div>
      <div class="legend-item"><div class="dot dot-warn"></div>⚠ საჭ. მომსახ. / Needs Service</div>
      <div class="legend-item"><div class="dot dot-bad"></div>✗ გამოუსადეგარი / Unusable</div>
    </div>
  `;
  const filledRows = safeEquipment.filter((r) => r.name.trim());
  const equipmentRows = filledRows
    .map((row, idx) => {
      const rowClass = row.condition === 'needs_service' ? 'row-warn' : row.condition === 'unusable' ? 'row-bad' : '';
      const photosHtml = (row.photo_paths ?? []).length > 0
        ? (row.photo_paths ?? []).map((p) => (photos[p] ? `<span class="item-photo"><img src="${photos[p]}" alt="ფოტო" /></span>` : '')).join('')
        : '';
      const noteHtml = row.note?.trim() ? `<div class="item-note">${escapeHtml(row.note)}</div>` : '';
      return `
      <tr class="${rowClass}">
        <td class="col-num">${idx + 1}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.model) || '-'}</td>
        <td>${escapeHtml(row.serialNumber) || '-'}</td>
        <td class="col-check"><span class="${conditionClass(row.condition)}">${conditionSymbol(row.condition)}</span></td>
        <td class="col-note">${noteHtml}${photosHtml}</td>
      </tr>
    `;
    })
    .join('');

  return `
    <div class="section-title">II - აღჭურვილობის სია / Equipment List</div>
    ${legendHtml}
    <table class="eq-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>დასახელება / Name</th>
          <th>მარკა/მოდელი / Model</th>
          <th>სერ.ნომ. / Serial</th>
          <th class="col-check">მდ-რეობა / Cond.</th>
          <th class="col-note">შენიშვნა / Note</th>
        </tr>
      </thead>
      <tbody>
        ${equipmentRows || '<tr><td colspan="6" style="text-align:center;color:var(--inkFaint)">-</td></tr>'}
      </tbody>
    </table>
  `;
}

function renderSummary(insp: GeneralEquipmentInspection, photos: PhotoMap): string {
  const safeSummaryPhotos = Array.isArray(insp.summaryPhotos) ? insp.summaryPhotos : [];
  const summaryPhotosHtml = safeSummaryPhotos.length > 0
    ? `<div class="summary-photos">${safeSummaryPhotos.map((p) => (photos[p] ? `<img src="${photos[p]}" alt="ფოტო" />` : '')).join('')}</div>`
    : '';
  return `
    <div class="section-title">III - შეჯამება / Summary</div>
    <div class="conclusion-block">${escapeHtml(insp.conclusion) || '-'}</div>
    ${summaryPhotosHtml}
  `;
}

export const generalEquipmentSchema: InspectionSchema<GeneralEquipmentInspection> = {
  category: 'general_equipment',
  table: 'general_equipment_inspections',
  pathPrefix: 'general-equipment',
  templateId: GENERAL_EQUIPMENT_TEMPLATE_ID,

  docTitle: 'ტექნიკური აღჭურვილობის<br>შემოწმების აქტი',
  docSubtitle: 'Technical Equipment Inspection Report',
  internalBadge: 'INTERNAL',
  pdfFooterLabel: 'Hubble - ტექნიკური ინსპ.',
  pdfNameLabel: 'EquipmentInspection',
  extraCss: EXTRA_CSS,

  meta: (d) => ({
    docId: d.id.slice(-8).toUpperCase(),
    docDate: fmtDate(d.completedAt ?? d.createdAt),
  }),

  headerMetaLines: (d) => (d.actNumber ? [`№ ${d.actNumber}`] : []),

  collectPhotoPaths: (d) => {
    const equipment = Array.isArray(d.equipment) ? d.equipment : [];
    const summary = Array.isArray(d.summaryPhotos) ? d.summaryPhotos : [];
    return equipment.flatMap((r) => r.photo_paths ?? []).concat(summary);
  },

  blocks: [
    { kind: 'custom', render: (d) => renderInfo(d) },
    { kind: 'custom', render: (d, photos) => renderEquipment(d, photos) },
    { kind: 'custom', render: (d, photos) => renderSummary(d, photos) },
  ],
};
