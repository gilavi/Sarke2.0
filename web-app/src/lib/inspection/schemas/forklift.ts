/**
 * Forklift inspection schema — web mirror of the Expo app's
 * `lib/inspection/schemas/forklift.ts` (the `@root` import is eslint-banned).
 * Category-grouped pill checklist + verdict (custom blocks). The persisted
 * signature section is omitted (regulatory); the captured signature is appended
 * by `buildInspectionPdf` from the in-memory session.
 */
import { escapeHtml, fmtDate } from '../escape';
import type { InspectionSchema, PhotoMap } from '../schema';
import {
  FORKLIFT_ITEMS,
  FORKLIFT_CATEGORY_LABELS,
  FORKLIFT_VERDICT_LABEL,
  ENGINE_TYPE_LABEL,
  FORKLIFT_TEMPLATE_ID,
  type ForkliftInspection,
  type ForkliftEngineType,
} from '@/lib/types/forklift';

const EXTRA_CSS = `
  .engine-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 3px; }
  .engine-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; border: 1px solid var(--hairline); color: var(--inkSoft); }
  .engine-chip.active { border-color: var(--accent); background: var(--greenSoft); color: #065F46; }
  .cl-cat-row td { background: var(--catHdr); font-weight: 700; font-size: 11px; color: var(--inkSoft); padding: 6px 8px; }
  .col-cat { width: 72px; font-weight: 700; }
  .col-result { width: 108px; white-space: nowrap; }
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .pill-good { background: var(--greenSoft); color: #065F46; }
  .pill-def  { background: var(--amberSoft); color: #92400E; }
  .pill-bad  { background: var(--redSoft); color: #991B1B; }
  .pill-null { background: var(--catHdr); color: var(--inkFaint); }
`;

function resultPill(result: string | null): string {
  if (result === 'good') return '<span class="pill pill-good">✓ კარგია</span>';
  if (result === 'deficient') return '<span class="pill pill-def">⚠ ნაკლი</span>';
  if (result === 'unusable') return '<span class="pill pill-bad">✗ გამოუსადეგ.</span>';
  return '<span class="pill pill-null">—</span>';
}

function renderIdentification(insp: ForkliftInspection): string {
  const chips = (['electric', 'gasoline', 'diesel', 'gas'] as ForkliftEngineType[])
    .map((t) => {
      const active = insp.engineType === t;
      return `<span class="engine-chip${active ? ' active' : ''}">${active ? '☑' : '☐'} ${escapeHtml(ENGINE_TYPE_LABEL[t])}</span>`;
    })
    .join('');
  return `
    <div class="section-title">I — საიდენტიფიკაციო მონაცემები</div>
    <table class="info-table">
      <tr>
        <td><span class="lbl">ობიექტი / კომპანია</span><span class="val">${escapeHtml(insp.company) || '—'}</span></td>
        <td><span class="lbl">მარკა / მოდელი</span><span class="val">${escapeHtml(insp.brandModel) || '—'}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">მისამართი</span><span class="val">${escapeHtml(insp.address) || '—'}</span></td>
        <td><span class="lbl">ინვენტ. / სერიული ნომერი</span><span class="val">${escapeHtml(insp.inventoryNumber) || '—'}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">შემოწმების თარიღი</span><span class="val">${fmtDate(insp.inspectionDate)}</span></td>
        <td><span class="lbl">ძრავის ტიპი</span><div class="engine-chips">${chips}</div></td>
      </tr>
      <tr><td><span class="lbl">ინსპექტორი</span><span class="val">${escapeHtml(insp.inspectorName) || '—'}</span></td><td></td></tr>
    </table>
  `;
}

