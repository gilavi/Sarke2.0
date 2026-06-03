/**
 * Bobcat-family inspection schema.
 *
 * Web-app mirror of the Expo app's `lib/inspection/schemas/bobcat.ts` (the
 * `@root` import is banned by eslint). Covers both template variants that share
 * the `bobcat_inspections` table — "ციცხვიანი დამტვირთველი" (bobcat / skid-steer)
 * and "დიდი ციცხვიანი დამტვირთველი" (large loader) — distinguished at render
 * time by `inspection.templateId`. Body sections are `custom` blocks for
 * byte-identical output; drives the descriptor-driven PDF in `lib/inspection/pdf.ts`.
 *
 * Regulatory divergence from mobile: the persisted "V — პასუხისმგებელი პირი"
 * signature section is NOT rendered here. Captured inspection signatures are
 * never persisted on web; they are appended by `buildInspectionPdf` from the
 * in-memory `SignaturesSectionData`.
 */
import { escapeHtml, fmtDate } from '../escape';
import type { InspectionSchema, PhotoMap } from '../schema';
import {
  BOBCAT_ITEMS,
  LARGE_LOADER_ITEMS,
  BOBCAT_CATEGORY_LABELS,
  LARGE_LOADER_TEMPLATE_ID,
  BOBCAT_TEMPLATE_ID,
  VERDICT_LABEL,
  categoryCounts,
  type BobcatInspection,
  type BobcatCategory,
  type BobcatChecklistEntry,
} from '@/lib/types/bobcat';

const CATEGORIES: BobcatCategory[] = ['A', 'B', 'C', 'D'];

const EXTRA_CSS = `
  .cl-cat-row td {
    background: var(--catHdr); font-weight: 700;
    font-size: 11px; color: var(--inkSoft); padding: 6px 8px;
  }
  .col-cat { width: 72px; font-weight: 700; }
  .col-result { width: 108px; white-space: nowrap; }

  /* Result pills */
  .pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 7px; border-radius: 12px;
    font-size: 10px; font-weight: 600; white-space: nowrap;
  }
  .pill-good    { background: var(--greenSoft); color: #065F46; }
  .pill-def     { background: var(--amberSoft); color: #92400E; }
  .pill-bad     { background: var(--redSoft);   color: #991B1B; }
  .pill-neutral { background: var(--catHdr);    color: var(--inkSoft); }
  .pill-null    { background: var(--catHdr);    color: var(--inkFaint); }

  /* Summary table */
  .sum-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .sum-table th, .sum-table td {
    border: 0.5px solid var(--hairline);
    padding: 5px 8px; font-size: 11px;
    vertical-align: middle;
  }
  .sum-table thead tr { background: var(--catHdr); }
  .sum-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .sum-count { text-align: center; font-weight: 700; }
  .cnt-good { color: #065F46; }
  .cnt-def  { color: #92400E; }
  .cnt-bad  { color: #991B1B; }
`;

function catalogFor(insp: BobcatInspection): BobcatChecklistEntry[] {
  return insp.templateId === LARGE_LOADER_TEMPLATE_ID ? LARGE_LOADER_ITEMS : BOBCAT_ITEMS;
}

function resultPill(result: string | null, entry?: BobcatChecklistEntry): string {
  if (result === 'good') return '<span class="pill pill-good">1 — კარგია</span>';
  if (result === 'deficient') return '<span class="pill pill-def">2 — ნაკლი</span>';
  if (result === 'unusable') {
    if (entry?.unusableIsNeutral) {
      const label = entry.unusableLabel ?? 'არ გააჩნია';
      return `<span class="pill pill-neutral">— ${escapeHtml(label)}</span>`;
    }
    return '<span class="pill pill-bad">3 — გამოუსადეგ.</span>';
  }
  return '<span class="pill pill-null">—</span>';
}

