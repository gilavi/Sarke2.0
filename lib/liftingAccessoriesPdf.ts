/**
 * PDF HTML generator for ტვირთის გადასატანი თასმების / ჩამჭიდების შემოწმების აქტი.
 *
 * Layout:
 *   Bilingual header + EN standards badge →
 *   Section I   (general info 2-col grid) →
 *   Section II  (equipment identification — chips + params) →
 *   Section III (visual checklist A, 5 items) →
 *   Section IV  (functional checklist B, 5 items) →
 *   Section V   (removed from service table) →
 *   Section VI  (verdict block + comment) →
 *   Section VII (summary photos) →
 *   Section VIII (two-col signatures) →
 *   Footer note (EN standards + 5-year retention)
 */

import { embedInspectionPhotos, escHtml, fmtDate } from './pdfShared';
import {
  LA_CHECKLIST_ITEMS,
  LA_RESULT_TO_CHIP,
  LA_VERDICT_LABELS,
  type LiftingAccessoriesInspection,
} from '../types/liftingAccessories';

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

  /* Checklist table */
  .cl-table { width: 100%; border-collapse: collapse; }
  .cl-table th, .cl-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .cl-table thead tr { background: var(--catHdr); }
  .cl-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .col-num { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-result { width: 110px; white-space: nowrap; }
  .item-fail { border-left: 3px solid var(--red) !important; }
  .item-comment { font-size: 10px; color: var(--inkSoft); font-style: italic; margin-top: 4px; }
  .item-photo { display: inline-block; margin: 4px 4px 0 0; }
  .item-photo img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); }

  /* Removed rows table */
  .removed-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .removed-table th, .removed-table td { border: 0.5px solid var(--hairline); padding: 5px 8px; font-size: 11px; }
  .removed-table thead tr { background: var(--catHdr); }
  .removed-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .removed-table .col-num { width: 28px; text-align: center; }

  /* Photo grid */
  .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .photo-grid img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 6px; border: 0.5px solid var(--hairline); }

  /* Verdict block */
  .verdict-block { margin-top: 14px; }
  .verdict-option {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 8px 10px; border: 1px solid var(--hairline);
    border-radius: 8px; margin-bottom: 6px; font-size: 11px;
  }
  .verdict-option.selected-pass   { border-color: var(--accent); background: #F0FDF9; }
  .verdict-option.selected-repair { border-color: var(--amberBdr); background: var(--amberSoft); }
  .verdict-option.selected-fail   { border-color: var(--red); background: var(--redSoft); }
  .verdict-box {
    width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid var(--hairline);
    flex-shrink: 0; margin-top: 1px;
    display: flex; align-items: center; justify-content: center;
  }
  .verdict-box.checked-pass   { background: var(--accent); border-color: var(--accent); }
  .verdict-box.checked-pass::after   { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-repair { background: var(--amber); border-color: var(--amberBdr); }
  .verdict-box.checked-repair::after { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-box.checked-fail   { background: var(--red); border-color: var(--red); }
  .verdict-box.checked-fail::after   { content: '✗'; color: #fff; font-size: 9px; }
  .verdict-label { line-height: 1.4; }
  .comment-block {
    margin-top: 12px; padding: 10px 12px;
    border: 0.5px solid var(--hairline); border-radius: 8px;
    min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.5;
  }
  .comment-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }

  /* Two-column signatures */
  .sig-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
  .sig-block { border: 0.5px solid var(--hairline); border-radius: 8px; overflow: hidden; }
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

function checklistPill(result: string | null): string {
  if (result === 'ok')   return '<span class="pill pill-ok">✓ გამართულია</span>';
  if (result === 'fail') return '<span class="pill pill-fail">✗ გაუმართავია</span>';
  return '<span class="pill pill-null">—</span>';
}

function markingPill(status: string | null): string {
  if (status === 'სრული')        return `<span class="pill pill-marking-full">${escHtml(status)}</span>`;
  if (status === 'ნაწილობრივი')   return `<span class="pill pill-marking-partial">${escHtml(status)}</span>`;
  if (status === 'არ გააჩნია')   return `<span class="pill pill-marking-none">${escHtml(status)}</span>`;
  return '—';
}

// ── HTML builder ──────────────────────────────────────────────────────────────

export async function buildLiftingAccessoriesPdfHtml(args: {
  inspection: LiftingAccessoriesInspection;
  projectName?: string;
}): Promise<string> {
  const { inspection: insp, projectName = 'პროექტი' } = args;

  const allPhotoPaths = [
    ...insp.items.flatMap(i => i.photo_paths ?? []),
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
        <div class="doc-title">ტვირთის გადასატანი თასმების /<br>ჩამჭიდების შემოწმების აქტი</div>
        <div class="doc-sub">Lifting Accessories Inspection Record</div>
        <span class="regulation-badge">EN 1492 · EN 818 · EN 1677 · ISO 4309</span>
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

  // ── Section II — მოწყობილობის იდენტიფიკაცია ────────────────────────────────

  const eqChips = insp.equipmentTypes.length > 0
    ? `<div class="eq-chips">${insp.equipmentTypes.map(t => {
        const display = t === 'სხვა' && insp.equipmentTypeOther
          ? `სხვა: ${escHtml(insp.equipmentTypeOther)}`
          : escHtml(t);
        return `<span class="eq-chip">${display}</span>`;
      }).join('')}</div>`
    : '—';

  const nextDateVal = insp.nextInspectionDate ? fmtDate(insp.nextInspectionDate) : '—';

  const sectionIIHtml = `
    <div class="section-title">II — მოწყობილობის იდენტიფიკაცია</div>
    <table class="param-table">
      <tr><td>ტიპი / სახეობა</td><td>${eqChips}</td></tr>
      <tr><td>სერ. NN / ID</td><td>${escHtml(insp.serialNumber) || '—'}</td></tr>
      <tr><td>მწარმოებელი</td><td>${escHtml(insp.manufacturer) || '—'}</td></tr>
      <tr><td>წ. წარმოება</td><td>${escHtml(insp.yearOfManufacture) || '—'}</td></tr>
      <tr><td>WLL (კგ)</td><td>${escHtml(insp.wllKg) || '—'}</td></tr>
      <tr><td>ერთ. რ-ბა</td><td>${escHtml(insp.unitCount) || '—'}</td></tr>
      <tr><td>მარკირება</td><td>${markingPill(insp.markingStatus)}</td></tr>
      <tr><td>მომდ. შემოწ.</td><td>${nextDateVal}</td></tr>
    </table>
  `;

  // ── Checklist row builder ───────────────────────────────────────────────────

  function buildChecklistRows(sectionKey: 'A' | 'B'): string {
    return LA_CHECKLIST_ITEMS.filter(e => e.section === sectionKey).map(entry => {
      const state = insp.items.find(i => i.id === entry.id);
      const result = state?.result ?? null;
      const chipText = result ? LA_RESULT_TO_CHIP[result] : null;
      const isFail = result === 'fail';

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
        <tr class="${isFail ? 'item-fail' : ''}">
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

  // ── Section III — ვიზუალური შემოწმება (A) ──────────────────────────────────

  const sectionIIIHtml = `
    <div class="section-title">III — ვიზუალური შემოწმება</div>
    <table class="cl-table">
      <thead>
        <tr><th class="col-num">№</th><th>პუნქტი</th><th class="col-result">შედეგი</th></tr>
      </thead>
      <tbody>${buildChecklistRows('A')}</tbody>
    </table>
  `;

  // ── Section IV — ფუნქციური შემოწმება (B) ──────────────────────────────────

  const sectionIVHtml = `
    <div class="section-title">IV — ფუნქციური შემოწმება</div>
    <table class="cl-table">
      <thead>
        <tr><th class="col-num">№</th><th>პუნქტი</th><th class="col-result">შედეგი</th></tr>
      </thead>
      <tbody>${buildChecklistRows('B')}</tbody>
    </table>
  `;

  // ── Section V — ამოღებული მოწყობილობები ────────────────────────────────────

  const removedRowsHtml = insp.removedRows.length > 0
    ? insp.removedRows.map((r, i) => `
        <tr>
          <td class="col-num">${i + 1}</td>
          <td>${escHtml(r.serialNumber) || '—'}</td>
          <td>${escHtml(r.typeDescription) || '—'}</td>
          <td>${escHtml(r.reason) || '—'}</td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="text-align:center;color:var(--inkFaint);padding:10px">ამოღებული მოწყობილობა არ არის</td></tr>`;

  const sectionVHtml = `
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

  // ── Section VI — დასკვნა ────────────────────────────────────────────────────

  const verdictOptions = (['pass', 'repair', 'fail'] as const).map(v => {
    const selected = insp.verdict === v;
    const selClass = selected ? `selected-${v}` : '';
    const boxClass = selected ? `checked-${v}` : '';
    return `
      <div class="verdict-option ${selClass}">
        <div class="verdict-box ${boxClass}"></div>
        <span class="verdict-label">${escHtml(LA_VERDICT_LABELS[v])}</span>
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

  // ── Section VII — ფოტო მასალა ───────────────────────────────────────────────

  let sectionVIIHtml = '';
  const summaryEmbeds = insp.summaryPhotos
    .map(p => photoEmbeds[p])
    .filter(Boolean);
  if (summaryEmbeds.length > 0) {
    const imgs = summaryEmbeds.map(e => `<img src="${e}" />`).join('');
    sectionVIIHtml = `
      <div class="section-title">VII — ფოტო მასალა</div>
      <div class="photo-grid">${imgs}</div>
    `;
  }

  // ── Section VIII — ხელმოწერები ──────────────────────────────────────────────

  function romanLabel(i: number): string {
    const romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
    return romans[i] ?? `${i + 1}`;
  }

  function sigBlock(sig: LiftingAccessoriesInspection['signatures'][number], role: string): string {
    const sigImgHtml = sig?.signature
      ? `<img class="sig-img" src="data:image/png;base64,${sig.signature}" />`
      : `<div class="sig-line"></div>`;
    const qualHtml = sig?.extra?.qualification
      ? `<div class="sig-role">${escHtml(sig.extra.qualification)}</div>`
      : '';
    return `
      <div class="sig-block">
        <div class="sig-cell">
          <div class="sig-lbl">${escHtml(role)}</div>
          <div class="sig-name">${escHtml(sig?.name) || '—'}</div>
          <div class="sig-role">${escHtml(sig?.position) || ''}</div>
          ${sig?.organization ? `<div class="sig-role">${escHtml(sig.organization)}</div>` : ''}
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

  const sigBlocks = insp.signatures.map((sig, i) =>
    sigBlock(sig, `${romanLabel(i)} — ${i === 0 ? 'შემომწმებელი პირი' : 'პასუხისმგებელი პირი'}`)
  ).join('');

  const sectionVIIIHtml = `
    <div class="section-title">VIII — ხელმოწერები</div>
    <div class="sig-two-col">
      ${sigBlocks}
    </div>
  `;

  // ── Footer note ────────────────────────────────────────────────────────────

  const footerNoteHtml = `
    <div class="footer-note">
      შემოწმება ჩატარდა EN 1492-1:2000+A1:2008 (ტექ. სლინგები), EN 818-2:2008 (ჯაჭვური სლინგები),
      EN 1677-1:2008 (ჩამჭიდები/ჰ-ე), ISO 4309:2010 (ბეწვ. სლინგები) სტანდარტების შესაბამისად.
      დოკუმენტი ინახება 5 წლის განმავლობაში.
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
<title>ამწე მოწყ. / სლინგი / ჩამჭ. შემოწმება</title>
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
  ${footerNoteHtml}
  ${pageFooterHtml}
</div>
</body>
</html>`;
}
