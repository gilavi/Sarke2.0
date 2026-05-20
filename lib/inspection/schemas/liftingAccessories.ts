/**
 * Lifting accessories (ტვირთის გადასატანი თასმების / ჩამჭიდების) inspection schema.
 *
 * Behavior-faithful replacement for lib/liftingAccessoriesPdf.ts. The body layout
 * (parameter table, equipment chips, marking/result pills, removed-from-service
 * table, three-state verdict, two-column signature grid, EN-standards footer note)
 * diverges from the typed-block shape, so every section is ported as a `custom`
 * block for byte-identical output. It inherits the shared base CSS, header/footer,
 * and the cross-platform photo resolver.
 *
 * Note: the previous header carried a centered EN-standards `regulation-badge`
 * under the title. The shared engine header has no slot for it; the same standards
 * text is preserved verbatim in the footer-note body block below.
 */
import { escapeHtml, fmtDate } from '../escape';
import type { InspectionSchema, PhotoMap } from '../schema';
import {
  LA_CHECKLIST_ITEMS,
  LA_VERDICT_LABELS,
  LIFTING_ACCESSORIES_TEMPLATE_ID,
  type LiftingAccessoriesInspection,
} from '../../../types/liftingAccessories';

// ── Type-specific CSS (everything not already in BASE_PDF_CSS) ──────────────────

const EXTRA_CSS = `
  :root {
    --amberBdr:   #D97706;
    --redText:    #991B1B;
  }

  /* Parameter table */
  .param-table { width: 100%; border-collapse: collapse; }
  .param-table td { padding: 5px 8px; font-size: 11px; border: 0.5px solid var(--hairline); vertical-align: middle; }
  .param-table td:first-child { width: 52%; color: var(--inkSoft); font-weight: 600; }
  .param-table td:last-child { color: var(--ink); }
  .param-table tr:nth-child(even) td { background: var(--catHdr); }

  /* Equipment type chips */
  .eq-chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .eq-chip {
    display: inline-block; font-size: 10px; font-weight: 600;
    background: var(--greenSoft); color: #065F46;
    border-radius: 10px; padding: 2px 8px;
  }

  /* Marking pills */
  .pill-marking-full    { background: var(--greenSoft); color: #065F46; }
  .pill-marking-partial { background: var(--amberSoft); color: #92400E; }
  .pill-marking-none    { background: var(--redSoft);   color: var(--redText); }

  /* Result pills */
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .pill-ok   { background: var(--greenSoft); color: #065F46; }
  .pill-fail { background: var(--redSoft);   color: var(--redText); }
  .pill-null { background: var(--catHdr);    color: var(--inkFaint); }

  /* Verdict pills */
  .pill-verdict-pass   { background: var(--greenSoft); color: #065F46; }
  .pill-verdict-repair { background: var(--amberSoft); color: #92400E; }
  .pill-verdict-fail   { background: var(--redSoft);   color: var(--redText); }

  /* Checklist table (type-specific overrides) */
  .cl-table th { text-align: left; }
  .col-result { width: 110px; white-space: nowrap; }
  .item-fail { border-left: 3px solid var(--red) !important; }

  /* Removed rows table */
  .removed-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .removed-table th, .removed-table td { border: 0.5px solid var(--hairline); padding: 5px 8px; font-size: 11px; }
  .removed-table thead tr { background: var(--catHdr); }
  .removed-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .removed-table .col-num { width: 28px; text-align: center; }

  /* Photo grid */
  .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .photo-grid img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 6px; border: 0.5px solid var(--hairline); }

  /* Verdict block (type-specific selected/checked states) */
  .verdict-option.selected-pass   { border-color: var(--accent); background: #F0FDF9; }
  .verdict-option.selected-repair { border-color: var(--amberBdr); background: var(--amberSoft); }
  .verdict-option.selected-fail   { border-color: var(--red); background: var(--redSoft); }
  .verdict-box.checked-pass   { background: var(--accent); border-color: var(--accent); }
  .verdict-box.checked-pass::after   { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-repair { background: var(--amber); border-color: var(--amberBdr); }
  .verdict-box.checked-repair::after { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-fail   { background: var(--red); border-color: var(--red); }
  .verdict-box.checked-fail::after   { content: '✗'; color: #fff; font-size: 9px; }
  .comment-block {
    margin-top: 12px; padding: 10px 12px;
    border: 0.5px solid var(--hairline); border-radius: 8px;
    min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.5;
  }
  .comment-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }

  /* Two-column signatures */
  .sig-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
  .sig-block { display: block; gap: 0; margin-top: 0; border: 0.5px solid var(--hairline); border-radius: 8px; overflow: hidden; }
  .sig-cell { padding: 10px 12px; border-right: none; border-bottom: 0.5px solid var(--hairline); }
  .sig-cell:last-child { border-bottom: none; }
  .sig-img  { max-height: 48px; max-width: 100%; margin-top: 4px; }
  .sig-line { height: 36px; border-bottom: 1px dashed var(--hairline); margin: 4px 0; }
  .sig-date { font-size: 11px; color: var(--ink); margin-top: 0; }

  /* Footer note */
  .footer-note {
    margin-top: 24px;
    padding: 10px 14px;
    background: var(--catHdr);
    border-radius: 6px;
    font-size: 10px;
    color: var(--inkSoft);
    line-height: 1.6;
    font-style: italic;
  }
`;

