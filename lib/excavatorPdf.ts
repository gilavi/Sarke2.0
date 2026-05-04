/**
 * PDF HTML generator for ექსკავატორის ტექნიკური შემოწმების აქტი.
 *
 * Layout:
 *   Header → Section I (machine specs) → Section II (doc info) →
 *   Legend → Sections 1–4 checklist table → Section 6 maintenance table →
 *   Section IV verdict → Section V inspector signature
 *
 * Uses `pdfPhotoEmbed` for item photos.
 * Call `generateAndSharePdf` from `lib/pdfOpen.ts` with the returned HTML.
 */

import { embedInspectionPhotos, escHtml, fmtDate } from './pdfShared';
import {
  ENGINE_ITEMS,
  UNDERCARRIAGE_ITEMS,
  CABIN_ITEMS,
  SAFETY_ITEMS,
  MAINTENANCE_ITEMS,
  EXCAVATOR_VERDICT_LABEL,
  type ExcavatorInspection,
  type ExcavatorChecklistEntry,
  type ExcavatorChecklistItemState,
  type ExcavatorVerdict,
} from '../types/excavator';

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

  /* Machine specs table */
  .specs-table {
    width: 100%; border-collapse: collapse; margin-bottom: 4px;
  }
  .specs-table th, .specs-table td {
    border: 0.5px solid var(--hairline);
    padding: 6px 8px; text-align: center; font-size: 11px;
  }
  .specs-table thead tr { background: var(--catHdr); }
  .specs-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .specs-table td { font-weight: 600; color: var(--ink); }

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
  .cl-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; text-align: center; }
  .cl-sec-row td {
    background: var(--catHdr); font-weight: 700;
    font-size: 11px; color: var(--inkSoft); padding: 6px 8px;
  }
  .col-num   { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-check { width: 60px; text-align: center; }
  .item-comment { font-size: 10px; color: var(--inkSoft); font-style: italic; margin-top: 4px; }
  .item-photo { display: inline-block; margin: 4px 4px 0 0; }
  .item-photo img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); }

  /* Check marks */
  .ck-good { color: #059669; font-size: 14px; font-weight: 800; }
  .ck-def  { color: #D97706; font-size: 13px; font-weight: 800; }
  .ck-bad  { color: #DC2626; font-size: 14px; font-weight: 800; }

  /* Maintenance table */
  .maint-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .maint-table th, .maint-table td {
    border: 0.5px solid var(--hairline);
    padding: 5px 7px; font-size: 11px;
    vertical-align: top;
  }
  .maint-table thead tr { background: var(--catHdr); }
  .maint-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; text-align: center; }
  .col-maint-check { width: 48px; text-align: center; }
  .col-maint-date  { width: 110px; text-align: center; }

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
  .notes-label { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .notes-block {
    margin-top: 4px; padding: 10px 12px;
    border: 0.5px solid var(--hairline); border-radius: 8px;
    min-height: 48px; font-size: 11px; color: var(--ink); line-height: 1.5;
  }

  /* Signature — 4 cells: name | position | signature img | date */
  .sig-block {
    display: grid; grid-template-columns: 2fr 1.5fr 1.5fr 1fr;
    gap: 0; margin-top: 8px;
    border: 0.5px solid var(--hairline); border-radius: 8px; overflow: hidden;
  }
  .sig-cell { padding: 10px 12px; border-right: 0.5px solid var(--hairline); }
  .sig-cell:last-child { border-right: none; }
  .sig-lbl { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChecklistSection {
  title: string;
  entries: ExcavatorChecklistEntry[];
  items: ExcavatorChecklistItemState[];
}

// ── HTML builder ──────────────────────────────────────────────────────────────

export async function buildExcavatorPdfHtml(args: {
  inspection: ExcavatorInspection;
  projectName: string;
}): Promise<string> {
  const { inspection: insp, projectName } = args;

  const photoEmbeds = await embedInspectionPhotos(
    [
      ...insp.engineItems,
      ...insp.undercarriageItems,
      ...insp.cabinItems,
      ...insp.safetyItems,
    ].flatMap(i => i.photo_paths ?? []),
  );
  const summaryPhotoEmbeds = await embedInspectionPhotos(insp.summaryPhotos ?? []);

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
        <div class="doc-title">ექსკავატორის ტექნიკური<br>შემოწმების აქტი</div>
        <div class="doc-sub">Excavator Technical Inspection Report</div>
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

  // ── Section I — Machine specs ────────────────────────────────────────────────

  const sp = insp.machineSpecs ?? { weight: '—', engine: '—', power: '—', depth: '—', travel: '—', maxReach: '—' };
  const sectionIHtml = `
    <div class="section-title">I — მანქანის ტექნიკური მახასიათებლები</div>
    <table class="specs-table">
      <thead>
        <tr>
          <th>წონა</th>
          <th>ძრავა</th>
          <th>სიმძლავრე</th>
          <th>სიღრმე</th>
          <th>სვლა</th>
          <th>მაქს. გამბარი</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escHtml(sp.weight)}</td>
          <td>${escHtml(sp.engine)}</td>
          <td>${escHtml(sp.power)}</td>
          <td>${escHtml(sp.depth)}</td>
          <td>${escHtml(sp.travel)}</td>
          <td>${escHtml(sp.maxReach)}</td>
        </tr>
      </tbody>
    </table>
  `;

  // ── Section II — Document info ───────────────────────────────────────────────

  const sectionIIHtml = `
    <div class="section-title">II — დოკუმენტის ინფორმაცია</div>
    <table class="info-table">
      <tr>
        <td>
          <span class="lbl">სერიული ნომერი</span>
          <span class="val">${escHtml(insp.serialNumber) || '—'}</span>
        </td>
        <td>
          <span class="lbl">საინვენტარო ნომერი</span>
          <span class="val">${escHtml(insp.inventoryNumber) || '—'}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="lbl">ობიექტი / პროექტი</span>
          <span class="val">${escHtml(insp.projectName) || '—'}</span>
        </td>
        <td>
          <span class="lbl">განყოფილება</span>
          <span class="val">${escHtml(insp.department) || '—'}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="lbl">შემოწმების თარიღი</span>
          <span class="val">${fmtDate(insp.inspectionDate)}</span>
        </td>
        <td>
          <span class="lbl">მოტო საათები</span>
          <span class="val">${insp.motoHours != null ? String(insp.motoHours) : '—'}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="lbl">შემომწმებელი</span>
          <span class="val">${escHtml(insp.inspectorName) || '—'}</span>
        </td>
        <td>
          <span class="lbl">ბოლო შემოწმების თარიღი</span>
          <span class="val">${fmtDate(insp.lastInspectionDate)}</span>
        </td>
      </tr>
    </table>
  `;

  // ── Sections III (1-4) — Checklist ───────────────────────────────────────────

  function checklistItemRows(
    sections: ChecklistSection[],
    photoMap: Record<string, string>,
  ): string {
    let rows = '';
    for (const sec of sections) {
      rows += `
        <tr class="cl-sec-row">
          <td colspan="5">${escHtml(sec.title)}</td>
        </tr>
      `;
      for (const entry of sec.entries) {
        const state = sec.items.find(i => i.id === entry.id);
        const result = state?.result ?? null;
        const comment = state?.comment ?? null;
        const photos  = state?.photo_paths ?? [];

        let photoHtml = '';
        for (const p of photos) {
          const src = photoMap[p];
          if (src) photoHtml += `<span class="item-photo"><img src="${src}" alt="ფოტო" /></span>`;
        }

        const ckGood = result === 'good'      ? '<span class="ck-good">✓</span>' : '';
        const ckDef  = result === 'deficient' ? '<span class="ck-def">?</span>'  : '';
        const ckBad  = result === 'unusable'  ? '<span class="ck-bad">✗</span>'  : '';

        rows += `
          <tr>
            <td class="col-num">${entry.id}</td>
            <td>
              <strong>${escHtml(entry.label)}</strong>
              <div style="color:var(--inkSoft);font-size:10px;margin-top:2px;">${escHtml(entry.description)}</div>
              ${comment ? `<div class="item-comment">${escHtml(comment)}</div>` : ''}
              ${photoHtml ? `<div style="margin-top:4px;">${photoHtml}</div>` : ''}
            </td>
            <td class="col-check">${ckGood}</td>
            <td class="col-check">${ckDef}</td>
            <td class="col-check">${ckBad}</td>
          </tr>
        `;
      }
    }
    return rows;
  }

  const checklistSections: ChecklistSection[] = [
    { title: '1. ძრავი (Engine)',                   entries: ENGINE_ITEMS,        items: insp.engineItems        },
    { title: '2. სავალი ნაწილი (Undercarriage)',    entries: UNDERCARRIAGE_ITEMS, items: insp.undercarriageItems },
    { title: '4. კაბინა (Cabin)',                    entries: CABIN_ITEMS,         items: insp.cabinItems         },
    { title: '5. უსაფრთხოება (Safety)',             entries: SAFETY_ITEMS,        items: insp.safetyItems        },
  ];

  const sectionIIIHtml = `
    <div class="section-title">III — შემოწმების ჩეკლისტი</div>
    <div class="legend">
      <span class="legend-item"><span class="dot dot-good"></span>✓ კარგი — ნორმაში</span>
      <span class="legend-item"><span class="dot dot-def"></span>? ნაკლი — საჭიროებს მომსახურებას</span>
      <span class="legend-item"><span class="dot dot-bad"></span>✗ გამოუსადეგარი</span>
    </div>
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>შემოწმების პუნქტი</th>
          <th class="col-check">კარგია</th>
          <th class="col-check">ნაკლი</th>
          <th class="col-check">გამოუსადეგარია</th>
        </tr>
      </thead>
      <tbody>${checklistItemRows(checklistSections, photoEmbeds)}</tbody>
    </table>
  `;

  // ── Section VI — Maintenance ─────────────────────────────────────────────────

  const maintRows = MAINTENANCE_ITEMS.map(entry => {
    const state = insp.maintenanceItems.find(i => i.id === entry.id);
    const answer = state?.answer ?? null;
    const date   = state?.date   ?? null;

    const ckYes = answer === 'yes' ? '<span class="ck-good">✓</span>' : '';
    const ckNo  = answer === 'no'  ? '<span class="ck-bad">✗</span>'  : '';

    return `
      <tr>
        <td class="col-num">${entry.id}</td>
        <td>${escHtml(entry.label)}</td>
        <td class="col-maint-check">${ckYes}</td>
        <td class="col-maint-check">${ckNo}</td>
        <td class="col-maint-date">${date ? fmtDate(date) : ''}</td>
      </tr>
    `;
  }).join('');

  const sectionVIHtml = `
    <div class="section-title">VI — ტექნიკური მომსახურება</div>
    <table class="maint-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>შემოწმების პუნქტი</th>
          <th class="col-maint-check">კი</th>
          <th class="col-maint-check">არა</th>
          <th class="col-maint-date">თარიღი</th>
        </tr>
      </thead>
      <tbody>${maintRows}</tbody>
    </table>
  `;

  // ── Section IV — Verdict ─────────────────────────────────────────────────────

  const vx = (v: ExcavatorVerdict) => insp.verdict === v ? 'selected' : '';
  const vchecked = (v: ExcavatorVerdict) => insp.verdict === v ? 'checked' : '';

  const sectionIVHtml = `
    <div class="section-title">IV — დასკვნა</div>
    <div class="verdict-block">
      <div class="verdict-option ${vx('approved')}">
        <div class="verdict-box ${vchecked('approved')}"></div>
        <span class="verdict-label">${escHtml(EXCAVATOR_VERDICT_LABEL.approved)}</span>
      </div>
      <div class="verdict-option ${vx('conditional')}">
        <div class="verdict-box ${vchecked('conditional')}"></div>
        <span class="verdict-label">${escHtml(EXCAVATOR_VERDICT_LABEL.conditional)}</span>
      </div>
      <div class="verdict-option ${vx('rejected')}">
        <div class="verdict-box ${vchecked('rejected')}"></div>
        <span class="verdict-label">${escHtml(EXCAVATOR_VERDICT_LABEL.rejected)}</span>
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

  // ── Section V — Inspector ────────────────────────────────────────────────────

  const sigDate = insp.completedAt ? fmtDate(insp.completedAt) : fmtDate(insp.inspectionDate);

  const sectionVHtml = `
    <div class="section-title">V — შემომწმებელი</div>
    <div class="sig-block">
      <div class="sig-cell">
        <div class="sig-lbl">სახელი / გვარი</div>
        <div class="sig-name">${escHtml(insp.inspectorName) || '—'}</div>
        <div class="sig-role">შემომწმებელი</div>
      </div>
      <div class="sig-cell">
        <div class="sig-lbl">თანამდებობა</div>
        <div class="sig-name" style="font-weight:400;">${escHtml(insp.inspectorPosition) || '—'}</div>
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

  // ── Footer ───────────────────────────────────────────────────────────────────

  const footerHtml = `
    <div class="footer">
      <span>Sarke 2.0 — ექსკავატორის ტექნიკური შემოწმების აქტი</span>
      <span>${escHtml(docDate)} · ID ${escHtml(docId)}</span>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ექსკავატორის ტექნიკური შემოწმების აქტი</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="page">
    ${headerHtml}
    ${sectionIHtml}
    ${sectionIIHtml}
    ${sectionIIIHtml}
    ${sectionVIHtml}
    ${sectionIVHtml}
    ${sectionVHtml}
    ${footerHtml}
  </div>
</body>
</html>`;
}
