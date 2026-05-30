/**
 * Mobile ladder inspection schema — web mirror of the Expo app's
 * `lib/inspection/schemas/mobileLadder.ts` (the `@root` import is eslint-banned).
 * Custom blocks for byte-faithful output: EN 131 badge, ladder-ID param table,
 * two pill checklists (structural / mobile), tri-state verdict, EN-131 footer.
 *
 * Regulatory: the persisted single-signature section is NOT rendered here. The
 * captured signature is appended by `buildInspectionPdf` from the in-memory session.
 */
import { escapeHtml, fmtDate } from '../escape';
import type { InspectionSchema, PhotoMap } from '../schema';
import {
  ML_CHECKLIST_ITEMS,
  ML_RESULT_TO_CHIP,
  ML_VERDICT_LABELS,
  MOBILE_LADDER_TEMPLATE_ID,
  type MobileLadderInspection,
} from '@/lib/types/mobileLadder';

const EXTRA_CSS = `
  :root { --amberBdr: #D97706; --redText: #991B1B; --na: #E5E7EB; --naText: #6B7280; }
  .regulation-badge { display: inline-block; font-size: 10px; font-weight: 700; border: 1.5px solid var(--amberBdr); color: #92400E; border-radius: 4px; padding: 2px 8px; margin-top: 5px; }
  .param-table { width: 100%; border-collapse: collapse; }
  .param-table td { padding: 5px 8px; font-size: 11px; border: 0.5px solid var(--hairline); vertical-align: middle; }
  .param-table td:first-child { width: 52%; color: var(--inkSoft); font-weight: 600; }
  .param-table tr:nth-child(even) td { background: var(--catHdr); }
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .pill-safe { background: var(--greenSoft); color: #065F46; }
  .pill-damaged { background: var(--redSoft); color: var(--redText); }
  .pill-na { background: var(--na); color: var(--naText); }
  .pill-null { background: var(--catHdr); color: var(--inkFaint); }
  .col-result { width: 100px; white-space: nowrap; }
  .item-damaged { border-left: 3px solid var(--red) !important; }
  .verdict-option.selected-safe { border-color: var(--accent); background: #F0FDF9; }
  .verdict-option.selected-minor { border-color: var(--amberBdr); background: var(--amberSoft); }
  .verdict-option.selected-banned { border-color: var(--red); background: var(--redSoft); }
  .verdict-box.checked-safe { background: var(--accent); border-color: var(--accent); }
  .verdict-box.checked-safe::after { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-minor { background: var(--amber); border-color: var(--amberBdr); }
  .verdict-box.checked-minor::after { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-banned { background: var(--red); border-color: var(--red); }
  .verdict-box.checked-banned::after { content: '✗'; color: #fff; font-size: 9px; }
  .comment-block { margin-top: 12px; padding: 10px 12px; border: 0.5px solid var(--hairline); border-radius: 8px; min-height: 48px; font-size: 11px; }
  .comment-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .footer-note { margin-top: 24px; padding: 10px 14px; background: var(--catHdr); border-radius: 6px; font-size: 10px; color: var(--inkSoft); line-height: 1.6; font-style: italic; }
`;

function checklistPill(result: string | null): string {
  if (result === 'safe') return `<span class="pill pill-safe">✓ ${ML_RESULT_TO_CHIP.safe}</span>`;
  if (result === 'damaged') return `<span class="pill pill-damaged">✗ ${ML_RESULT_TO_CHIP.damaged}</span>`;
  if (result === 'na') return `<span class="pill pill-na">${ML_RESULT_TO_CHIP.na}</span>`;
  return '<span class="pill pill-null">—</span>';
}