// ── Helpers (ported verbatim from lib/liftingAccessoriesPdf.ts) ─────────────────

function checklistPill(result: string | null): string {
  if (result === 'ok')   return '<span class="pill pill-ok">✓ გამართულია</span>';
  if (result === 'fail') return '<span class="pill pill-fail">✗ გაუმართავია</span>';
  return '<span class="pill pill-null">—</span>';
}

function markingPill(status: string | null): string {
  if (status === 'სრული')        return `<span class="pill pill-marking-full">${escapeHtml(status)}</span>`;
  if (status === 'ნაწილობრივი')   return `<span class="pill pill-marking-partial">${escapeHtml(status)}</span>`;
  if (status === 'არ გააჩნია')   return `<span class="pill pill-marking-none">${escapeHtml(status)}</span>`;
  return '—';
}

function romanLabel(i: number): string {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return romans[i] ?? `${i + 1}`;
}

// ── Section I — ზოგადი ინფორმაცია ──────────────────────────────────────────────

function renderSectionI(insp: LiftingAccessoriesInspection): string {
  return `
    <div class="section-title">I — ზოგადი ინფორმაცია</div>
    <table class="info-table">
      <tr>
        <td><span class="lbl">კომპანიის დასახელება</span><span class="val">${escapeHtml(insp.company) || '—'}</span></td>
        <td><span class="lbl">შემოწმების თარიღი</span><span class="val">${fmtDate(insp.inspectionDate)}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">მდებარეობა / მისამართი</span><span class="val">${escapeHtml(insp.address) || '—'}</span></td>
        <td><span class="lbl">შემოწმების ჩამტარებელი</span><span class="val">${escapeHtml(insp.inspectorName) || '—'}</span></td>
      </tr>
    </table>
  `;
}

// ── Section II — მოწყობილობის იდენტიფიკაცია ────────────────────────────────────

function renderSectionII(insp: LiftingAccessoriesInspection): string {
  const eqChips = insp.equipmentTypes.length > 0
    ? `<div class="eq-chips">${insp.equipmentTypes.map(t => {
        const display = t === 'სხვა' && insp.equipmentTypeOther
          ? `სხვა: ${escapeHtml(insp.equipmentTypeOther)}`
          : escapeHtml(t);
        return `<span class="eq-chip">${display}</span>`;
      }).join('')}</div>`
    : '—';

  const nextDateVal = insp.nextInspectionDate ? fmtDate(insp.nextInspectionDate) : '—';

  return `
    <div class="section-title">II — მოწყობილობის იდენტიფიკაცია</div>
    <table class="param-table">
      <tr><td>ტიპი / სახეობა</td><td>${eqChips}</td></tr>
      <tr><td>სერ. NN / ID</td><td>${escapeHtml(insp.serialNumber) || '—'}</td></tr>
      <tr><td>მწარმოებელი</td><td>${escapeHtml(insp.manufacturer) || '—'}</td></tr>
      <tr><td>წ. წარმოება</td><td>${escapeHtml(insp.yearOfManufacture) || '—'}</td></tr>
      <tr><td>WLL (კგ)</td><td>${escapeHtml(insp.wllKg) || '—'}</td></tr>
      <tr><td>ერთ. რ-ბა</td><td>${escapeHtml(insp.unitCount) || '—'}</td></tr>
      <tr><td>მარკირება</td><td>${markingPill(insp.markingStatus)}</td></tr>
      <tr><td>მომდ. შემოწ.</td><td>${nextDateVal}</td></tr>
    </table>
  `;
}

// ── Checklist row builder ───────────────────────────────────────────────────────