function renderSectionI(insp: BobcatInspection): string {
  const inspTypeCk = (key: string) =>
    insp.inspectionType === key ? '<span style="color:var(--accent);font-weight:700;">☑</span>' : '☐';

  return `
    <div class="section-title">I — ზოგადი ინფორმაცია</div>
    <table class="info-table">
      <tr>
        <td>
          <span class="lbl">ობიექტი / კომპანია</span>
          <span class="val">${escapeHtml(insp.company) || '—'}</span>
        </td>
        <td>
          <span class="lbl">დამტვირთველის მარკა / მოდელი</span>
          <span class="val">${escapeHtml(insp.equipmentModel) || '—'}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="lbl">მისამართი</span>
          <span class="val">${escapeHtml(insp.address) || '—'}</span>
        </td>
        <td>
          <span class="lbl">სახელმწიფო / ს.ნ ნომერი</span>
          <span class="val">${escapeHtml(insp.registrationNumber) || '—'}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="lbl">შემოწმების თარიღი</span>
          <span class="val">${fmtDate(insp.inspectionDate)}</span>
        </td>
        <td>
          <span class="lbl">შემოწმების სახე</span>
          <span class="val">
            ${inspTypeCk('pre_work')} სამუშაობამდე &nbsp;
            ${inspTypeCk('scheduled')} გეგმური &nbsp;
            ${inspTypeCk('other')} სხვა
          </span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="lbl">ინსპექტორი</span>
          <span class="val">${escapeHtml(insp.inspectorName) || '—'}</span>
        </td>
        <td></td>
      </tr>
    </table>
  `;
}

function renderSectionIII(insp: BobcatInspection, photos: PhotoMap): string {
  const catalog = catalogFor(insp);

  let checklistRows = '';
  let currentCat = '';

  for (const entry of catalog) {
    if (entry.category !== currentCat) {
      currentCat = entry.category;
      checklistRows += `
        <tr class="cl-cat-row">
          <td colspan="4">${escapeHtml(BOBCAT_CATEGORY_LABELS[entry.category])}</td>
        </tr>
      `;
    }

    const state = insp.items.find((i) => i.id === entry.id);
    const result = state?.result ?? null;
    const comment = state?.comment ?? null;
    const photoPaths = state?.photo_paths ?? [];

    let photoHtml = '';
    for (const p of photoPaths) {
      const src = photos[p];
      if (src) {
        photoHtml += `<span class="item-photo"><img src="${src}" alt="ფოტო" /></span>`;
      }
    }

    checklistRows += `
      <tr>
        <td class="col-num">${entry.id}</td>
        <td class="col-cat">${escapeHtml(entry.label)}</td>
        <td>
          ${escapeHtml(entry.description)}
          ${comment ? `<div class="item-comment">${escapeHtml(comment)}</div>` : ''}
          ${photoHtml ? `<div style="margin-top:4px;">${photoHtml}</div>` : ''}
        </td>
        <td class="col-result">${resultPill(result, entry)}</td>
      </tr>
    `;
  }

  return `
    <div class="section-title">III — შემოწმების ჩეკლისტი</div>
    <div class="legend">
      <span class="legend-item"><span class="dot dot-good"></span><strong>1</strong> — კარგია (ნორმაშია)</span>
      <span class="legend-item"><span class="dot dot-def"></span><strong>2</strong> — ნაკლი (საჭიროებს მომსახურებას)</span>
      <span class="legend-item"><span class="dot dot-bad"></span><strong>3</strong> — გამოუსადეგარია</span>
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
      <tbody>${checklistRows}</tbody>
    </table>
  `;
}

