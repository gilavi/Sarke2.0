/**
 * Forklift inspection schema.
 *
 * Behavior-faithful replacement for lib/forkliftPdf.ts. Forklift's body layout
 * diverges from the excavator/typed-block shape (a category column, pill result
 * cells, a static component diagram, a summary-count table), so its sections are
 * ported as `custom` blocks for byte-identical output. It still inherits the
 * shared base CSS, header/footer, and the cross-platform photo resolver.
 */
import { escapeHtml, fmtDate } from '../escape';
import type { InspectionSchema, PhotoMap } from '../schema';
import {
  FORKLIFT_ITEMS,
  FORKLIFT_CATEGORY_LABELS,
  FORKLIFT_VERDICT_LABEL,
  FORKLIFT_SUMMARY_CATS,
  FORKLIFT_COMPONENTS,
  ENGINE_TYPE_LABEL,
  forkliftSubcategoryCounts,
  FORKLIFT_TEMPLATE_ID,
  type ForkliftInspection,
  type ForkliftEngineType,
} from '../../../types/forklift';

const EXTRA_CSS = `
  .engine-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 3px; }
  .engine-chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;
    border: 1px solid var(--hairline); color: var(--inkSoft);
  }
  .engine-chip.active { border-color: var(--accent); background: var(--greenSoft); color: #065F46; }

  .comp-card { background: var(--catHdr); border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; }
  .comp-title { font-size: 11px; font-weight: 700; color: var(--inkSoft); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  .comp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 8px; }
  .comp-item { display: flex; align-items: baseline; gap: 5px; font-size: 10px; color: var(--ink); }
  .comp-key { font-weight: 800; color: var(--accent); min-width: 14px; }

  .cl-cat-row td { background: var(--catHdr); font-weight: 700; font-size: 11px; color: var(--inkSoft); padding: 6px 8px; }
  .col-cat { width: 72px; font-weight: 700; }
  .col-result { width: 108px; white-space: nowrap; }

  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .pill-good { background: var(--greenSoft); color: #065F46; }
  .pill-def  { background: var(--amberSoft); color: #92400E; }
  .pill-bad  { background: var(--redSoft);   color: #991B1B; }
  .pill-null { background: var(--catHdr);    color: var(--inkFaint); }

  .sum-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .sum-table th, .sum-table td { border: 0.5px solid var(--hairline); padding: 5px 8px; font-size: 11px; vertical-align: middle; }
  .sum-table thead tr { background: var(--catHdr); }
  .sum-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .sum-count { text-align: center; font-weight: 700; }
  .cnt-good { color: #065F46; }
  .cnt-def  { color: #92400E; }
  .cnt-bad  { color: #991B1B; }

  .sig-block { grid-template-columns: 2fr 1fr 1fr; }
`;

function resultPill(result: string | null): string {
  if (result === 'good') return '<span class="pill pill-good">✓ კარგია</span>';
  if (result === 'deficient') return '<span class="pill pill-def">⚠ ნაკლი</span>';
  if (result === 'unusable') return '<span class="pill pill-bad">✗ გამოუსადეგ.</span>';
  return '<span class="pill pill-null">—</span>';
}

