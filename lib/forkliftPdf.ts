/**
 * PDF HTML generator for the forklift inspection act.
 * "ჩანგლიანი დამტვირთველის შემოწმების აქტი"
 *
 * Sections:
 *   Header — logo, title, project, date, ID
 *   I      — identification (company, address, serial, brand/model, engine type, date, inspector)
 *   II     — component diagram (static labeled list A-K)
 *   III    — checklist (3 sections, 39 items)
 *   IV     — summary table (13 subcategories) + verdict + notes + photos
 *   V      — extended signature block
 */

import { embedInspectionPhotos, escHtml, fmtDate } from './pdfShared';
import {
  FORKLIFT_ITEMS,
  FORKLIFT_CATEGORY_LABELS,
  FORKLIFT_VERDICT_LABEL,
  FORKLIFT_SUMMARY_CATS,
  FORKLIFT_COMPONENTS,
  ENGINE_TYPE_LABEL,
  forkliftSubcategoryCounts,
  type ForkliftInspection,
  type ForkliftChecklistEntry,
} from '../types/forklift';

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink:       #1A1A1A;
    --inkSoft:   #6B7280;
    --inkFaint:  #9CA3AF;
    --hairline:  #E5E7EB;
    --card:      #FFFFFF;
    --page:      #F9FAFB;
    --accent:    #1D9E75;
    --green:     #10B981;
    --greenSoft: #D1FAE5;
    --amber:     #F59E0B;
    --amberSoft: #FEF3C7;
    --red:       #EF4444;
    --redSoft:   #FEE2E2;
    --catHdr:    #F3F4F6;
  }

  html, body {
    font-family: 'Noto Sans Georgian', 'Arial Unicode MS', Arial, sans-serif;
    font-size: 11px; color: var(--ink); background: var(--page);
    line-height: 1.45;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  .page { max-width: 800px; margin: 0 auto; background: var(--card); padding: 28px 32px 40px; }

  /* Header */
  .header {
    display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px;
    align-items: start; padding-bottom: 16px;
    border-bottom: 2px solid var(--accent); margin-bottom: 20px;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .logo-box {
    width: 44px; height: 44px; border-radius: 10px; background: var(--accent);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .logo-text { color: #fff; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; }
  .project-name { font-size: 12px; font-weight: 600; color: var(--inkSoft); max-width: 160px; }
  .header-center { text-align: center; }
  .doc-title { font-size: 14px; font-weight: 800; color: var(--ink); line-height: 1.3; }
  .doc-sub { font-size: 11px; color: var(--inkSoft); margin-top: 3px; }
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
    margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid var(--hairline);
  }

  /* Info grid */
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .info-table td { padding: 6px 8px; font-size: 11px; border: 0.5px solid var(--hairline); vertical-align: top; width: 50%; }
  .info-table .lbl { color: var(--inkSoft); font-weight: 600; display: block; font-size: 10px; margin-bottom: 2px; }
  .info-table .val { color: var(--ink); font-weight: 400; }

  /* Engine type chips */
  .engine-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 3px; }
  .engine-chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600;
    border: 1px solid var(--hairline); color: var(--inkSoft);
  }
  .engine-chip.active { border-color: var(--accent); background: var(--greenSoft); color: #065F46; }

  /* Component diagram */
  .comp-card {
    background: var(--catHdr); border-radius: 8px; padding: 12px 14px;
    margin-bottom: 8px;
  }
  .comp-title { font-size: 11px; font-weight: 700; color: var(--inkSoft); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  .comp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 8px; }
  .comp-item { display: flex; align-items: baseline; gap: 5px; font-size: 10px; color: var(--ink); }
  .comp-key { font-weight: 800; color: var(--accent); min-width: 14px; }

  /* Legend */
  .legend {
    display: flex; gap: 16px; align-items: center;
    padding: 7px 10px; background: var(--catHdr);
    border-radius: 6px; margin-bottom: 8px; flex-wrap: wrap;
  }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--inkSoft); }
  .dot { width: 8px; height: 8px; border-radius: 4px; }
  .dot-good { background: var(--green); }
  .dot-def  { background: var(--amber); }
  .dot-bad  { background: var(--red); }

  /* Checklist table */
  .cl-table { width: 100%; border-collapse: collapse; }
  .cl-table th, .cl-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .cl-table thead tr { background: var(--catHdr); }
  .cl-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .cl-cat-row td { background: var(--catHdr); font-weight: 700; font-size: 11px; color: var(--inkSoft); padding: 6px 8px; }
  .col-num { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-cat { width: 72px; font-weight: 700; }
  .col-result { width: 108px; white-space: nowrap; }
  .item-comment { font-size: 10px; color: var(--inkSoft); font-style: italic; margin-top: 4px; }
  .item-photo img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); margin: 4px 4px 0 0; display: inline-block; }

  /* Result pills */
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .pill-good { background: var(--greenSoft); color: #065F46; }
  .pill-def  { background: var(--amberSoft); color: #92400E; }
  .pill-bad  { background: var(--redSoft);   color: #991B1B; }
  .pill-null { background: var(--catHdr);    color: var(--inkFaint); }

  /* Summary table */
  .sum-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .sum-table th, .sum-table td { border: 0.5px solid var(--hairline); padding: 5px 8px; font-size: 11px; vertical-align: middle; }
  .sum-table thead tr { background: var(--catHdr); }
  .sum-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .sum-count { text-align: center; font-weight: 700; }
  .cnt-good { color: #065F46; }
  .cnt-def  { color: #92400E; }
  .cnt-bad  { color: #991B1B; }

  /* Verdict */
  .verdict-block { margin-top: 14px; }
  .verdict-option { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; border: 1px solid var(--hairline); border-radius: 8px; margin-bottom: 6px; font-size: 11px; }
  .verdict-option.selected { border-color: var(--accent); background: #F0FDF9; }
  .verdict-box { width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid var(--hairline); flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center; }
  .verdict-box.checked { background: var(--accent); border-color: var(--accent); }
  .verdict-box.checked::after { content: '✓'; color: #fff; font-size: 9px; }

  /* Notes */
  .notes-block { margin-top: 12px; padding: 10px 12px; border: 0.5px solid var(--hairline); border-radius: 8px; min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.5; }
  .notes-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }

  /* Signature */
  .sig-block { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0; margin-top: 8px; border: 0.5px solid var(--hairline); border-radius: 8px; overflow: hidden; }
  .sig-cell { padding: 10px 12px; border-right: 0.5px solid var(--hairline); }
  .sig-cell:last-child { border-right: none; }
  .sig-lbl { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
  .sig-name { font-size: 12px; font-weight: 700; color: var(--ink); }
  .sig-role { font-size: 10px; color: var(--inkSoft); margin-top: 2px; }
  .sig-img { max-height: 48px; max-width: 100%; }
  .sig-date { font-size: 11px; color: var(--ink); margin-top: 4px; }

  /* Footer */
  .footer { margin-top: 32px; padding-top: 10px; border-top: 1px solid var(--hairline); display: flex; justify-content: space-between; font-size: 10px; color: var(--inkFaint); }

  @media print {
    html, body { background: #fff; }
    .page { padding: 0; max-width: none; }
    @page { margin: 18mm 14mm; }
  }
`;

// ── HTML builder ──────────────────────────────────────────────────────────────

export async function buildForkliftPdfHtml(args: {
  inspection: ForkliftInspection;
  projectName: string;
}): Promise<string> {
  const { inspection: insp, projectName } = args;

  const photoEmbeds = await embedInspectionPhotos(
    insp.items.flatMap(i => i.photo_paths ?? []),
  );
  const summaryPhotoEmbeds = await embedInspectionPhotos(insp.summaryPhotos ?? []);

  const sigDataUrl = insp.signerSignature
    ? `data:image/png;base64,${insp.signerSignature}`
    : null;

  const docId   = insp.id.slice(-8).toUpperCase();
  const docDate = fmtDate(insp.completedAt ?? insp.createdAt);

  // ── Header ──────────────────────────────────────────────────────────────────

  const headerHtml = `
    <div class="header">
      <div class="header-left">
        <div class="logo-box"><span class="logo-text">SR</span></div>
        <div class="project-name">${escHtml(projectName)}</div>
      </div>
      <div class="header-center">
        <div class="doc-title">ჩანგლიანი დამტვირთველის<br>შემოწმების აქტი</div>
        <div class="doc-sub">Forklift Technical Inspection Act</div>
      </div>
      <div class="header-right">
        <span class="internal-badge">შიდა სამსახურებრივი დოკუმენტი</span>
        <div class="doc-meta">${escHtml(docDate)}<br>ID: ${escHtml(docId)}</div>
      </div>
    </div>
  `;

  // ── Section I — Identification ───────────────────────────────────────────────

  const engineChipsHtml = (['electric', 'gasoline', 'diesel', 'gas'] as const)
    .map(t => {
      const active = insp.engineType === t;
      return `<span class="engine-chip${active ? ' active' : ''}">${active ? '☑' : '☐'} ${escHtml(ENGINE_TYPE_LABEL[t])}</span>`;
    })
    .join('');

  const sectionIHtml = `
    <div class="section-title">I — საიდენტიფიკაციო მონაცემები</div>
    <table class="info-table">
      <tr>
        <td>
          <span class="lbl">ობიექტი / კომპანია</span>
          <span class="val">${escHtml(insp.company) || '—'}</span>
        </td>
        <td>
          <span class="lbl">მარკა / მოდელი</span>
          <span class="val">${escHtml(insp.brandModel) || '—'}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="lbl">მისამართი</span>
          <span class="val">${escHtml(insp.address) || '—'}</span>
        </td>
        <td>
          <span class="lbl">ინვენტ. / სერიული ნომერი</span>
          <span class="val">${escHtml(insp.inventoryNumber) || '—'}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="lbl">შემოწმების თარიღი</span>
          <span class="val">${fmtDate(insp.inspectionDate)}</span>
        </td>
        <td>
          <span class="lbl">ძრავის ტიპი</span>
          <div class="engine-chips">${engineChipsHtml}</div>
        </td>
      </tr>
      <tr>
        <td>
          <span class="lbl">ინსპექტორი</span>
          <span class="val">${escHtml(insp.inspectorName) || '—'}</span>
        </td>
        <td></td>
      </tr>
    </table>
  `;

  // ── Section II — Component Diagram ───────────────────────────────────────────

  const compItems = FORKLIFT_COMPONENTS
    .map(c => `<div class="comp-item"><span class="comp-key">${escHtml(c.key)}</span>${escHtml(c.label)}</div>`)
    .join('');

  const sectionIIHtml = `
    <div class="section-title">II — კომპონენტების სქემა</div>
    <div class="comp-card">
      <div class="comp-title">ძირითადი კომპონენტები (A–K)</div>
      <div class="comp-grid">${compItems}</div>
    </div>
  `;

  // ── Section III — Checklist ──────────────────────────────────────────────────

  function resultPill(result: string | null): string {
    if (result === 'good')      return '<span class="pill pill-good">✓ კარგია</span>';
    if (result === 'deficient') return '<span class="pill pill-def">⚠ ნაკლი</span>';
    if (result === 'unusable')  return '<span class="pill pill-bad">✗ გამოუსადეგ.</span>';
    return '<span class="pill pill-null">—</span>';
  }

  let checklistRows = '';
  let currentCat = '';

  for (const entry of FORKLIFT_ITEMS) {
    if (entry.category !== currentCat) {
      currentCat = entry.category;
      checklistRows += `
        <tr class="cl-cat-row">
          <td colspan="4">${escHtml(FORKLIFT_CATEGORY_LABELS[entry.category])}</td>
        </tr>
      `;
    }

    const state = insp.items.find(i => i.id === entry.id);
    const result  = state?.result ?? null;
    const comment = state?.comment ?? null;
    const photos  = state?.photo_paths ?? [];

    const photoHtml = photos
      .map(p => {
        const src = photoEmbeds[p];
        return src ? `<img src="${src}" alt="ფოტო" />` : '';
      })
      .join('');

    checklistRows += `
      <tr>
        <td class="col-num">${entry.id}</td>
        <td class="col-cat">${escHtml(entry.label)}</td>
        <td>
          ${escHtml(entry.description)}
          ${comment ? `<div class="item-comment">${escHtml(comment)}</div>` : ''}
          ${photoHtml ? `<div class="item-photo" style="margin-top:4px;">${photoHtml}</div>` : ''}
        </td>
        <td class="col-result">${resultPill(result)}</td>
      </tr>
    `;
  }

  const sectionIIIHtml = `
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
      <tbody>${checklistRows}</tbody>
    </table>
  `;

  // ── Section IV — Summary + Verdict ───────────────────────────────────────────

  const sumRows = FORKLIFT_SUMMARY_CATS.map(cat => {
    const c = forkliftSubcategoryCounts(insp.items, cat.ids);
    return `
      <tr>
        <td>${escHtml(cat.label)}</td>
        <td class="sum-count cnt-good">${c.good}</td>
        <td class="sum-count cnt-def">${c.deficient}</td>
        <td class="sum-count cnt-bad">${c.unusable}</td>
      </tr>
    `;
  }).join('');

  const vx       = (v: string) => insp.verdict === v ? 'selected' : '';
  const vchecked = (v: string) => insp.verdict === v ? 'checked' : '';

  const sectionIVHtml = `
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
      <div class="verdict-option ${vx('approved')}">
        <div class="verdict-box ${vchecked('approved')}"></div>
        <span>${escHtml(FORKLIFT_VERDICT_LABEL.approved)}</span>
      </div>
      <div class="verdict-option ${vx('limited')}">
        <div class="verdict-box ${vchecked('limited')}"></div>
        <span>${escHtml(FORKLIFT_VERDICT_LABEL.limited)}</span>
      </div>
      <div class="verdict-option ${vx('rejected')}">
        <div class="verdict-box ${vchecked('rejected')}"></div>
        <span>${escHtml(FORKLIFT_VERDICT_LABEL.rejected)}</span>
      </div>
    </div>

    ${insp.notes ? `
      <div class="notes-label" style="margin-top:14px;">შენიშვნები / ხარვეზები</div>
      <div class="notes-block">${escHtml(insp.notes)}</div>
    ` : ''}

    ${(insp.summaryPhotos ?? []).length > 0 ? `
      <div class="notes-label" style="margin-top:14px;">ფოტოები</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
        ${(insp.summaryPhotos ?? []).map(p => {
          const src = summaryPhotoEmbeds[p];
          return src
            ? `<img src="${src}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:0.5px solid var(--hairline);" alt="ფოტო" />`
            : '';
        }).join('')}
      </div>
    ` : ''}
  `;

  // ── Section V — Signature ────────────────────────────────────────────────────

  const sigDate = insp.completedAt ? fmtDate(insp.completedAt) : fmtDate(insp.inspectionDate);

  const sectionVHtml = `
    <div class="section-title">V — პასუხისმგებელი პირი</div>
    <div class="sig-block">
      <div class="sig-cell">
        <div class="sig-lbl">უსაფრთ.სპეც. / ტექნიკოსი / ოპერატორი</div>
        <div class="sig-name">${escHtml(insp.signerName || insp.inspectorName) || '—'}</div>
        <div class="sig-role">${escHtml(insp.signerPosition) || 'თანამდებობა'}</div>
        ${insp.signerPhone ? `<div class="sig-role" style="margin-top:2px;">${escHtml(insp.signerPhone)}</div>` : ''}
      </div>
      <div class="sig-cell">
        <div class="sig-lbl">ხელმოწერა</div>
        ${sigDataUrl
          ? `<img class="sig-img" src="${sigDataUrl}" alt="ხელმოწერა" />`
          : '<div style="height:48px;border-bottom:1px dashed var(--hairline);"></div>'
        }
      </div>
      <div class="sig-cell">
        <div class="sig-lbl">თარიღი</div>
        <div class="sig-date">${escHtml(sigDate)}</div>
      </div>
    </div>
  `;

  const footerHtml = `
    <div class="footer">
      <span>Sarke 2.0 — ჩანგლიანი დამტვირთველის შემოწმების აქტი</span>
      <span>${escHtml(docDate)} · ID ${escHtml(docId)}</span>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ჩანგლიანი დამტვირთველის შემოწმების აქტი</title>
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
    ${footerHtml}
  </div>
</body>
</html>`;
}
