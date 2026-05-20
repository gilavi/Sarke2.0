/**
 * PDF HTML generator for მობილური კიბის შემოწმების აქტი.
 *
 * Layout:
 *   Bilingual header + EN 131 badge →
 *   Section I  (general info 2-col grid) →
 *   Section II (ladder identification param-table; unknown fields marked) →
 *   Section III (visual checklist — Section A, 5 items) →
 *   Section IV  (mobile system checklist — Section B, 3 items) →
 *   Section V   (verdict block + comment) →
 *   Section VI  (single signature block) →
 *   Footer note (EN 131 standards + 5-year document retention)
 */

import { embedInspectionPhotos, escHtml, fmtDate } from './pdfShared';
import {
  ML_CHECKLIST_ITEMS,
  ML_RESULT_TO_CHIP,
  ML_VERDICT_LABELS,
  type MobileLadderInspection,
} from '../types/mobileLadder';

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink:        #1A1A1A;
    --inkSoft:    #6B7280;
    --inkFaint:   #9CA3AF;
    --hairline:   #E5E7EB;
    --card:       #FFFFFF;
    --page:       #F9FAFB;
    --accent:     #1D9E75;
    --green:      #10B981;
    --greenSoft:  #D1FAE5;
    --amber:      #F59E0B;
    --amberSoft:  #FEF3C7;
    --amberBdr:   #D97706;
    --red:        #EF4444;
    --redSoft:    #FEE2E2;
    --redText:    #991B1B;
    --catHdr:     #F3F4F6;
    --na:         #E5E7EB;
    --naText:     #6B7280;
    --unknown:    #F3F4F6;
    --unknownTxt: #6B7280;
  }

  html, body {
    font-family: 'Noto Sans Georgian', 'Arial Unicode MS', Arial, sans-serif;
    font-size: 11px;
    color: var(--ink);
    background: var(--page);
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    max-width: 800px;
    margin: 0 auto;
    background: var(--card);
    padding: 28px 32px 40px;
  }

  /* Header */
  .header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 12px;
    align-items: start;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--accent);
    margin-bottom: 20px;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .logo-box {
    width: 44px; height: 44px; border-radius: 10px;
    background: var(--accent); display: flex; align-items: center;
    justify-content: center; flex-shrink: 0;
  }
  .logo-text { color: #fff; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; }
  .project-name { font-size: 12px; font-weight: 600; color: var(--inkSoft); max-width: 160px; }
  .header-center { text-align: center; }
  .doc-title { font-size: 13px; font-weight: 800; color: var(--ink); line-height: 1.3; }
  .doc-sub { font-size: 11px; color: var(--inkSoft); margin-top: 3px; }
  .regulation-badge {
    display: inline-block; font-size: 10px; font-weight: 700;
    border: 1.5px solid var(--amberBdr); color: #92400E;
    border-radius: 4px; padding: 2px 8px; margin-top: 5px;
  }
  .header-right { text-align: right; }
  .internal-badge {
    display: inline-block; font-size: 10px; font-weight: 600;
    color: var(--inkSoft); border: 1px solid var(--hairline);
    border-radius: 4px; padding: 2px 6px; margin-bottom: 6px;
  }
  .doc-meta { font-size: 10px; color: var(--inkFaint); line-height: 1.6; }

  /* Section title */
  .section-title {
    font-size: 11px; font-weight: 700; color: var(--inkSoft);
    text-transform: uppercase; letter-spacing: 0.6px;
    margin: 18px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--hairline);
  }

  /* Info grid */
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .info-table td { padding: 6px 8px; font-size: 11px; border: 0.5px solid var(--hairline); vertical-align: top; width: 50%; }
  .info-table .lbl { color: var(--inkSoft); font-weight: 600; display: block; font-size: 10px; margin-bottom: 2px; }
  .info-table .val { color: var(--ink); }

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

  /* Checklist table */
  .cl-table { width: 100%; border-collapse: collapse; }
  .cl-table th, .cl-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .cl-table thead tr { background: var(--catHdr); }
  .cl-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .col-num { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-result { width: 100px; white-space: nowrap; }
  .item-damaged { border-left: 3px solid var(--red) !important; }
  .item-comment { font-size: 10px; color: var(--inkSoft); font-style: italic; margin-top: 4px; }
  .item-photo { display: inline-block; margin: 4px 4px 0 0; }
  .item-photo img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); }

  /* Verdict block */
  .verdict-block { margin-top: 14px; }
  .verdict-option {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 8px 10px; border: 1px solid var(--hairline);
    border-radius: 8px; margin-bottom: 6px; font-size: 11px;
  }
  .verdict-option.selected-safe   { border-color: var(--accent); background: #F0FDF9; }
  .verdict-option.selected-minor  { border-color: var(--amberBdr); background: var(--amberSoft); }
  .verdict-option.selected-banned { border-color: var(--red); background: var(--redSoft); }
  .verdict-box {
    width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid var(--hairline);
    flex-shrink: 0; margin-top: 1px;
    display: flex; align-items: center; justify-content: center;
  }
  .verdict-box.checked-safe   { background: var(--accent); border-color: var(--accent); }
  .verdict-box.checked-safe::after   { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-minor  { background: var(--amber); border-color: var(--amberBdr); }
  .verdict-box.checked-minor::after  { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-banned { background: var(--red); border-color: var(--red); }
  .verdict-box.checked-banned::after { content: '✗'; color: #fff; font-size: 9px; }
  .verdict-label { line-height: 1.4; }
  .comment-block {
    margin-top: 12px; padding: 10px 12px;
    border: 0.5px solid var(--hairline); border-radius: 8px;
    min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.5;
  }
  .comment-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }

  /* Signature */
  .sig-block { border: 0.5px solid var(--hairline); border-radius: 8px; overflow: hidden; max-width: 380px; margin-top: 8px; }
  .sig-cell { padding: 10px 12px; border-bottom: 0.5px solid var(--hairline); }
  .sig-cell:last-child { border-bottom: none; }
  .sig-lbl { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .sig-name { font-size: 12px; font-weight: 700; color: var(--ink); }
  .sig-role { font-size: 10px; color: var(--inkSoft); margin-top: 2px; }
  .sig-img  { max-height: 48px; max-width: 100%; margin-top: 4px; }
  .sig-line { height: 36px; border-bottom: 1px dashed var(--hairline); margin: 4px 0; }
  .sig-date { font-size: 11px; color: var(--ink); }

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

  .footer {
    margin-top: 32px; padding-top: 10px;
    border-top: 1px solid var(--hairline);
    display: flex; justify-content: space-between;
    font-size: 10px; color: var(--inkFaint);
  }

  @media print {
    html, body { background: #fff; }
    .page { padding: 0; max-width: none; }
    @page { margin: 18mm 14mm; }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function unknownOrValue(unknown: boolean, value: string | number | null): string {
  if (unknown) return '<span class="pill pill-unknown">მონაცემი ვერ დგინდება</span>';
  const v = value != null ? String(value) : '';
  return escHtml(v) || '—';
}

function checklistPill(result: string | null): string {
  if (result === 'safe')    return '<span class="pill pill-safe">✓ უსაფრთხოა</span>';
  if (result === 'damaged') return '<span class="pill pill-damaged">✗ დაზიანებულია</span>';
  if (result === 'na')      return '<span class="pill pill-na">Z არ გეკუთვნება</span>';
  return '<span class="pill pill-null">—</span>';
}

// ── HTML builder ──────────────────────────────────────────────────────────────

export async function buildMobileLadderPdfHtml(args: {
  inspection: MobileLadderInspection;
  projectName?: string;
}): Promise<string> {
  const { inspection: insp, projectName = 'პროექტი' } = args;

  const allPhotoPaths = insp.items.flatMap(i => i.photo_paths ?? []);
  const photoEmbeds = await embedInspectionPhotos(allPhotoPaths);

  const docId   = insp.id.slice(-8).toUpperCase();
  const docDate = fmtDate(insp.completedAt ?? insp.inspectionDate);

  // ── Header ──────────────────────────────────────────────────────────────────

  const headerHtml = `
    <div class="header">
      <div class="header-left">
        <div class="logo-box"><span class="logo-text">SR</span></div>
        <div class="project-name">${escHtml(projectName)}</div>
      </div>
      <div class="header-center">
        <div class="doc-title">სამუშაო სივრცეში არსებული კიბეების<br>ტექნიკური შემოწმების აქტი</div>
        <div class="doc-sub">Mobile Ladder Technical Inspection</div>
        <span class="regulation-badge">EN 131</span>
      </div>
      <div class="header-right">
        <span class="internal-badge">შიდა სამსახურებრივი დოკუმენტი</span>
        <div class="doc-meta">
          ${escHtml(docDate)}<br>
          ID: ${escHtml(docId)}
        </div>
      </div>
    </div>
  `;

  // ── Section I — ზოგადი ინფორმაცია ──────────────────────────────────────────

  const sectionIHtml = `
    <div class="section-title">I — ზოგადი ინფორმაცია</div>
    <table class="info-table">
      <tr>
        <td><span class="lbl">კომპანიის დასახელება</span><span class="val">${escHtml(insp.company) || '—'}</span></td>
        <td><span class="lbl">შემოწმების თარიღი</span><span class="val">${fmtDate(insp.inspectionDate)}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">მდებარეობა / მისამართი</span><span class="val">${escHtml(insp.address) || '—'}</span></td>
        <td><span class="lbl">შემოწმების ჩამტარებელი</span><span class="val">${escHtml(insp.inspectorName) || '—'}</span></td>
      </tr>
    </table>
  `;

  // ── Section II — კიბის იდენტიფიკაცია ──────────────────────────────────────

  const nextDateVal = insp.nextInspectionDate ? fmtDate(insp.nextInspectionDate) : '—';

  const sectionIIHtml = `
    <div class="section-title">II — კიბის იდენტიფიკაცია</div>
    <table class="param-table">
      <tr><td>სახეობა / Type</td><td>${unknownOrValue(insp.ladderTypeUnknown, insp.ladderType)}</td></tr>
      <tr><td>მწარმოებელი / Model</td><td>${unknownOrValue(insp.modelUnknown, insp.model)}</td></tr>
      <tr><td>სიმაღლე (მ)</td><td>${unknownOrValue(insp.heightUnknown, insp.heightM != null ? `${insp.heightM} მ` : null)}</td></tr>
      <tr><td>მაქს. დატვირთვა (კგ)</td><td>${unknownOrValue(insp.maxLoadUnknown, insp.maxLoadKg != null ? `${insp.maxLoadKg} კგ` : null)}</td></tr>
      <tr><td>მომდევნო შემოწმება</td><td>${nextDateVal}</td></tr>
    </table>
  `;

  // ── Checklist row builder ───────────────────────────────────────────────────

  function buildChecklistRows(sectionKey: 'A' | 'B'): string {
    return ML_CHECKLIST_ITEMS.filter(e => e.section === sectionKey).map(entry => {
      const state = insp.items.find(i => i.id === entry.id);
      const result = state?.result ?? null;
      const chipText = result ? ML_RESULT_TO_CHIP[result] : null;
      const isDamaged = result === 'damaged';

      const photos = (state?.photo_paths ?? []).map(p => {
        const embed = photoEmbeds[p];
        if (!embed) return '';
        return `<span class="item-photo"><img src="${embed}" /></span>`;
      }).join('');

      const commentHtml = state?.comment
        ? `<div class="item-comment">${escHtml(state.comment)}</div>`
        : '';
      const photosHtml = photos ? `<div style="margin-top:4px">${photos}</div>` : '';

      return `
        <tr class="${isDamaged ? 'item-damaged' : ''}">
          <td class="col-num">${entry.id}</td>
          <td>
            ${escHtml(entry.label)}
            ${entry.description ? `<div class="item-comment">${escHtml(entry.description)}</div>` : ''}
            ${commentHtml}${photosHtml}
          </td>
          <td class="col-result">${checklistPill(chipText)}</td>
        </tr>`;
    }).join('');
  }

  // ── Section III — სტრუქტურული მდგომარეობა (A) ─────────────────────────────

  const sectionIIIHtml = `
    <div class="section-title">III — სტრუქტურული მდგომარეობა</div>
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">№</th>
          <th>პუნქტი</th>
          <th class="col-result">შედეგი</th>
        </tr>
      </thead>
      <tbody>${buildChecklistRows('A')}</tbody>
    </table>
  `;

  // ── Section IV — სამობილო სისტემა (B) ────────────────────────────────────

  const sectionIVHtml = `
    <div class="section-title">IV — სამობილო სისტემა</div>
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">№</th>
          <th>პუნქტი</th>
          <th class="col-result">შედეგი</th>
        </tr>
      </thead>
      <tbody>${buildChecklistRows('B')}</tbody>
    </table>
  `;

  // ── Section V — დასკვნა ────────────────────────────────────────────────────

  const verdictOptions = (['safe', 'minor', 'banned'] as const).map(v => {
    const selected = insp.verdict === v;
    const selClass = selected ? `selected-${v}` : '';
    const boxClass = selected ? `checked-${v}` : '';
    return `
      <div class="verdict-option ${selClass}">
        <div class="verdict-box ${boxClass}"></div>
        <span class="verdict-label">${escHtml(ML_VERDICT_LABELS[v])}</span>
      </div>`;
  }).join('');

  const sectionVHtml = `
    <div class="section-title">V — დასკვნა</div>
    <div class="verdict-block">${verdictOptions}</div>
    <div class="comment-block">
      <div class="comment-label">კომენტარი</div>
      ${escHtml(insp.verdictComment) || ''}
    </div>
  `;

  // ── Section VI — ხელმოწერა ────────────────────────────────────────────────

  const sig = insp.signature;
  const sigImgHtml = sig.signature
    ? `<img class="sig-img" src="data:image/png;base64,${sig.signature}" />`
    : `<div class="sig-line"></div>`;

  const sectionVIHtml = `
    <div class="section-title">VI — ხელმოწერა</div>
    <div class="sig-block">
      <div class="sig-cell">
        <div class="sig-lbl">შემომწმებელი პირი</div>
        <div class="sig-name">${escHtml(sig.name) || '—'}</div>
        <div class="sig-role">${escHtml(sig.position) || ''}</div>
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

  // ── Footer note ────────────────────────────────────────────────────────────

  const footerNoteHtml = `
    <div class="footer-note">
      შემოწმება ჩატარდა EN 131-1:2015+A1:2019, EN 131-2:2010+A2:2017, EN 131-3:2018
      სტანდარტების შესაბამისად. დოკუმენტი ინახება 5 წლის განმავლობაში.
    </div>
  `;

  // ── Page footer ────────────────────────────────────────────────────────────

  const pageFooterHtml = `
    <div class="footer">
      <span>Sarke 2.0 — შრომის უსაფრთხოება</span>
      <span>ID: ${escHtml(docId)}</span>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="ka">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>მობილური კიბის შემოწმების აქტი</title>
<style>${CSS}</style>
</head>
<body>
<div class="page">
  ${headerHtml}
  ${sectionIHtml}
  ${sectionIIHtml}
  ${sectionIIIHtml}
  ${sectionIVHtml}
  ${sectionVHtml}
  ${sectionVIHtml}
  ${footerNoteHtml}
  ${pageFooterHtml}
</div>
</body>
</html>`;
}
