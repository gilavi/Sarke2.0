/**
 * Lifting accessories inspection schema — web mirror of the Expo app's
 * `lib/inspection/schemas/liftingAccessories.ts` (the `@root` import is
 * eslint-banned). Param table + A/B pill checklist + verdict + EN footer (custom
 * blocks). The persisted two-signatory section is omitted (regulatory); the
 * captured signature is appended by `buildInspectionPdf` from the in-memory session.
 */
import { escapeHtml, fmtDate } from '../escape';
import type { InspectionSchema, PhotoMap } from '../schema';
import {
  LA_CHECKLIST_ITEMS,
  LA_VERDICT_LABELS,
  LIFTING_ACCESSORIES_TEMPLATE_ID,
  type LiftingAccessoriesInspection,
} from '@/lib/types/liftingAccessories';

const EXTRA_CSS = `
  :root { --amberBdr: #D97706; --redText: #991B1B; }
  .param-table { width: 100%; border-collapse: collapse; }
  .param-table td { padding: 5px 8px; font-size: 11px; border: 0.5px solid var(--hairline); vertical-align: middle; }
  .param-table td:first-child { width: 52%; color: var(--inkSoft); font-weight: 600; }
  .param-table tr:nth-child(even) td { background: var(--catHdr); }
  .eq-chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .eq-chip { display: inline-block; font-size: 10px; font-weight: 600; background: var(--greenSoft); color: #065F46; border-radius: 10px; padding: 2px 8px; }
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .pill-ok { background: var(--greenSoft); color: #065F46; }
  .pill-fail { background: var(--redSoft); color: var(--redText); }
  .pill-null { background: var(--catHdr); color: var(--inkFaint); }
  .col-result { width: 110px; white-space: nowrap; }
  .item-fail { border-left: 3px solid var(--red) !important; }
  .verdict-option.selected-pass { border-color: var(--accent); background: #F0FDF9; }
  .verdict-option.selected-repair { border-color: var(--amberBdr); background: var(--amberSoft); }
  .verdict-option.selected-fail { border-color: var(--red); background: var(--redSoft); }
  .verdict-box.checked-pass { background: var(--accent); border-color: var(--accent); }
  .verdict-box.checked-pass::after { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-repair { background: var(--amber); border-color: var(--amberBdr); }
  .verdict-box.checked-repair::after { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-fail { background: var(--red); border-color: var(--red); }
  .verdict-box.checked-fail::after { content: '✗'; color: #fff; font-size: 9px; }
  .comment-block { margin-top: 12px; padding: 10px 12px; border: 0.5px solid var(--hairline); border-radius: 8px; min-height: 48px; font-size: 11px; }
  .comment-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .footer-note { margin-top: 24px; padding: 10px 14px; background: var(--catHdr); border-radius: 6px; font-size: 10px; color: var(--inkSoft); line-height: 1.6; font-style: italic; }
`;

function checklistPill(result: string | null): string {
  if (result === 'ok') return '<span class="pill pill-ok">✓ გამართულია</span>';
  if (result === 'fail') return '<span class="pill pill-fail">✗ გაუმართავია</span>';
  return '<span class="pill pill-null">—</span>';
}

function markingPill(status: string | null): string {
  if (!status) return '—';
  return `<span class="eq-chip">${escapeHtml(status)}</span>`;
}

function renderSectionI(insp: LiftingAccessoriesInspection): string {
  return `
    <div class="section-title">I — ზოგადი ინფორმაცია</div>
    <table class="info-table">
      <tr>
        <td><span class="lbl">კომპანია</span><span class="val">${escapeHtml(insp.company) || '—'}</span></td>
        <td><span class="lbl">შემოწმების თარიღი</span><span class="val">${fmtDate(insp.inspectionDate)}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">მისამართი</span><span class="val">${escapeHtml(insp.address) || '—'}</span></td>
        <td><span class="lbl">ინსპექტორი</span><span class="val">${escapeHtml(insp.inspectorName) || '—'}</span></td>
      </tr>
    </table>
  `;
}