function renderSectionIV(insp: BobcatInspection, photos: PhotoMap): string {
  const catalog = catalogFor(insp);

  const sumRows = CATEGORIES.map((cat) => {
    const c = categoryCounts(insp.items, cat, catalog);
    return `
      <tr>
        <td>${escapeHtml(BOBCAT_CATEGORY_LABELS[cat])}</td>
        <td class="sum-count cnt-good">${c.good}</td>
        <td class="sum-count cnt-def">${c.deficient}</td>
        <td class="sum-count cnt-bad">${c.unusable}</td>
      </tr>
    `;
  }).join('');

  const vx = (v: string) => (insp.verdict === v ? 'selected' : '');
  const vchecked = (v: string) => (insp.verdict === v ? 'checked' : '');

  return `
    <div class="section-title">IV — შეჯამება</div>
    <table class="sum-table">
      <thead>
        <tr>
          <th>კატეგორია</th>
          <th>1 — კარგია</th>
          <th>2 — ნაკლი</th>
          <th>3 — გამოუსად.</th>
        </tr>
      </thead>
      <tbody>${sumRows}</tbody>
    </table>

    <div class="verdict-block">
      <div class="verdict-option ${vx('approved')}">
        <div class="verdict-box ${vchecked('approved')}"></div>
        <span class="verdict-label">${escapeHtml(VERDICT_LABEL.approved)}</span>
      </div>
      <div class="verdict-option ${vx('limited')}">
        <div class="verdict-box ${vchecked('limited')}"></div>
        <span class="verdict-label">${escapeHtml(VERDICT_LABEL.limited)}</span>
      </div>
      <div class="verdict-option ${vx('rejected')}">
        <div class="verdict-box ${vchecked('rejected')}"></div>
        <span class="verdict-label">${escapeHtml(VERDICT_LABEL.rejected)}</span>
      </div>
    </div>

    <div class="notes-label" style="margin-top:14px;">შენიშვნები / ხარვეზები</div>
    <div class="notes-block" style="background:#fff;color:#1A1A1A;">${escapeHtml(insp.notes ?? '')}</div>
    ${
      (insp.summaryPhotos ?? []).length > 0
        ? `
      <div class="notes-label" style="margin-top:14px;">ფოტოები</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
        ${(insp.summaryPhotos ?? [])
          .map((p) => {
            const src = photos[p];
            return src
              ? `<img src="${src}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:0.5px solid var(--hairline);" alt="ფოტო" />`
              : '';
          })
          .join('')}
      </div>
    `
        : ''
    }
  `;
}

export const bobcatSchema: InspectionSchema<BobcatInspection> = {
  category: 'bobcat',
  table: 'bobcat_inspections',
  pathPrefix: 'bobcat',
  templateId: BOBCAT_TEMPLATE_ID,

  docTitle: (d) =>
    `${d.templateId === LARGE_LOADER_TEMPLATE_ID ? 'დიდი ციცხვიანი დამტვირთველის' : 'ციცხვიანი დამტვირთველის'}<br>შემოწმების აქტი`,
  docSubtitle: (d) =>
    d.templateId === LARGE_LOADER_TEMPLATE_ID ? 'Large Loader Inspection' : 'Bobcat / Skid-Steer Loader Inspection',
  pdfFooterLabel: (d) =>
    `Hubble — ${d.templateId === LARGE_LOADER_TEMPLATE_ID ? 'დიდი ციცხვიანი დამტვირთველის შემოწმების აქტი' : 'ციცხვიანი დამტვირთველის შემოწმების აქტი'}`,
  pdfNameLabel: 'BobcatInspection',
  extraCss: EXTRA_CSS,

  meta: (d) => ({
    docId: d.id.slice(-8).toUpperCase(),
    docDate: fmtDate(d.completedAt ?? d.createdAt),
  }),

  collectPhotoPaths: (d) => d.items.flatMap((i) => i.photo_paths ?? []).concat(d.summaryPhotos ?? []),

  blocks: [
    { kind: 'custom', render: (d) => renderSectionI(d) },
    { kind: 'custom', render: (d, photos) => renderSectionIII(d, photos) },
    { kind: 'custom', render: (d, photos) => renderSectionIV(d, photos) },
  ],
};