function buildChecklistRows(
  insp: LiftingAccessoriesInspection,
  photos: PhotoMap,
  sectionKey: 'A' | 'B',
): string {
  return LA_CHECKLIST_ITEMS.filter(e => e.section === sectionKey).map(entry => {
    const state = insp.items.find(i => i.id === entry.id);
    const result = state?.result ?? null;
    const isFail = result === 'fail';

    const photoHtml = (state?.photo_paths ?? []).map(p => {
      const embed = photos[p];
      if (!embed) return '';
      return `<span class="item-photo"><img src="${escapeHtml(embed)}" /></span>`;
    }).join('');

    const commentHtml = state?.comment
      ? `<div class="item-comment">${escapeHtml(state.comment)}</div>`
      : '';
    const photosHtml = photoHtml ? `<div style="margin-top:4px">${photoHtml}</div>` : '';

    return `
        <tr class="${isFail ? 'item-fail' : ''}">
          <td class="col-num">${entry.id}</td>
          <td>
            ${escapeHtml(entry.label)}
            ${entry.description ? `<div class="item-comment">${escapeHtml(entry.description)}</div>` : ''}
            ${commentHtml}${photosHtml}
          </td>
          <td class="col-result">${checklistPill(result)}</td>
        </tr>`;
  }).join('');
}

// ── Section III — ვიზუალური შემოწმება (A) ──────────────────────────────────────

function renderSectionIII(insp: LiftingAccessoriesInspection, photos: PhotoMap): string {
  return `
    <div class="section-title">III — ვიზუალური შემოწმება</div>
    <table class="cl-table">
      <thead>
        <tr><th class="col-num">№</th><th>პუნქტი</th><th class="col-result">შედეგი</th></tr>
      </thead>
      <tbody>${buildChecklistRows(insp, photos, 'A')}</tbody>
    </table>
  `;
}

// ── Section IV — ფუნქციური შემოწმება (B) ──────────────────────────────────────

function renderSectionIV(insp: LiftingAccessoriesInspection, photos: PhotoMap): string {
  return `
    <div class="section-title">IV — ფუნქციური შემოწმება</div>
    <table class="cl-table">
      <thead>
        <tr><th class="col-num">№</th><th>პუნქტი</th><th class="col-result">შედეგი</th></tr>
      </thead>
      <tbody>${buildChecklistRows(insp, photos, 'B')}</tbody>
    </table>
  `;
}

// ── Section V — ამოღებული მოწყობილობები ────────────────────────────────────────