function renderSectionII(insp: LiftingAccessoriesInspection): string {
  const eqChips = insp.equipmentTypes.length > 0
    ? `<div class="eq-chips">${insp.equipmentTypes.map((t) => `<span class="eq-chip">${escapeHtml(t)}</span>`).join('')}</div>`
    : '—';
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
    </table>
  `;
}

function buildRows(insp: LiftingAccessoriesInspection, photos: PhotoMap, section: 'A' | 'B'): string {
  return LA_CHECKLIST_ITEMS.filter((e) => e.section === section)
    .map((entry) => {
      const state = insp.items.find((i) => i.id === entry.id);
      const result = state?.result ?? null;
      const photoHtml = (state?.photo_paths ?? [])
        .map((p) => (photos[p] ? `<span class="item-photo"><img src="${escapeHtml(photos[p])}" /></span>` : ''))
        .join('');
      const commentHtml = state?.comment ? `<div class="item-comment">${escapeHtml(state.comment)}</div>` : '';
      return `
        <tr class="${result === 'fail' ? 'item-fail' : ''}">
          <td class="col-num">${entry.id}</td>
          <td>${escapeHtml(entry.label)}${entry.description ? `<div class="item-comment">${escapeHtml(entry.description)}</div>` : ''}${commentHtml}${photoHtml ? `<div style="margin-top:4px">${photoHtml}</div>` : ''}</td>
          <td class="col-result">${checklistPill(result)}</td>
        </tr>`;
    })
    .join('');
}

function renderChecklist(insp: LiftingAccessoriesInspection, photos: PhotoMap, section: 'A' | 'B', title: string): string {
  return `
    <div class="section-title">${title}</div>
    <table class="cl-table">
      <thead><tr><th class="col-num">№</th><th>პუნქტი</th><th class="col-result">შედეგი</th></tr></thead>
      <tbody>${buildRows(insp, photos, section)}</tbody>
    </table>
  `;
}

function renderVerdict(insp: LiftingAccessoriesInspection): string {
  const options = (['pass', 'repair', 'fail'] as const)
    .map((v) => {
      const sel = insp.verdict === v;
      return `
      <div class="verdict-option ${sel ? `selected-${v}` : ''}">
        <div class="verdict-box ${sel ? `checked-${v}` : ''}"></div>
        <span class="verdict-label">${escapeHtml(LA_VERDICT_LABELS[v])}</span>
      </div>`;
    })
    .join('');
  return `
    <div class="section-title">V — დასკვნა</div>
    <div class="verdict-block">${options}</div>
    <div class="comment-block"><div class="comment-label">კომენტარი</div>${escapeHtml(insp.verdictComment) || ''}</div>
  `;
}

function renderFooterNote(): string {
  return `
    <div class="footer-note">
      შემოწმება ჩატარდა EN 1492-1, EN 818-2, EN 1677-1, ISO 4309 სტანდარტების შესაბამისად.
      დოკუმენტი ინახება 5 წლის განმავლობაში.
    </div>
  `;
}

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

  meta: (d) => ({ docId: d.id.slice(-8).toUpperCase(), docDate: fmtDate(d.completedAt ?? d.inspectionDate) }),

  collectPhotoPaths: (d) => d.items.flatMap((i) => i.photo_paths ?? []).concat(d.summaryPhotos ?? []),

  blocks: [
    { kind: 'custom', render: (d) => renderSectionI(d) },
    { kind: 'custom', render: (d) => renderSectionII(d) },
    { kind: 'custom', render: (d, photos) => renderChecklist(d, photos, 'A', 'III — ვიზუალური შემოწმება') },
    { kind: 'custom', render: (d, photos) => renderChecklist(d, photos, 'B', 'IV — ფუნქციური შემოწმება') },
    { kind: 'custom', render: (d) => renderVerdict(d) },
    { kind: 'custom', render: () => renderFooterNote() },
  ],
};