function renderSectionI(insp: MobileLadderInspection): string {
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

function renderSectionII(insp: MobileLadderInspection): string {
  return `
    <div class="section-title">II — კიბის იდენტიფიკაცია</div>
    <table class="param-table">
      <tr><td>სახეობა / Type</td><td>${escapeHtml(insp.ladderType) || '—'}</td></tr>
      <tr><td>მწარმოებელი / Model</td><td>${escapeHtml(insp.model) || '—'}</td></tr>
      <tr><td>სიმაღლე (მ)</td><td>${insp.heightM != null ? `${insp.heightM} მ` : '—'}</td></tr>
      <tr><td>მაქს. დატვირთვა (კგ)</td><td>${insp.maxLoadKg != null ? `${insp.maxLoadKg} კგ` : '—'}</td></tr>
      <tr><td>მომდევნო შემოწმება</td><td>${insp.nextInspectionDate ? fmtDate(insp.nextInspectionDate) : '—'}</td></tr>
    </table>
  `;
}

function buildRows(insp: MobileLadderInspection, photos: PhotoMap, section: 'A' | 'B'): string {
  return ML_CHECKLIST_ITEMS.filter((e) => e.section === section)
    .map((entry) => {
      const state = insp.items.find((i) => i.id === entry.id);
      const result = state?.result ?? null;
      const photoHtml = (state?.photo_paths ?? [])
        .map((p) => (photos[p] ? `<span class="item-photo"><img src="${photos[p]}" /></span>` : ''))
        .join('');
      const commentHtml = state?.comment ? `<div class="item-comment">${escapeHtml(state.comment)}</div>` : '';
      return `
        <tr class="${result === 'damaged' ? 'item-damaged' : ''}">
          <td class="col-num">${entry.id}</td>
          <td>${escapeHtml(entry.label)}${entry.description ? `<div class="item-comment">${escapeHtml(entry.description)}</div>` : ''}${commentHtml}${photoHtml ? `<div style="margin-top:4px">${photoHtml}</div>` : ''}</td>
          <td class="col-result">${checklistPill(result)}</td>
        </tr>`;
    })
    .join('');
}

function renderChecklist(insp: MobileLadderInspection, photos: PhotoMap, section: 'A' | 'B', title: string): string {
  return `
    <div class="section-title">${title}</div>
    <table class="cl-table">
      <thead><tr><th class="col-num">№</th><th>პუნქტი</th><th class="col-result">შედეგი</th></tr></thead>
      <tbody>${buildRows(insp, photos, section)}</tbody>
    </table>
  `;
}

function renderVerdict(insp: MobileLadderInspection): string {
  const options = (['safe', 'minor', 'banned'] as const)
    .map((v) => {
      const sel = insp.verdict === v;
      return `
      <div class="verdict-option ${sel ? `selected-${v}` : ''}">
        <div class="verdict-box ${sel ? `checked-${v}` : ''}"></div>
        <span class="verdict-label">${escapeHtml(ML_VERDICT_LABELS[v])}</span>
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
      შემოწმება ჩატარდა EN 131-1:2015+A1:2019, EN 131-2:2010+A2:2017, EN 131-3:2018
      სტანდარტების შესაბამისად. დოკუმენტი ინახება 5 წლის განმავლობაში.
    </div>
  `;
}

export const mobileLadderSchema: InspectionSchema<MobileLadderInspection> = {
  category: 'mobile_ladder_inspection',
  table: 'mobile_ladder_inspections',
  pathPrefix: 'mobile-ladder',
  templateId: MOBILE_LADDER_TEMPLATE_ID,

  docTitle: 'სამუშაო სივრცეში არსებული კიბეების<br>ტექნიკური შემოწმების აქტი',
  docSubtitle: 'Mobile Ladder Technical Inspection',
  pdfFooterLabel: 'Sarke 2.0 — შრომის უსაფრთხოება',
  pdfNameLabel: 'MobileLadderInspection',
  extraCss: EXTRA_CSS,

  meta: (d) => ({ docId: d.id.slice(-8).toUpperCase(), docDate: fmtDate(d.completedAt ?? d.inspectionDate) }),

  collectPhotoPaths: (d) => d.items.flatMap((i) => i.photo_paths ?? []),

  blocks: [
    { kind: 'custom', render: () => '<span class="regulation-badge">EN 131</span>' },
    { kind: 'custom', render: (d) => renderSectionI(d) },
    { kind: 'custom', render: (d) => renderSectionII(d) },
    { kind: 'custom', render: (d, photos) => renderChecklist(d, photos, 'A', 'III — სტრუქტურული მდგომარეობა') },
    { kind: 'custom', render: (d, photos) => renderChecklist(d, photos, 'B', 'IV — სამობილო სისტემა') },
    { kind: 'custom', render: (d) => renderVerdict(d) },
    { kind: 'custom', render: () => renderFooterNote() },
  ],
};
