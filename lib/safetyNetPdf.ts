/**
 * PDF HTML generator for უსაფრთხოების ბადის შემოწმების აქტი.
 *
 * Layout:
 *   Bilingual header + №477 badge →
 *   Section I  (general info 2-col grid) →
 *   Section II (net identification param-table + certificate pill) →
 *   Section III (visual checklist 10 items) →
 *   Section IV (load test table + instruction note) →
 *   Section V  (post-load-test checklist 5 items) →
 *   Section VI (verdict block + comment) →
 *   Section VII (two signature blocks side-by-side + legal note) →
 *   Section VIII (qual doc photo) →
 *   Section IX  (summary photos 2-col grid)
 *
 * Call `generateAndSharePdf` from `lib/pdfOpen.ts` with the returned HTML.
 */

import { embedInspectionPhotos, escHtml, fmtDate } from './pdfShared';
import {
  SN_VISUAL_ITEMS,
  SN_POST_TEST_ITEMS,
  SN_VERDICT_LABEL,
  snTotalWeight,
  type SafetyNetInspection,
} from '../types/safetyNet';

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
  .doc-title { font-size: 14px; font-weight: 800; color: var(--ink); line-height: 1.3; }
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

  /* Parameter table (net ID) */
  .param-table { width: 100%; border-collapse: collapse; }
  .param-table td { padding: 5px 8px; font-size: 11px; border: 0.5px solid var(--hairline); vertical-align: middle; }
  .param-table td:first-child { width: 52%; color: var(--inkSoft); font-weight: 600; }
  .param-table td:last-child { color: var(--ink); }
  .param-table tr:nth-child(even) td { background: var(--catHdr); }

  /* Result pills */
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .pill-good { background: var(--greenSoft); color: #065F46; }
  .pill-fix  { background: var(--amberSoft); color: #92400E; }
  .pill-na   { background: var(--na); color: var(--naText); }
  .pill-null { background: var(--catHdr); color: var(--inkFaint); }
  .pill-pass { background: var(--greenSoft); color: #065F46; }
  .pill-fail { background: var(--redSoft); color: var(--redText); }
  .pill-cert-active   { background: var(--greenSoft); color: #065F46; }
  .pill-cert-expired  { background: var(--redSoft); color: var(--redText); }
  .pill-cert-none     { background: var(--na); color: var(--naText); }

  /* Checklist table */
  .cl-table { width: 100%; border-collapse: collapse; }
  .cl-table th, .cl-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .cl-table thead tr { background: var(--catHdr); }
  .cl-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .col-num { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-result { width: 80px; white-space: nowrap; }
  .col-comment { width: 180px; }
  .item-fix { border-left: 3px solid var(--amberBdr) !important; }
  .item-fail { border-left: 3px solid var(--red) !important; }
  .item-comment { font-size: 10px; color: var(--inkSoft); font-style: italic; margin-top: 4px; }
  .item-photo { display: inline-block; margin: 4px 4px 0 0; }
  .item-photo img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); }

  /* Load test table */
  .load-table { width: 100%; border-collapse: collapse; }
  .load-table th, .load-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .load-table thead tr { background: var(--catHdr); }
  .load-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .load-total td { background: var(--catHdr); font-weight: 700; }
  .load-instruction {
    font-size: 10px; color: var(--inkSoft); font-style: italic;
    padding: 6px 10px; background: var(--amberSoft); border-radius: 6px;
    margin-bottom: 8px; border-left: 3px solid var(--amberBdr);
  }

  /* Verdict block */
  .verdict-block { margin-top: 14px; }
  .verdict-option {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 8px 10px; border: 1px solid var(--hairline);
    border-radius: 8px; margin-bottom: 6px; font-size: 11px;
  }
  .verdict-option.selected { border-color: var(--accent); background: #F0FDF9; }
  .verdict-option.selected-fail { border-color: var(--red); background: var(--redSoft); }
  .verdict-box {
    width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid var(--hairline);
    flex-shrink: 0; margin-top: 1px;
    display: flex; align-items: center; justify-content: center;
  }
  .verdict-box.checked { background: var(--accent); border-color: var(--accent); }
  .verdict-box.checked::after { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-fail { background: var(--red); border-color: var(--red); }
  .verdict-box.checked-fail::after { content: '✗'; color: #fff; font-size: 9px; }
  .verdict-label { line-height: 1.4; }
  .comment-block {
    margin-top: 12px; padding: 10px 12px;
    border: 0.5px solid var(--hairline); border-radius: 8px;
    min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.5;
  }
  .comment-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }

  /* Photos */
  .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
  .photo-item img { width: 100%; border-radius: 6px; border: 0.5px solid var(--hairline); display: block; }
  .photo-caption { font-size: 10px; color: var(--inkFaint); margin-top: 3px; text-align: center; }
  .qual-doc-img { max-width: 100%; border-radius: 8px; border: 0.5px solid var(--hairline); display: block; margin: 0 auto; }

  /* Signatures */
  .sig-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
  .sig-block { border: 0.5px solid var(--hairline); border-radius: 8px; overflow: hidden; }
  .sig-cell { padding: 10px 12px; border-bottom: 0.5px solid var(--hairline); }
  .sig-cell:last-child { border-bottom: none; }
  .sig-lbl { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .sig-name { font-size: 12px; font-weight: 700; color: var(--ink); }
  .sig-role { font-size: 10px; color: var(--inkSoft); margin-top: 2px; }
  .sig-org  { font-size: 10px; color: var(--inkSoft); }
  .sig-img  { max-height: 48px; max-width: 100%; margin-top: 4px; }
  .sig-line { height: 36px; border-bottom: 1px dashed var(--hairline); margin: 4px 0; }
  .sig-date { font-size: 11px; color: var(--ink); }

  .legal-note {
    margin-top: 16px; font-size: 9px; color: var(--inkFaint);
    text-align: center; line-height: 1.5; font-style: italic;
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

// ── HTML builder ──────────────────────────────────────────────────────────────

export async function buildSafetyNetPdfHtml(args: {
  inspection: SafetyNetInspection;
  projectName?: string;
}): Promise<string> {
  const { inspection: insp, projectName = 'პროექტი' } = args;

  const allPhotoPaths = [
    ...insp.items.flatMap(i => i.photo_paths ?? []),
    ...(insp.qualDocPath ? [insp.qualDocPath] : []),
    ...insp.summaryPhotos,
  ];
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
        <div class="doc-title">უსაფრთხოების ბადის შემოწმების აქტი</div>
        <div class="doc-sub">Safety Net Inspection &amp; Acceptance Act</div>
        <span class="regulation-badge">№477 დადგენილება</span>
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

  // ── Section II — ბადის იდენტიფიკაცია ──────────────────────────────────────

  const certPill = (() => {
    if (!insp.certificate) return '<span class="pill pill-null">—</span>';
    if (insp.certificate === 'active')  return '<span class="pill pill-cert-active">მოქმედი სერტ.</span>';
    if (insp.certificate === 'expired') return '<span class="pill pill-cert-expired">ვადაგასული</span>';
    return '<span class="pill pill-cert-none">სერტ. არ გააჩნია</span>';
  })();

  const sectionIIHtml = `
    <div class="section-title">II — ბადის იდენტიფიკაცია</div>
    <table class="param-table">
      <tr><td>მწარმოებელი</td><td>${escHtml(insp.manufacturer) || '—'}</td></tr>
      <tr><td>ბადის ზომა მ×მ</td><td>${escHtml(insp.netSize) || '—'}</td></tr>
      <tr><td>დგარის ზომა</td><td>${escHtml(insp.postSize) || '—'}</td></tr>
      <tr><td>დგარების რაოდენობა</td><td>${insp.postCount ?? '—'}</td></tr>
      <tr><td>დგარის სამაგრების რ-ბა</td><td>${insp.postAnchorCount ?? '—'}</td></tr>
      <tr><td>სამაგრი წერტილების რ-ბა</td><td>${insp.anchorPointCount ?? '—'}</td></tr>
      <tr><td>კიდის ბაგირების რ-ბა</td><td>${insp.edgeRopeCount ?? '—'}</td></tr>
      <tr><td>უჯრედის მხარე</td><td>${escHtml(insp.cellSide) || '—'}</td></tr>
      <tr><td>სამუშაო მანძილი</td><td>${escHtml(insp.workingDistance) || '—'}</td></tr>
      <tr><td>სერტიფიკატი</td><td>${certPill}</td></tr>
    </table>
  `;

  // ── Section III — ვიზუალური შემოწმება ──────────────────────────────────────

  const visualRows = SN_VISUAL_ITEMS.map(entry => {
    const state = insp.items.find(i => i.id === entry.id);
    const result = state?.result ?? null;
    const isFix = result === 'fix';

    const pillHtml = (() => {
      if (result === 'good') return '<span class="pill pill-good">კარგი</span>';
      if (result === 'fix')  return '<span class="pill pill-fix">გამოსასწ.</span>';
      if (result === 'na')   return '<span class="pill pill-na">N/A</span>';
      return '<span class="pill pill-null">—</span>';
    })();

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
      <tr class="${isFix ? 'item-fix' : ''}">
        <td class="col-num">${entry.id}</td>
        <td>
          ${escHtml(entry.label)}
          ${entry.description ? `<div class="item-comment">${escHtml(entry.description)}</div>` : ''}
          ${commentHtml}${photosHtml}
        </td>
        <td class="col-result">${pillHtml}</td>
      </tr>`;
  }).join('');

  const sectionIIIHtml = `
    <div class="section-title">III — ვიზუალური შემოწმება</div>
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">№</th>
          <th>პუნქტი</th>
          <th class="col-result">შედეგი</th>
        </tr>
      </thead>
      <tbody>${visualRows}</tbody>
    </table>
  `;

  // ── Section IV — დატვირთვის ტესტი ──────────────────────────────────────────

  const loadRows = insp.loadTestRows.map((row, i) => `
    <tr>
      <td class="col-num">${i + 1}</td>
      <td>${escHtml(row.name) || '—'}</td>
      <td style="text-align:right">${row.unitWeightKg ?? '—'}</td>
      <td style="text-align:right">${row.quantity ?? '—'}</td>
      <td style="text-align:right">${row.totalWeightKg ?? '—'}</td>
      <td>${escHtml(row.comment) || ''}</td>
    </tr>
  `).join('');

  const totalKg = snTotalWeight(insp.loadTestRows);

  const sectionIVHtml = `
    <div class="section-title">IV — დატვირთვის ტესტი</div>
    <div class="load-instruction">
      180კგ-ის სიმძიმე 1მ სიმაღლიდან — №477 დადგენილება
    </div>
    <table class="load-table">
      <thead>
        <tr>
          <th class="col-num">№</th>
          <th>დასახელება</th>
          <th style="text-align:right;width:80px">ერთ.წ.(კგ)</th>
          <th style="text-align:right;width:60px">რ-ბა</th>
          <th style="text-align:right;width:80px">სულ(კგ)</th>
          <th>კომ.</th>
        </tr>
      </thead>
      <tbody>${loadRows}</tbody>
      <tfoot>
        <tr class="load-total">
          <td colspan="4" style="text-align:right">სულ:</td>
          <td style="text-align:right">${totalKg} კგ</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  `;

  // ── Section V — ტვირთის ჩაგდების შემდეგ შემოწმება ─────────────────────────

  const postRows = SN_POST_TEST_ITEMS.map(entry => {
    const state = insp.postTestItems.find(i => i.id === entry.id);
    const result = state?.result ?? null;
    const isFail = result === 'fail';

    const pillHtml = (() => {
      if (result === 'pass') return '<span class="pill pill-pass">გამოც. ✓</span>';
      if (result === 'fail') return '<span class="pill pill-fail">პრობლ. ✗</span>';
      return '<span class="pill pill-null">—</span>';
    })();

    return `
      <tr class="${isFail ? 'item-fail' : ''}">
        <td class="col-num">${entry.id}</td>
        <td>${escHtml(entry.label)}</td>
        <td class="col-result">${pillHtml}</td>
      </tr>`;
  }).join('');

  const sectionVHtml = `
    <div class="section-title">V — ტვირთის ჩაგდების შემდეგ შემოწმება</div>
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">№</th>
          <th>პუნქტი</th>
          <th class="col-result">შედეგი</th>
        </tr>
      </thead>
      <tbody>${postRows}</tbody>
    </table>
  `;

  // ── Section VI — დასკვნა ───────────────────────────────────────────────────

  const verdictOptions = (['pass', 'fail'] as const).map(v => {
    const selected = insp.verdict === v;
    const isFail = v === 'fail';
    const selClass = selected ? (isFail ? 'selected-fail' : 'selected') : '';
    const boxClass = selected ? (isFail ? 'checked-fail' : 'checked') : '';
    return `
      <div class="verdict-option ${selClass}">
        <div class="verdict-box ${boxClass}"></div>
        <span class="verdict-label">${escHtml(SN_VERDICT_LABEL[v])}</span>
      </div>`;
  }).join('');

  const sectionVIHtml = `
    <div class="section-title">VI — დასკვნა</div>
    <div class="verdict-block">${verdictOptions}</div>
    <div class="comment-block">
      <div class="comment-label">კომენტარი</div>
      ${escHtml(insp.verdictComment) || ''}
    </div>
  `;

  // ── Section VII — ხელმოწერები ───────────────────────────────────────────────

  const sigBlocks = insp.signatures.map((sig, i) => {
    const role = i === 0 ? 'I ხელმომწერი' : 'II ხელმომწერი';
    const imgHtml = sig.signature
      ? `<img class="sig-img" src="data:image/png;base64,${sig.signature}" />`
      : `<div class="sig-line"></div>`;
    return `
      <div class="sig-block">
        <div class="sig-cell">
          <div class="sig-lbl">${escHtml(role)}</div>
          <div class="sig-name">${escHtml(sig.name) || '—'}</div>
          <div class="sig-role">${escHtml(sig.position) || ''}</div>
          <div class="sig-org">${escHtml(sig.organization) || ''}</div>
        </div>
        <div class="sig-cell">
          <div class="sig-lbl">ხელმოწერა</div>
          ${imgHtml}
        </div>
        <div class="sig-cell">
          <div class="sig-lbl">თარიღი</div>
          <div class="sig-date">${fmtDate(sig.date)}</div>
        </div>
      </div>`;
  }).join('');

  const sectionVIIHtml = `
    <div class="section-title">VII — ხელმოწერები</div>
    <div class="sig-two-col">${sigBlocks}</div>
    <div class="legal-note">
      ეს დოკუმენტი შედგენილია №477 დადგენილების მოთხოვნების შესაბამისად.
      This document is prepared in accordance with Decree No. 477 requirements.
    </div>
  `;

  // ── Section VIII — კვალიფიკაციის დოკუმენტი ────────────────────────────────

  let sectionVIIIHtml = '';
  if (insp.qualDocPath) {
    const embed = photoEmbeds[insp.qualDocPath];
    if (embed) {
      sectionVIIIHtml = `
        <div class="section-title">VIII — კვალიფიკაციის / სერტიფიკატის ფოტო</div>
        <img class="qual-doc-img" src="${embed}" />
      `;
    }
  }

  // ── Section IX — ფოტო / ვიდეო მასალა ─────────────────────────────────────

  let sectionIXHtml = '';
  if (insp.summaryPhotos.length > 0) {
    const photoItems = insp.summaryPhotos.map((p, i) => {
      const embed = photoEmbeds[p];
      if (!embed) return '';
      return `
        <div class="photo-item">
          <img src="${embed}" />
          <div class="photo-caption">ფოტო ${i + 1}</div>
        </div>`;
    }).filter(Boolean).join('');

    if (photoItems) {
      sectionIXHtml = `
        <div class="section-title">IX — ფოტო / ვიდეო მასალა</div>
        <div class="photo-grid">${photoItems}</div>
      `;
    }
  }

  // ── Footer ─────────────────────────────────────────────────────────────────

  const footerHtml = `
    <div class="footer">
      <span>Sarke — შრომის უსაფრთხოება</span>
      <span>ID: ${escHtml(docId)}</span>
      <span>${escHtml(docDate)}</span>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>უსაფრთხოების ბადის შემოწმების აქტი</title>
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
    ${sectionVIIHtml}
    ${sectionVIIIHtml}
    ${sectionIXHtml}
    ${footerHtml}
  </div>
</body>
</html>`;
}
