/**
 * Mobile ladder inspection schema (სამუშაო სივრცეში არსებული კიბეების შემოწმების აქტი).
 *
 * Behavior-faithful replacement for lib/mobileLadderPdf.ts. The mobile-ladder
 * layout uses a parameter table with "unknown" pills, pill-style result columns,
 * a tri-state verdict block with per-verdict colors, a single stacked signature
 * block, and an EN 131 standards footer note — none of which map onto the typed
 * blocks — so every section is ported as a `custom` block for equivalent output.
 * It still inherits the shared base CSS, header/footer, and the photo resolver.
 *
 * Known divergences from the old standalone builder (shared-engine tradeoffs,
 * matching the excavator/forklift migrations):
 *   - The EN 131 `regulation-badge` previously sat inside the header's center
 *     column (sibling of the subtitle). The engine header is fixed and has no
 *     slot for it, so it is rendered as the first body block instead (same text,
 *     same `regulation-badge` styling, slightly lower placement).
 *   - The page footer now uses the engine's unified format
 *     ("<label>" / "<date> · ID <id>") instead of the old "ID: <id>".
 */
import { escapeHtml, fmtDate } from '../escape';
import type { InspectionSchema, PhotoMap } from '../schema';
import {
  ML_CHECKLIST_ITEMS,
  ML_RESULT_TO_CHIP,
  ML_VERDICT_LABELS,
  MOBILE_LADDER_TEMPLATE_ID,
  type MobileLadderInspection,
} from '../../../types/mobileLadder';

