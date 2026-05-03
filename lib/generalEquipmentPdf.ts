/**
 * PDF HTML generator for ტექნიკური აღჭურვილობის შემოწმების აქტი.
 *
 * Layout:
 *   Bilingual header → Section I (general info 2-col grid) →
 *   Legend → Section II equipment table (problem rows amber/red left border) →
 *   Section III conclusion + photos → Section IV signature block
 *
 * Uses `pdfPhotoEmbed` for item and summary photos.
 * Call `generateAndSharePdf` from `lib/pdfOpen.ts` with the returned HTML.
 */

import { embedInspectionPhotos, escHtml, fmtDate } from './pdfShared';
import {
  INSPECTION_TYPE_LABEL,
  SIGNER_ROLE_LABEL_FULL,
  resolveSignerPosition,
  type GeneralEquipmentInspection,
  type EquipmentItem,
  type GECondition,
} from '../types/generalEquipment';

function conditionClass(c: GECondition): string {
  if (c === 'good')         return 'ck-good';
  if (c === 'needs_service') return 'ck-warn';
  if (c === 'unusable')     return 'ck-bad';
  return 'ck-none';
}

function conditionSymbol(c: GECondition): string {
  if (c === 'good')         return '✓';
  if (c === 'needs_service') return '⚠';
  if (c === 'unusable')     return '✗';
  return '—';
}

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
    --red:        #DC2626;
    --redSoft:    #FEE2E2;
    --redBdr:     #B91C1C;
    --catHdr:     #F3F4F6;
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
  .header-left  { display: flex; align-items: center; gap: 10px; }
  .logo-box {
    width: 44px; height: 44px; border-radius: 10px;
    background: var(--accent); display: flex; align-items: center;
    justify-content: center; flex-shrink: 0;
  }
  .logo-text     { color: #fff; font-weight: 800; font-size: 15px; letter-spacing: 0.5px; }
  .project-name  { font-size: 12px; font-weight: 600; color: var(--inkSoft); max-width: 160px; }
  .header-center { text-align: center; }
  .doc-title     { font-size: 14px; font-weight: 800; color: var(--ink); line-height: 1.3; }
  .doc-sub       { font-size: 11px; color: var(--inkSoft); margin-top: 3px; }
  .header-right  { text-align: right; }
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

  /* 2-column info grid */
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
  .dot-warn { background: var(--amber); }
  .dot-bad  { background: var(--red); }

  /* Equipment table */
  .eq-table { width: 100%; border-collapse: collapse; }
  .eq-table th, .eq-table td {
    border: 0.5px solid var(--hairline);
    padding: 5px 7px; font-size: 11px;
    vertical-align: top;
  }
  .eq-table thead tr { background: var(--catHdr); }
  .eq-table th {
    font-weight: 700; color: var(--inkSoft); font-size: 10px;
    text-transform: uppercase; letter-spacing: 0.4px; text-align: center;
  }
  .col-num   { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-check { width: 56px; text-align: center; }
  .col-note  { min-width: 100px; }

  /* Problem row left border highlight */
  .row-warn td:first-child { border-left: 3px solid var(--amberBdr); }
  .row-bad  td:first-child { border-left: 3px solid var(--redBdr); }
  .row-warn { background: #FFFBEB; }
  .row-bad  { background: #FFF5F5; }

  /* Condition symbols */
  .ck-good { color: #059669; font-size: 14px; font-weight: 800; }
  .ck-warn { color: #D97706; font-size: 13px; font-weight: 800; }
  .ck-bad  { color: var(--red); font-size: 14px; font-weight: 800; }
  .ck-none { color: var(--inkFaint); }

  .item-note  { font-size: 10px; color: var(--inkSoft); font-style: italic; margin-top: 3px; }
  .item-photo { display: inline-block; margin: 4px 4px 0 0; }
  .item-photo img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); }

  /* Conclusion block */
  .conclusion-block {
    padding: 10px 12px; border: 0.5px solid var(--hairline);
    border-radius: 8px; min-height: 48px;
    font-size: 11px; color: var(--ink); line-height: 1.6;
    white-space: pre-wrap; margin-bottom: 10px;
  }
  .summary-photos { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .summary-photos img { width: 90px; height: 90px; object-fit: cover; border-radius: 6px; border: 0.5px solid var(--hairline); }

  /* Signature block */
  .sig-block {
    display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1fr;
    gap: 0; margin-top: 8px;
    border: 0.5px solid var(--hairline); border-radius: 8px; overflow: hidden;
  }
  .sig-cell { padding: 10px 12px; border-right: 0.5px solid var(--hairline); }
  .sig-cell:last-child { border-right: none; }
  .sig-lbl  { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
  .sig-name { font-size: 12px; font-weight: 700; color: var(--ink); }
  .sig-role { font-size: 10px; color: var(--inkSoft); margin-top: 2px; }
  .sig-img  { max-height: 48px; max-width: 100%; }
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

export async function buildGeneralEquipmentPdfHtml(args: {
  inspection: GeneralEquipmentInspection;
  projectName: string;
}): Promise<string> {
  const { inspection: insp, projectName } = args;

  const photoEmbeds = await embedInspectionPhotos([
    ...insp.equipment.flatMap(r => r.photo_paths),
    ...insp.summaryPhotos,
  ]);

  let sigDataUrl: string | null = null;
  if (insp.inspectorSignature) {
    sigDataUrl = `data:image/png;base64,${insp.inspectorSignature}`;
  }

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
        <div class="doc-title">ტექნიკური აღჭურვილობის<br>შემოწმების აქტი</div>
        <div class="doc-sub">Technical Equipment Inspection Report</div>
      </div>
      <div class="header-right">
        <div class="internal-badge">INTERNAL</div>
        <div class="doc-meta">
          №&nbsp;${escHtml(insp.actNumber)}<br>
          ID:&nbsp;${docId}<br>
          ${docDate}
        </div>
      </div>
    </div>
  `;

  // ── Section I — general info ─────────────────────────────────────────────────

  const inspTypeLabel = insp.inspectionType
    ? INSPECTION_TYPE_LABEL[insp.inspectionType]
    : '—';

  const infoHtml = `
    <div class="section-title">I — ზოგადი ინფორმაცია / General Information</div>
    <table class="info-table">
      <tr>
        <td><span class="lbl">ობიექტის დასახელება / Object</span><span class="val">${escHtml(insp.objectName) || '—'}</span></td>
        <td><span class="lbl">მისამართი / Address</span><span class="val">${escHtml(insp.address) || '—'}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">საქმიანობის სახე / Activity Type</span><span class="val">${escHtml(insp.activityType) || '—'}</span></td>
        <td><span class="lbl">შემოწმების სახე / Inspection Type</span><span class="val">${escHtml(inspTypeLabel)}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">შემოწმების თარიღი / Inspection Date</span><span class="val">${fmtDate(insp.inspectionDate)}</span></td>
        <td><span class="lbl">შემომწმებელი / Inspector</span><span class="val">${escHtml(insp.inspectorName) || '—'}</span></td>
      </tr>
    </table>
  `;

  // ── Legend ───────────────────────────────────────────────────────────────────

  const legendHtml = `
    <div class="legend">
      <div class="legend-item"><div class="dot dot-good"></div>✓ კარგი / Good</div>
      <div class="legend-item"><div class="dot dot-warn"></div>⚠ საჭ. მომსახ. / Needs Service</div>
      <div class="legend-item"><div class="dot dot-bad"></div>✗ გამოუსადეგარი / Unusable</div>
    </div>
  `;

  // ── Section II — equipment table ─────────────────────────────────────────────

  const filledRows = insp.equipment.filter(r => r.name.trim());

  const equipmentRows = filledRows.map((row, idx) => {
    const rowClass =
      row.condition === 'needs_service' ? 'row-warn' :
      row.condition === 'unusable'      ? 'row-bad'  : '';

    const photosHtml = row.photo_paths.length > 0
      ? row.photo_paths.map(p =>
          photoEmbeds[p]
            ? `<span class="item-photo"><img src="${photoEmbeds[p]}" alt="ფოტო" /></span>`
            : '',
        ).join('')
      : '';

    const noteHtml = row.note?.trim()
      ? `<div class="item-note">${escHtml(row.note)}</div>`
      : '';

    return `
      <tr class="${rowClass}">
        <td class="col-num">${idx + 1}</td>
        <td>${escHtml(row.name)}</td>
        <td>${escHtml(row.model) || '—'}</td>
        <td>${escHtml(row.serialNumber) || '—'}</td>
        <td class="col-check">
          <span class="${conditionClass(row.condition)}">${conditionSymbol(row.condition)}</span>
        </td>
        <td class="col-note">${noteHtml}${photosHtml}</td>
      </tr>
    `;
  }).join('');

  const equipmentHtml = `
    <div class="section-title">II — აღჭურვილობის სია / Equipment List</div>
    ${legendHtml}
    <table class="eq-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>დასახელება / Name</th>
          <th>მარკა/მოდელი / Model</th>
          <th>სერ.ნომ. / Serial</th>
          <th class="col-check">მდ-რეობა / Cond.</th>
          <th class="col-note">შენიშვნა / Note</th>
        </tr>
      </thead>
      <tbody>
        ${equipmentRows || '<tr><td colspan="6" style="text-align:center;color:var(--inkFaint)">—</td></tr>'}
      </tbody>
    </table>
  `;

  // ── Section III — conclusion + photos ───────────────────────────────────────

  const summaryPhotosHtml = insp.summaryPhotos.length > 0
    ? `<div class="summary-photos">
        ${insp.summaryPhotos.map(p =>
          photoEmbeds[p]
            ? `<img src="${photoEmbeds[p]}" alt="ფოტო" />`
            : '',
        ).join('')}
       </div>`
    : '';

  const summaryHtml = `
    <div class="section-title">III — შეჯამება / Summary</div>
    <div class="conclusion-block">${escHtml(insp.conclusion) || '—'}</div>
    ${summaryPhotosHtml}
  `;

  // ── Section IV — signature ───────────────────────────────────────────────────

  const signerPosition = resolveSignerPosition(insp.signerRole, insp.signerRoleCustom);
  const sigRoleFull = insp.signerRole && insp.signerRole !== 'other'
    ? SIGNER_ROLE_LABEL_FULL[insp.signerRole]
    : signerPosition;

  const signatureHtml = `
    <div class="section-title">IV — ხელმოწერა / Signature</div>
    <div class="sig-block">
      <div class="sig-cell">
        <div class="sig-lbl">შემომწმებელი / Inspector</div>
        <div class="sig-name">${escHtml(insp.signerName) || '—'}</div>
        <div class="sig-role">${escHtml(sigRoleFull)}</div>
      </div>
      <div class="sig-cell">
        <div class="sig-lbl">თანამდებობა / Position</div>
        <div class="sig-role">${escHtml(signerPosition)}</div>
      </div>
      <div class="sig-cell">
        <div class="sig-lbl">ხელმოწერა / Signature</div>
        ${sigDataUrl ? `<img src="${sigDataUrl}" class="sig-img" alt="ხელმოწ." />` : '<div style="color:var(--inkFaint)">—</div>'}
      </div>
      <div class="sig-cell">
        <div class="sig-lbl">თარიღი / Date</div>
        <div class="sig-date">${fmtDate(insp.completedAt ?? insp.inspectionDate)}</div>
      </div>
    </div>
  `;

  // ── Footer ───────────────────────────────────────────────────────────────────

  const footerHtml = `
    <div class="footer">
      <span>Sarke — ტექნიკური ინსპ.</span>
      <span>ID: ${docId} · ${docDate}</span>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ტექნ. აღჭ. შემ. აქტი — ${escHtml(projectName)}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="page">
    ${headerHtml}
    ${infoHtml}
    ${equipmentHtml}
    ${summaryHtml}
    ${signatureHtml}
    ${footerHtml}
  </div>
</body>
</html>`;
}