function renderChecklist(insp: ForkliftInspection, photos: PhotoMap): string {
  let rows = '';
  let cat = '';
  for (const entry of FORKLIFT_ITEMS) {
    if (entry.category !== cat) {
      cat = entry.category;
      rows += `<tr class="cl-cat-row"><td colspan="4">${escapeHtml(FORKLIFT_CATEGORY_LABELS[entry.category])}</td></tr>`;
    }
    const state = insp.items.find((i) => i.id === entry.id);
    const comment = state?.comment ?? null;
    const photoHtml = (state?.photo_paths ?? [])
      .map((p) => (photos[p] ? `<img src="${escapeHtml(photos[p])}" alt="ფოტო" />` : ''))
      .join('');
    rows += `
      <tr>
        <td class="col-num">${entry.id}</td>
        <td class="col-cat">${escapeHtml(entry.label)}</td>
        <td>${escapeHtml(entry.description)}${comment ? `<div class="item-comment">${escapeHtml(comment)}</div>` : ''}${photoHtml ? `<div class="item-photo" style="margin-top:4px;">${photoHtml}</div>` : ''}</td>
        <td class="col-result">${resultPill(state?.result ?? null)}</td>
      </tr>`;
  }
  return `
    <div class="section-title">II — შემოწმების ჩეკლისტი</div>
    <div class="legend">
      <span class="legend-item"><span class="dot dot-good"></span>✓ კარგი — ნორმაში</span>
      <span class="legend-item"><span class="dot dot-def"></span>⚠ ნაკლი — საჭიროებს მომსახურებას</span>
      <span class="legend-item"><span class="dot dot-bad"></span>✗ გამოუსადეგარი</span>
    </div>
    <table class="cl-table">
      <thead><tr><th class="col-num">#</th><th class="col-cat">კატეგ.</th><th>შემოწმების პუნქტი</th><th class="col-result">შედეგი</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderVerdict(insp: ForkliftInspection, photos: PhotoMap): string {
  const vx = (v: string) => (insp.verdict === v ? 'selected' : '');
  const vchecked = (v: string) => (insp.verdict === v ? 'checked' : '');
  const notesHtml = insp.notes
    ? `<div class="notes-label" style="margin-top:14px;">შენიშვნები / ხარვეზები</div><div class="notes-block">${escapeHtml(insp.notes)}</div>`
    : '';
  const summaryImgs = (insp.summaryPhotos ?? [])
    .map((p) => (photos[p] ? `<img src="${escapeHtml(photos[p])}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:0.5px solid var(--hairline);" alt="ფოტო" />` : ''))
    .join('');
  const photosHtml = summaryImgs
    ? `<div class="notes-label" style="margin-top:14px;">ფოტოები</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">${summaryImgs}</div>`
    : '';
  return `
    <div class="section-title">III — დასკვნა</div>
    <div class="verdict-block">
      <div class="verdict-option ${vx('approved')}"><div class="verdict-box ${vchecked('approved')}"></div><span class="verdict-label">${escapeHtml(FORKLIFT_VERDICT_LABEL.approved)}</span></div>
      <div class="verdict-option ${vx('limited')}"><div class="verdict-box ${vchecked('limited')}"></div><span class="verdict-label">${escapeHtml(FORKLIFT_VERDICT_LABEL.limited)}</span></div>
      <div class="verdict-option ${vx('rejected')}"><div class="verdict-box ${vchecked('rejected')}"></div><span class="verdict-label">${escapeHtml(FORKLIFT_VERDICT_LABEL.rejected)}</span></div>
    </div>
    ${notesHtml}
    ${photosHtml}
  `;
}

export const forkliftSchema: InspectionSchema<ForkliftInspection> = {
  category: 'forklift_inspection',
  table: 'forklift_inspections',
  pathPrefix: 'forklift',
  templateId: FORKLIFT_TEMPLATE_ID,

  docTitle: 'ჩანგლიანი დამტვირთველის<br>შემოწმების აქტი',
  docSubtitle: 'Forklift Technical Inspection Act',
  pdfFooterLabel: 'Hubble — ჩანგლიანი დამტვირთველის შემოწმების აქტი',
  pdfNameLabel: 'ForkliftInspection',
  extraCss: EXTRA_CSS,

  meta: (d) => ({ docId: d.id.slice(-8).toUpperCase(), docDate: fmtDate(d.completedAt ?? d.createdAt) }),

  collectPhotoPaths: (d) => d.items.flatMap((i) => i.photo_paths ?? []).concat(d.summaryPhotos ?? []),

  blocks: [
    { kind: 'custom', render: (d) => renderIdentification(d) },
    { kind: 'custom', render: (d, photos) => renderChecklist(d, photos) },
    { kind: 'custom', render: (d, photos) => renderVerdict(d, photos) },
  ],
};