const EXTRA_CSS = `
  :root {
    --amberBdr:   #D97706;
    --redText:    #991B1B;
    --na:         #E5E7EB;
    --naText:     #6B7280;
    --unknown:    #F3F4F6;
    --unknownTxt: #6B7280;
  }

  .doc-title { font-size: 13px; }

  .regulation-badge {
    display: inline-block; font-size: 10px; font-weight: 700;
    border: 1.5px solid var(--amberBdr); color: #92400E;
    border-radius: 4px; padding: 2px 8px; margin-top: 5px;
  }

  /* Parameter table (ladder ID) */
  .param-table { width: 100%; border-collapse: collapse; }
  .param-table td { padding: 5px 8px; font-size: 11px; border: 0.5px solid var(--hairline); vertical-align: middle; }
  .param-table td:first-child { width: 52%; color: var(--inkSoft); font-weight: 600; }
  .param-table td:last-child { color: var(--ink); }
  .param-table tr:nth-child(even) td { background: var(--catHdr); }

  /* Result pills */
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .pill-safe    { background: var(--greenSoft); color: #065F46; }
  .pill-damaged { background: var(--redSoft);   color: var(--redText); }
  .pill-na      { background: var(--na);         color: var(--naText); }
  .pill-null    { background: var(--catHdr);     color: var(--inkFaint); }
  .pill-unknown { background: var(--unknown);    color: var(--unknownTxt); font-style: italic; }

  /* Verdict pills */
  .pill-verdict-safe   { background: var(--greenSoft); color: #065F46; }
  .pill-verdict-minor  { background: var(--amberSoft); color: #92400E; }
  .pill-verdict-banned { background: var(--redSoft);   color: var(--redText); }

  /* Checklist result column + damaged marker */
  .col-result { width: 100px; white-space: nowrap; }
  .item-damaged { border-left: 3px solid var(--red) !important; }

  /* Verdict block (per-verdict colors) */
  .verdict-option.selected-safe   { border-color: var(--accent); background: #F0FDF9; }
  .verdict-option.selected-minor  { border-color: var(--amberBdr); background: var(--amberSoft); }
  .verdict-option.selected-banned { border-color: var(--red); background: var(--redSoft); }
  .verdict-box.checked-safe   { background: var(--accent); border-color: var(--accent); }
  .verdict-box.checked-safe::after   { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-minor  { background: var(--amber); border-color: var(--amberBdr); }
  .verdict-box.checked-minor::after  { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-banned { background: var(--red); border-color: var(--red); }
  .verdict-box.checked-banned::after { content: '✗'; color: #fff; font-size: 9px; }
  .comment-block {
    margin-top: 12px; padding: 10px 12px;
    border: 0.5px solid var(--hairline); border-radius: 8px;
    min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.5;
  }
  .comment-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }

  /* Signature (single stacked block) */
  .sig-block { border: 0.5px solid var(--hairline); border-radius: 8px; overflow: hidden; max-width: 380px; margin-top: 8px; }
  .sig-cell { padding: 10px 12px; border-bottom: 0.5px solid var(--hairline); border-right: none; }
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function unknownOrValue(unknown: boolean, value: string | number | null): string {
  if (unknown) return '<span class="pill pill-unknown">მონაცემი ვერ დგინდება</span>';
  const v = value != null ? String(value) : '';
  return escapeHtml(v) || '—';
}

function checklistPill(result: string | null): string {
  if (result === 'safe')    return '<span class="pill pill-safe">✓ უსაფრთხოა</span>';
  if (result === 'damaged') return '<span class="pill pill-damaged">✗ დაზიანებულია</span>';
  if (result === 'na')      return '<span class="pill pill-na">Z არ გეკუთვნება</span>';
  return '<span class="pill pill-null">—</span>';
}

// ── Sections ──────────────────────────────────────────────────────────────────

/**
 * EN 131 regulation badge. In the old standalone builder this lived in the
 * header's center column; the shared engine header has no slot for it, so it is
 * emitted as the first body block (same text + styling).
 */
function renderRegulationBadge(): string {
  return `<span class="regulation-badge">EN 131</span>`;
}

function renderSectionI(insp: MobileLadderInspection): string {
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

function renderSectionII(insp: MobileLadderInspection): string {
  const nextDateVal = insp.nextInspectionDate ? fmtDate(insp.nextInspectionDate) : '—';
  return `
    <div class="section-title">II — კიბის იდენტიფიკაცია</div>
    <table class="param-table">
      <tr><td>სახეობა / Type</td><td>${unknownOrValue(insp.ladderTypeUnknown, insp.ladderType)}</td></tr>
      <tr><td>მწარმოებელი / Model</td><td>${unknownOrValue(insp.modelUnknown, insp.model)}</td></tr>
      <tr><td>სიმაღლე (მ)</td><td>${unknownOrValue(insp.heightUnknown, insp.heightM != null ? `${insp.heightM} მ` : null)}</td></tr>
      <tr><td>მაქს. დატვირთვა (კგ)</td><td>${unknownOrValue(insp.maxLoadUnknown, insp.maxLoadKg != null ? `${insp.maxLoadKg} კგ` : null)}</td></tr>
      <tr><td>მომდევნო შემოწმება</td><td>${nextDateVal}</td></tr>
    </table>
  `;
}

function buildChecklistRows(insp: MobileLadderInspection, photos: PhotoMap, sectionKey: 'A' | 'B'): string {
  return ML_CHECKLIST_ITEMS.filter(e => e.section === sectionKey).map(entry => {
    const state = insp.items.find(i => i.id === entry.id);
    const result = state?.result ?? null;
    const chipText = result ? ML_RESULT_TO_CHIP[result] : null;
    const isDamaged = result === 'damaged';

    const photoHtml = (state?.photo_paths ?? []).map(p => {
      const embed = photos[p];
      if (!embed) return '';
      return `<span class="item-photo"><img src="${embed}" /></span>`;
    }).join('');

    const commentHtml = state?.comment
      ? `<div class="item-comment">${escapeHtml(state.comment)}</div>`
      : '';
    const photosHtml = photoHtml ? `<div style="margin-top:4px">${photoHtml}</div>` : '';

    return `
        <tr class="${isDamaged ? 'item-damaged' : ''}">
          <td class="col-num">${entry.id}</td>
          <td>
            ${escapeHtml(entry.label)}
            ${entry.description ? `<div class="item-comment">${escapeHtml(entry.description)}</div>` : ''}
            ${commentHtml}${photosHtml}
          </td>
          <td class="col-result">${checklistPill(chipText)}</td>
        </tr>`;
  }).join('');
}

function renderSectionIII(insp: MobileLadderInspection, photos: PhotoMap): string {
  return `
    <div class="section-title">III — სტრუქტურული მდგომარეობა</div>
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">№</th>
          <th>პუნქტი</th>
          <th class="col-result">შედეგი</th>
        </tr>
      </thead>
      <tbody>${buildChecklistRows(insp, photos, 'A')}</tbody>
    </table>
  `;
}

function renderSectionIV(insp: MobileLadderInspection, photos: PhotoMap): string {
  return `
    <div class="section-title">IV — სამობილო სისტემა</div>
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">№</th>
          <th>პუნქტი</th>
          <th class="col-result">შედეგი</th>
        </tr>
      </thead>
      <tbody>${buildChecklistRows(insp, photos, 'B')}</tbody>
    </table>
  `;
}

function renderSectionV(insp: MobileLadderInspection): string {
  const verdictOptions = (['safe', 'minor', 'banned'] as const).map(v => {
    const selected = insp.verdict === v;
    const selClass = selected ? `selected-${v}` : '';
    const boxClass = selected ? `checked-${v}` : '';
    return `
      <div class="verdict-option ${selClass}">
        <div class="verdict-box ${boxClass}"></div>
        <span class="verdict-label">${escapeHtml(ML_VERDICT_LABELS[v])}</span>
      </div>`;
  }).join('');

  return `
    <div class="section-title">V — დასკვნა</div>
    <div class="verdict-block">${verdictOptions}</div>
    <div class="comment-block">
      <div class="comment-label">კომენტარი</div>
      ${escapeHtml(insp.verdictComment) || ''}
    </div>
  `;
}

function renderSectionVI(insp: MobileLadderInspection): string {
  const sig = insp.signature;
  const sigImgHtml = sig.signature
    ? `<img class="sig-img" src="data:image/png;base64,${sig.signature}" />`
    : `<div class="sig-line"></div>`;

  return `
    <div class="section-title">VI — ხელმოწერა</div>
    <div class="sig-block">
      <div class="sig-cell">
        <div class="sig-lbl">შემომწმებელი პირი</div>
        <div class="sig-name">${escapeHtml(sig.name) || '—'}</div>
        <div class="sig-role">${escapeHtml(sig.position) || ''}</div>
      </div>
      <div class="sig-cell">
        <div class="sig-lbl">ხელმოწერა</div>
        ${sigImgHtml}
      </div>
      <div class="sig-cell">
        <div class="sig-lbl">თარიღი</div>
        <div class="sig-date">${fmtDate(sig.date)}</div>
      </div>
    </div>
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
  pdfFooterLabel: 'Hubble — შრომის უსაფრთხოება',
  pdfNameLabel: 'MobileLadderInspection',
  extraCss: EXTRA_CSS,

  meta: (d) => ({
    docId: d.id.slice(-8).toUpperCase(),
    docDate: fmtDate(d.completedAt ?? d.inspectionDate),
  }),

  collectPhotoPaths: (d) => d.items.flatMap((i) => i.photo_paths ?? []),

  blocks: [
    { kind: 'custom', render: () => renderRegulationBadge() },
    { kind: 'custom', render: (d: MobileLadderInspection) => renderSectionI(d) },
    { kind: 'custom', render: (d: MobileLadderInspection) => renderSectionII(d) },
    { kind: 'custom', render: (d: MobileLadderInspection, photos: PhotoMap) => renderSectionIII(d, photos) },
    { kind: 'custom', render: (d: MobileLadderInspection, photos: PhotoMap) => renderSectionIV(d, photos) },
    { kind: 'custom', render: (d: MobileLadderInspection) => renderSectionV(d) },
    { kind: 'custom', render: (d: MobileLadderInspection) => renderSectionVI(d) },
    { kind: 'custom', render: () => renderFooterNote() },
  ],
};
