/**
 * PDF HTML generator for bobcat-family inspection acts.
 * Handles both "ციცხვიანი დამტვირთველი" (bobcat) and
 * "დიდი ციცხვიანი დამტვირთველი" (large loader) — caller passes
 * the correct catalog so all item counts, categories, and labels
 * are template-specific.
 *
 * Uses `pdfPhotoEmbed` for item photos (cached, resized JPEG data URLs).
 * Call `generateAndSharePdf` from `lib/pdfOpen.ts` with the returned HTML.
 */

import { embedInspectionPhotos, escHtml, fmtDate } from './pdfShared';
import {
  BOBCAT_ITEMS,
  BOBCAT_CATEGORY_LABELS,
  LARGE_LOADER_TEMPLATE_ID,
  INSPECTION_TYPE_LABEL,
  VERDICT_LABEL,
  categoryCounts,
  type BobcatInspection,
  type BobcatCategory,
  type BobcatChecklistEntry,
} from '../types/bobcat';

const CATEGORIES: BobcatCategory[] = ['A', 'B', 'C', 'D'];

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
  .info-table td {
    padding: 6px 8px; font-size: 11px;
    border: 0.5px solid var(--hairline);
    vertical-align: top;
    width: 50%;
  }
  .info-table .lbl { color: var(--inkSoft); font-weight: 600; display: block; font-size: 10px; margin-bottom: 2px; }
  .info-table .val { color: var(--ink); font-weight: 400; }

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
  .cl-table th, .cl-table td {
    border: 0.5px solid var(--hairline);
    padding: 5px 7px; font-size: 11px;
    vertical-align: top;
  }
  .cl-table thead tr { background: var(--catHdr); }
  .cl-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .cl-cat-row td {
    background: var(--catHdr); font-weight: 700;
    font-size: 11px; color: var(--inkSoft); padding: 6px 8px;
  }
  .col-num { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-cat { width: 72px; font-weight: 700; }
  .col-result { width: 108px; white-space: nowrap; }
  .item-comment { font-size: 10px; color: var(--inkSoft); font-style: italic; margin-top: 4px; }
  .item-photo { display: inline-block; margin: 4px 4px 0 0; }
  .item-photo img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); }

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

  /* Verdict */
  .verdict-block { margin-top: 14px; }
  .verdict-option {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 8px 10px; border: 1px solid var(--hairline);
    border-radius: 8px; margin-bottom: 6px; font-size: 11px;
  }
  .verdict-option.selected { border-color: var(--accent); background: #F0FDF9; }
  .verdict-box {
    width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid var(--hairline);
    flex-shrink: 0; margin-top: 1px;
    display: flex; align-items: center; justify-content: center;
  }
  .verdict-box.checked { background: var(--accent); border-color: var(--accent); }
  .verdict-box.checked::after { content: '✓'; color: #fff; font-size: 9px; }
  .verdict-label { line-height: 1.4; }

  /* Notes */
  .notes-block {
    margin-top: 12px; padding: 10px 12px;
    border: 0.5px solid var(--hairline); border-radius: 8px;
    min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.5;
  }
  .notes-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }

  /* Signature */
  .sig-block {
    display: grid; grid-template-columns: 2fr 1fr 1fr;
    gap: 0; margin-top: 8px;
    border: 0.5px solid var(--hairline); border-radius: 8px; overflow: hidden;
  }
  .sig-cell { padding: 10px 12px; border-right: 0.5px solid var(--hairline); }
  .sig-cell:last-child { border-right: none; }
  .sig-lbl { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
  .sig-name { font-size: 12px; font-weight: 700; color: var(--ink); }
  .sig-role { font-size: 10px; color: var(--inkSoft); margin-top: 2px; }
  .sig-img { max-height: 48px; max-width: 100%; }
  .sig-date { font-size: 11px; color: var(--ink); margin-top: 4px; }

  /* Footer */
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

export async function buildBobcatPdfHtml(args: {
  inspection: BobcatInspection;
  projectName: string;
  /** Pass LARGE_LOADER_ITEMS for large-loader inspections, omit for bobcat. */
  catalog?: BobcatChecklistEntry[];
}): Promise<string> {
  const { inspection: insp, projectName } = args;
  const catalog = args.catalog ?? BOBCAT_ITEMS;

  const isLargeLoader = insp.templateId === LARGE_LOADER_TEMPLATE_ID;
  const docTitleLine1 = isLargeLoader
    ? 'დიდი ციცხვიანი დამტვირთველის'
    : 'ციცხვიანი დამტვირთველის';
  const docSub = isLargeLoader
    ? 'Large Loader Inspection'
    : 'Bobcat / Skid-Steer Loader Inspection';
  const footerLabel = isLargeLoader
    ? 'დიდი ციცხვიანი დამტვირთველის შემოწმების აქტი'
    : 'ციცხვიანი დამტვირთველის შემოწმების აქტი';

  const photoEmbeds = await embedInspectionPhotos(
    insp.items.flatMap(i => i.photo_paths ?? []),
  );
  const summaryPhotoEmbeds = await embedInspectionPhotos(insp.summaryPhotos ?? []);

  // Signature embed
  let sigDataUrl: string | null = null;
  if (insp.inspectorSignature) {
    sigDataUrl = `data:image/png;base64,${insp.inspectorSignature}`;
  }

  const docId = insp.id.slice(-8).toUpperCase();
  const docDate = fmtDate(insp.completedAt ?? insp.createdAt);

  // ── Render parts ─────────────────────────────────────────────────────────────

  const headerHtml = `
    <div class="header">
      <div class="header-left">
        <div class="logo-box"><span class="logo-text">SR</span></div>
        <div class="project-name">${escHtml(projectName)}</div>
      </div>
      <div class="header-center">
        <div class="doc-title">${docTitleLine1}<br>შემოწმების აქტი</div>
        <div class="doc-sub">${docSub}</div>
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

  const inspTypeCk = (key: string) =>
    insp.inspectionType === key ? '<span style="color:var(--accent);font-weight:700;">☑</span>' : '☐';

  const sectionIHtml = `
    <div class="section-title">I — ზოგადი ინფორმაცია</div>
    <table class="info-table">
      <tr>
        <td>
          <span class="lbl">ობიექტი / კომპანია</span>
          <span class="val">${escHtml(insp.company) || '—'}</span>
        </td>
        <td>
          <span class="lbl">დამტვირთველის მარკა / მოდელი</span>
          <span class="val">${escHtml(insp.equipmentModel) || '—'}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="lbl">მისამართი</span>
          <span class="val">${escHtml(insp.address) || '—'}</span>
        </td>
        <td>
          <span class="lbl">სახელმწიფო / ს.ნ ნომერი</span>
          <span class="val">${escHtml(insp.registrationNumber) || '—'}</span>
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
          <span class="val">${escHtml(insp.inspectorName) || '—'}</span>
        </td>
        <td></td>
      </tr>
    </table>
  `;

  // ── Checklist rows ─────────────────────────────────────────────────────────

  function resultPill(result: string | null, entry?: BobcatChecklistEntry): string {
    if (result === 'good')      return '<span class="pill pill-good">✓ კარგია</span>';
    if (result === 'deficient') return '<span class="pill pill-def">⚠ ნაკლი</span>';
    if (result === 'unusable') {
      if (entry?.unusableIsNeutral) {
        const label = entry.unusableLabel ?? 'არ გააჩნია';
        return `<span class="pill pill-neutral">— ${escHtml(label)}</span>`;
      }
      return '<span class="pill pill-bad">✗ გამოუსადეგ.</span>';
    }
    return '<span class="pill pill-null">—</span>';
  }

  let checklistRows = '';
  let currentCat = '';

  for (const entry of catalog) {
    if (entry.category !== currentCat) {
      currentCat = entry.category;
      checklistRows += `
        <tr class="cl-cat-row">
          <td colspan="4">${escHtml(BOBCAT_CATEGORY_LABELS[entry.category])}</td>
        </tr>
      `;
    }

    const state = insp.items.find(i => i.id === entry.id);
    const result = state?.result ?? null;
    const comment = state?.comment ?? null;
    const photos = state?.photo_paths ?? [];

    let photoHtml = '';
    for (const p of photos) {
      const src = photoEmbeds[p];
      if (src) {
        photoHtml += `<span class="item-photo"><img src="${src}" alt="ფოტო" /></span>`;
      }
    }

    checklistRows += `
      <tr>
        <td class="col-num">${entry.id}</td>
        <td class="col-cat">${escHtml(entry.label)}</td>
        <td>
          ${escHtml(entry.description)}
          ${comment ? `<div class="item-comment">${escHtml(comment)}</div>` : ''}
          ${photoHtml ? `<div style="margin-top:4px;">${photoHtml}</div>` : ''}
        </td>
        <td class="col-result">${resultPill(result, entry)}</td>
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

  // ── Summary ──────────────────────────────────────────────────────────────────

  const sumRows = CATEGORIES.map(cat => {
    const c = categoryCounts(insp.items, cat, catalog);
    return `
      <tr>
        <td>${escHtml(BOBCAT_CATEGORY_LABELS[cat])}</td>
        <td class="sum-count cnt-good">${c.good}</td>
        <td class="sum-count cnt-def">${c.deficient}</td>
        <td class="sum-count cnt-bad">${c.unusable}</td>
      </tr>
    `;
  }).join('');

  const vx = (v: string) => insp.verdict === v ? 'selected' : '';
  const vchecked = (v: string) => insp.verdict === v ? 'checked' : '';

  const sectionIVHtml = `
    <div class="section-title">IV — შეჯამება</div>
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
        <span class="verdict-label">${escHtml(VERDICT_LABEL.approved)}</span>
      </div>
      <div class="verdict-option ${vx('limited')}">
        <div class="verdict-box ${vchecked('limited')}"></div>
        <span class="verdict-label">${escHtml(VERDICT_LABEL.limited)}</span>
      </div>
      <div class="verdict-option ${vx('rejected')}">
        <div class="verdict-box ${vchecked('rejected')}"></div>
        <span class="verdict-label">${escHtml(VERDICT_LABEL.rejected)}</span>
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
          return src ? `<img src="${src}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:0.5px solid var(--hairline);" alt="ფოტო" />` : '';
        }).join('')}
      </div>
    ` : ''}
  `;

  // ── Signature ────────────────────────────────────────────────────────────────

  const sigDate = insp.completedAt ? fmtDate(insp.completedAt) : fmtDate(insp.inspectionDate);

  const sectionVHtml = `
    <div class="section-title">V — პასუხისმგებელი პირი</div>
    <div class="sig-block">
      <div class="sig-cell">
        <div class="sig-lbl">ინსპექტორი / ტექნიკოსი / ოპერატორი</div>
        <div class="sig-name">${escHtml(insp.inspectorName) || '—'}</div>
        <div class="sig-role">სახელი / გვარი</div>
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
      <span>Sarke 2.0 — ${footerLabel}</span>
      <span>${escHtml(docDate)} · ID ${escHtml(docId)}</span>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${footerLabel}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="page">
    ${headerHtml}
    ${sectionIHtml}
    ${sectionIIIHtml}
    ${sectionIVHtml}
    ${sectionVHtml}
    ${footerHtml}
  </div>
</body>
</html>`;
}