function renderIdentification(insp: ForkliftInspection): string {
  const engineChipsHtml = (['electric', 'gasoline', 'diesel', 'gas'] as ForkliftEngineType[])
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
        <td><span class="lbl">შემოწმების თარიღი</span><span class="val">${escapeHtml(fmtDate(insp.inspectionDate))}</span></td>
        <td><span class="lbl">ძრავის ტიპი</span><div class="engine-chips">${engineChipsHtml}</div></td>
      </tr>
      <tr>
        <td><span class="lbl">ინსპექტორი</span><span class="val">${escapeHtml(insp.inspectorName) || '—'}</span></td>
        <td></td>
      </tr>
    </table>
  `;
}

function renderComponentDiagram(): string {
  const compItems = FORKLIFT_COMPONENTS.map(
    (c) => `<div class="comp-item"><span class="comp-key">${escapeHtml(c.key)}</span>${escapeHtml(c.label)}</div>`,
  ).join('');
  return `
    <div class="section-title">II — კომპონენტების სქემა</div>
    <div class="comp-card">
      <div class="comp-title">ძირითადი კომპონენტები (A–K)</div>
      <div class="comp-grid">${compItems}</div>
    </div>
  `;
}

function renderChecklist(insp: ForkliftInspection, photos: PhotoMap): string {
  let rows = '';
  let currentCat = '';
  for (const entry of FORKLIFT_ITEMS) {
    if (entry.category !== currentCat) {
      currentCat = entry.category;
      rows += `<tr class="cl-cat-row"><td colspan="4">${escapeHtml(FORKLIFT_CATEGORY_LABELS[entry.category])}</td></tr>`;
    }
    const state = insp.items.find((i) => i.id === entry.id);
    const result = state?.result ?? null;
    const comment = state?.comment ?? null;
    const photoPaths = state?.photo_paths ?? [];
    const photoHtml = photoPaths
      .map((p) => (photos[p] ? `<img src="${escapeHtml(photos[p])}" alt="ფოტო" />` : ''))
      .join('');
    rows += `
      <tr>
        <td class="col-num">${entry.id}</td>
        <td class="col-cat">${escapeHtml(entry.label)}</td>
        <td>
          ${escapeHtml(entry.description)}
          ${comment ? `<div class="item-comment">${escapeHtml(comment)}</div>` : ''}
          ${photoHtml ? `<div class="item-photo" style="margin-top:4px;">${photoHtml}</div>` : ''}
        </td>
        <td class="col-result">${resultPill(result)}</td>
      </tr>`;
  }
  return `
    <div class="section-title">III — შემოწმების ჩეკლისტი</div>
    <div class="legend">
      <span class="legend-item"><span class="dot dot-good"></span>✓ კარგი — ნორმაში</span>
      <span class="legend-item"><span class="dot dot-def"></span>⚠ ნაკლი — საჭიროებს მომსახურებას</span>
      <span class="legend-item"><span class="dot dot-bad"></span>✗ გამოუსადეგარი</span>
    </div>
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-cat">კატეგ.</th>
          <th>შემოწმების პუნქტი</th>
          <th class="col-result">შედეგი</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderSummaryAndVerdict(insp: ForkliftInspection, photos: PhotoMap): string {
  const sumRows = FORKLIFT_SUMMARY_CATS.map((cat) => {
    const c = forkliftSubcategoryCounts(insp.items, cat.ids);
    return `
      <tr>
        <td>${escapeHtml(cat.label)}</td>
        <td class="sum-count cnt-good">${c.good}</td>
        <td class="sum-count cnt-def">${c.deficient}</td>
        <td class="sum-count cnt-bad">${c.unusable}</td>
      </tr>`;
  }).join('');

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
    <div class="section-title">IV — შეჯამება და დასკვნა</div>
    <table class="sum-table">
      <thead>
        <tr>
          <th>კატეგორია</th>
          <th>კარგი ✓</th>
          <th>ნაკლი ⚠</th>
          <th>გამოუსად. ✗</th>
        </tr>
      </thead>
      <tbody>${sumRows}</tbody>
    </table>
    <div class="verdict-block">
      <div class="verdict-option ${vx('approved')}"><div class="verdict-box ${vchecked('approved')}"></div><span>${escapeHtml(FORKLIFT_VERDICT_LABEL.approved)}</span></div>
      <div class="verdict-option ${vx('limited')}"><div class="verdict-box ${vchecked('limited')}"></div><span>${escapeHtml(FORKLIFT_VERDICT_LABEL.limited)}</span></div>
      <div class="verdict-option ${vx('rejected')}"><div class="verdict-box ${vchecked('rejected')}"></div><span>${escapeHtml(FORKLIFT_VERDICT_LABEL.rejected)}</span></div>
    </div>
    ${notesHtml}
    ${photosHtml}
  `;
}

function renderSignature(insp: ForkliftInspection): string {
  const sigDataUrl = insp.signerSignature ? `data:image/png;base64,${insp.signerSignature}` : null;
  const sigDate = insp.completedAt ? fmtDate(insp.completedAt) : fmtDate(insp.inspectionDate);
  const sigImg = sigDataUrl
    ? `<img class="sig-img" src="${escapeHtml(sigDataUrl)}" alt="ხელმოწერა" />`
    : '<div style="height:48px;border-bottom:1px dashed var(--hairline);"></div>';
  return `
    <div class="section-title">V — პასუხისმგებელი პირი</div>
    <div class="sig-block">
      <div class="sig-cell">
        <div class="sig-lbl">უსაფრთ.სპეც. / ტექნიკოსი / ოპერატორი</div>
        <div class="sig-name">${escapeHtml(insp.signerName || insp.inspectorName) || '—'}</div>
        <div class="sig-role">${escapeHtml(insp.signerPosition) || 'თანამდებობა'}</div>
        ${insp.signerPhone ? `<div class="sig-role" style="margin-top:2px;">${escapeHtml(insp.signerPhone)}</div>` : ''}
      </div>
      <div class="sig-cell"><div class="sig-lbl">ხელმოწერა</div>${sigImg}</div>
      <div class="sig-cell"><div class="sig-lbl">თარიღი</div><div class="sig-date">${escapeHtml(sigDate)}</div></div>
    </div>
  `;
}

export const forkliftSchema: InspectionSchema<ForkliftInspection> = {
  category: 'forklift_inspection',
  table: 'forklift_inspections',
  pathPrefix: 'forklift',
  templateId: FORKLIFT_TEMPLATE_ID,

  docTitle: 'ჩანგლიანი დამტვირთველის<br>შემოწმების აქტი',
  docSubtitle: 'Forklift Technical Inspection Act',
  pdfFooterLabel: 'Sarke 2.0 — ჩანგლიანი დამტვირთველის შემოწმების აქტი',
  pdfNameLabel: 'ForkliftInspection',
  extraCss: EXTRA_CSS,

  meta: (d) => ({
    docId: d.id.slice(-8).toUpperCase(),
    docDate: fmtDate(d.completedAt ?? d.createdAt),
  }),

  collectPhotoPaths: (d) =>
    d.items.flatMap((i) => i.photo_paths ?? []).concat(d.summaryPhotos ?? []),

  blocks: [
    { kind: 'custom', render: (d: ForkliftInspection) => renderIdentification(d) },
    { kind: 'custom', render: () => renderComponentDiagram() },
    { kind: 'custom', render: (d: ForkliftInspection, photos: PhotoMap) => renderChecklist(d, photos) },
    { kind: 'custom', render: (d: ForkliftInspection, photos: PhotoMap) => renderSummaryAndVerdict(d, photos) },
    { kind: 'custom', render: (d: ForkliftInspection) => renderSignature(d) },
  ],
};