function renderSectionV(insp: LiftingAccessoriesInspection): string {
  const removedRowsHtml = insp.removedRows.length > 0
    ? insp.removedRows.map((r, i) => `
        <tr>
          <td class="col-num">${i + 1}</td>
          <td>${escapeHtml(r.serialNumber) || '—'}</td>
          <td>${escapeHtml(r.typeDescription) || '—'}</td>
          <td>${escapeHtml(r.reason) || '—'}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="text-align:center;color:var(--inkFaint);padding:10px">ამოღებული მოწყობილობა არ არის</td></tr>`;

  return `
    <div class="section-title">V — ამოღებული მოწყობილობები სამ-ბ-ი.</div>
    <table class="removed-table">
      <thead>
        <tr>
          <th class="col-num">№</th>
          <th>სერ. NN / ID</th>
          <th>ტ-პ / სახელ.</th>
          <th>ამოღების მიზეზი</th>
        </tr>
      </thead>
      <tbody>${removedRowsHtml}</tbody>
    </table>
  `;
}

// ── Section VI — დასკვნა ────────────────────────────────────────────────────────

function renderSectionVI(insp: LiftingAccessoriesInspection): string {
  const verdictOptions = (['pass', 'repair', 'fail'] as const).map(v => {
    const selected = insp.verdict === v;
    const selClass = selected ? `selected-${v}` : '';
    const boxClass = selected ? `checked-${v}` : '';
    return `
      <div class="verdict-option ${selClass}">
        <div class="verdict-box ${boxClass}"></div>
        <span class="verdict-label">${escapeHtml(LA_VERDICT_LABELS[v])}</span>
      </div>`;
  }).join('');

  return `
    <div class="section-title">VI — დასკვნა</div>
    <div class="verdict-block">${verdictOptions}</div>
    <div class="comment-block">
      <div class="comment-label">კომენტარი</div>
      ${escapeHtml(insp.verdictComment) || ''}
    </div>
  `;
}

// ── Section VII — ფოტო მასალა ───────────────────────────────────────────────────

function renderSectionVII(insp: LiftingAccessoriesInspection, photos: PhotoMap): string {
  const summaryEmbeds = insp.summaryPhotos
    .map(p => photos[p])
    .filter(Boolean);
  if (summaryEmbeds.length === 0) return '';
  const imgs = summaryEmbeds.map(e => `<img src="${escapeHtml(e)}" />`).join('');
  return `
      <div class="section-title">VII — ფოტო მასალა</div>
      <div class="photo-grid">${imgs}</div>
    `;
}

// ── Section VIII — ხელმოწერები ──────────────────────────────────────────────────

function sigBlock(sig: LiftingAccessoriesInspection['signatures'][number], role: string): string {
  const sigImgHtml = sig?.signature
    ? `<img class="sig-img" src="data:image/png;base64,${sig.signature}" />`
    : `<div class="sig-line"></div>`;
  const qualHtml = sig?.extra?.qualification
    ? `<div class="sig-role">${escapeHtml(sig.extra.qualification)}</div>`
    : '';
  return `
      <div class="sig-block">
        <div class="sig-cell">
          <div class="sig-lbl">${escapeHtml(role)}</div>
          <div class="sig-name">${escapeHtml(sig?.name) || '—'}</div>
          <div class="sig-role">${escapeHtml(sig?.position) || ''}</div>
          ${sig?.organization ? `<div class="sig-role">${escapeHtml(sig.organization)}</div>` : ''}
          ${qualHtml}
        </div>
        <div class="sig-cell">
          <div class="sig-lbl">ხელმოწერა</div>
          ${sigImgHtml}
        </div>
        <div class="sig-cell">
          <div class="sig-lbl">თარიღი</div>
          <div class="sig-date">${fmtDate(sig?.date)}</div>
        </div>
      </div>`;
}

function renderSectionVIII(insp: LiftingAccessoriesInspection): string {
  const sigBlocks = insp.signatures.map((sig, i) =>
    sigBlock(sig, `${romanLabel(i)} — ${i === 0 ? 'შემომწმებელი პირი' : 'პასუხისმგებელი პირი'}`)
  ).join('');

  return `
    <div class="section-title">VIII — ხელმოწერები</div>
    <div class="sig-two-col">
      ${sigBlocks}
    </div>
  `;
}

// ── Footer note (EN standards + 5-year retention) ──────────────────────────────

function renderFooterNote(): string {
  return `
    <div class="footer-note">
      შემოწმება ჩატარდა EN 1492-1:2000+A1:2008 (ტექ. სლინგები), EN 818-2:2008 (ჯაჭვური სლინგები),
      EN 1677-1:2008 (ჩამჭიდები/ჰ-ე), ISO 4309:2010 (ბეწვ. სლინგები) სტანდარტების შესაბამისად.
      დოკუმენტი ინახება 5 წლის განმავლობაში.
    </div>
  `;
}

// ── Schema ──────────────────────────────────────────────────────────────────────

export const liftingAccessoriesSchema: InspectionSchema<LiftingAccessoriesInspection> = {
  category: 'lifting_accessories_inspection',
  table: 'lifting_accessories_inspections',
  pathPrefix: 'lifting-accessories',
  templateId: LIFTING_ACCESSORIES_TEMPLATE_ID,

  docTitle: 'ტვირთის გადასატანი თასმების /<br>ჩამჭიდების შემოწმების აქტი',
  docSubtitle: 'Lifting Accessories Inspection Record',
  pdfFooterLabel: 'Sarke 2.0 — შრომის უსაფრთხოება',
  pdfNameLabel: 'LiftingAccessoriesInspection',
  extraCss: EXTRA_CSS,

  meta: (d) => ({
    docId: d.id.slice(-8).toUpperCase(),
    docDate: fmtDate(d.completedAt ?? d.inspectionDate),
  }),

  collectPhotoPaths: (d) =>
    d.items.flatMap((i) => i.photo_paths ?? []).concat(d.summaryPhotos ?? []),

  blocks: [
    { kind: 'custom', render: (d: LiftingAccessoriesInspection) => renderSectionI(d) },
    { kind: 'custom', render: (d: LiftingAccessoriesInspection) => renderSectionII(d) },
    { kind: 'custom', render: (d: LiftingAccessoriesInspection, photos: PhotoMap) => renderSectionIII(d, photos) },
    { kind: 'custom', render: (d: LiftingAccessoriesInspection, photos: PhotoMap) => renderSectionIV(d, photos) },
    { kind: 'custom', render: (d: LiftingAccessoriesInspection) => renderSectionV(d) },
    { kind: 'custom', render: (d: LiftingAccessoriesInspection) => renderSectionVI(d) },
    { kind: 'custom', render: (d: LiftingAccessoriesInspection, photos: PhotoMap) => renderSectionVII(d, photos) },
    { kind: 'custom', render: (d: LiftingAccessoriesInspection) => renderSectionVIII(d) },
    { kind: 'custom', render: () => renderFooterNote() },
  ],
};
