/**
 * PDF HTML generator for დამჭერი მოწყობილობების შემოწმების აქტი.
 *
 * Layout:
 *   Bilingual header + standard badges →
 *   Section I  (general info + equipment registry table) →
 *   Per-device sections N1, N2, … (checklist, verdict, signature, photos) →
 *   Footer (EN standards)
 */

import { embedInspectionPhotos, escHtml, fmtDate } from './pdfShared';
import {
  FP_CHECKLIST_ITEMS,
  FP_RESULT_TO_CHIP,
  FP_VERDICT_LABELS,
  type FallProtectionInspection,
  type FPDeviceData,
  type FPResult,
} from '../types/fallProtection';

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
  .logo-text { color: #fff; font-weight: 800; font-size: 15px; }
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
  .date-label { font-size: 10px; color: var(--inkFaint); }
  .date-value { font-size: 12px; font-weight: 700; color: var(--ink); margin-top: 2px; }

  .section { margin-bottom: 24px; }
  .section-title {
    font-size: 11px; font-weight: 800; color: var(--inkSoft);
    text-transform: uppercase; letter-spacing: 0.6px;
    padding-bottom: 6px; border-bottom: 1px solid var(--hairline);
    margin-bottom: 12px;
  }

  .info-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  }
  .info-row { display: flex; flex-direction: column; gap: 2px; }
  .info-label { font-size: 10px; color: var(--inkFaint); }
  .info-value { font-size: 12px; font-weight: 600; color: var(--ink); }

  /* Registry table */
  .reg-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
  .reg-table th {
    background: var(--catHdr); padding: 6px 8px; text-align: left;
    font-weight: 700; border: 1px solid var(--hairline);
  }
  .reg-table td { padding: 6px 8px; border: 1px solid var(--hairline); }
  .reg-table tr:nth-child(even) td { background: #FAFAFA; }

  /* Device section */
  .device-section {
    border: 1.5px solid var(--hairline); border-radius: 10px;
    margin-bottom: 20px; overflow: hidden;
  }
  .device-header {
    background: var(--catHdr); padding: 10px 14px;
    display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid var(--hairline);
  }
  .device-badge {
    background: var(--accent); color: #fff; font-weight: 800;
    font-size: 13px; border-radius: 8px; padding: 2px 10px;
  }
  .device-meta { font-size: 11px; color: var(--inkSoft); }

  /* Checklist table */
  .cl-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .cl-table th {
    background: var(--catHdr); padding: 6px 8px; font-weight: 700;
    border: 1px solid var(--hairline); text-align: left;
  }
  .cl-table td { padding: 6px 8px; border: 1px solid var(--hairline); vertical-align: top; }
  .cl-table tr:nth-child(even) td { background: #FAFAFA; }
  .chip-safe     { color: #065F46; font-weight: 700; }
  .chip-critical { color: var(--redText); font-weight: 700; }
  .chip-minor    { color: #92400E; font-weight: 700; }
  .chip-na       { color: var(--inkFaint); }

  /* Verdict */
  .verdict-block { padding: 12px 14px; border-bottom: 1px solid var(--hairline); }
  .verdict-label { font-size: 10px; color: var(--inkFaint); margin-bottom: 4px; }
  .verdict-safe   { color: #065F46; font-weight: 800; font-size: 13px; }
  .verdict-minor  { color: #92400E; font-weight: 800; font-size: 13px; }
  .verdict-banned { color: var(--redText); font-weight: 800; font-size: 13px; }
  .verdict-comment { font-size: 11px; color: var(--inkSoft); margin-top: 4px; }

  /* Signature */
  .sig-block { padding: 12px 14px; border-bottom: 1px solid var(--hairline); }
  .sig-row { display: flex; gap: 16px; align-items: flex-start; }
  .sig-fields { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .sig-canvas { width: 180px; text-align: center; }
  .sig-img { max-width: 180px; max-height: 80px; border-bottom: 1px solid var(--ink); }
  .sig-date { font-size: 10px; color: var(--inkFaint); margin-top: 4px; }
  .unsigned { width: 180px; height: 60px; border-bottom: 1px dashed var(--hairline); }

  /* Photos */
  .photos-block { padding: 12px 14px; }
  .photos-label { font-size: 10px; color: var(--inkFaint); margin-bottom: 8px; }
  .photos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .photos-grid img { width: 100%; height: 160px; object-fit: cover; border-radius: 6px; }
  .item-comment { font-size: 10px; color: var(--inkSoft); margin-top: 3px; font-style: italic; }

  .footer {
    margin-top: 28px; padding-top: 12px;
    border-top: 1px solid var(--hairline);
    font-size: 10px; color: var(--inkFaint); text-align: center;
  }

  @media print { .page { padding: 0; } }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function chipClass(result: FPResult | null): string {
  if (result === 'safe')     return 'chip-safe';
  if (result === 'critical') return 'chip-critical';
  if (result === 'minor')    return 'chip-minor';
  return 'chip-na';
}

function chipDisplay(result: FPResult | null): string {
  if (!result) return '—';
  return FP_RESULT_TO_CHIP[result];
}

function verdictClass(verdict: string | null): string {
  if (verdict === 'safe')   return 'verdict-safe';
  if (verdict === 'minor')  return 'verdict-minor';
  if (verdict === 'banned') return 'verdict-banned';
  return '';
}

function buildDeviceSection(
  data: FPDeviceData,
  deviceLabel: string,
  deviceMeta: string,
  photos: Record<string, string>,
): string {
  // Checklist rows
  const rows = FP_CHECKLIST_ITEMS.map(entry => {
    const state = data.items.find(i => i.id === entry.id);
    const result = state?.result ?? null;
    return `
      <tr>
        <td>${entry.id}</td>
        <td>${escHtml(entry.label)}</td>
        <td class="${chipClass(result)}">${chipDisplay(result)}</td>
        <td class="item-comment">${escHtml(state?.comment ?? '')}</td>
      </tr>`;
  }).join('');

  // Custom item row
  const ci = data.customItem;
  const customRow = `
    <tr>
      <td>13</td>
      <td>${escHtml(ci.label || 'სხვა')}</td>
      <td class="${chipClass(ci.result)}">${chipDisplay(ci.result)}</td>
      <td class="item-comment">${escHtml(ci.comment ?? '')}</td>
    </tr>`;

  // Verdict
  const vLabel = data.verdict ? FP_VERDICT_LABELS[data.verdict] : '—';
  const verdictHtml = `
    <div class="verdict-block">
      <div class="verdict-label">დასკვნა</div>
      <div class="${verdictClass(data.verdict)}">${escHtml(vLabel)}</div>
      ${data.verdictComment ? `<div class="verdict-comment">${escHtml(data.verdictComment)}</div>` : ''}
    </div>`;

  // Signature
  const sig = data.signature;
  const sigImgTag = sig.signature
    ? `<img class="sig-img" src="data:image/png;base64,${sig.signature}" alt="ხელმოწერა" />`
    : '<div class="unsigned"></div>';
  const sigHtml = `
    <div class="sig-block">
      <div class="sig-row">
        <div class="sig-fields">
          <div class="info-row">
            <span class="info-label">სახელი, გვარი</span>
            <span class="info-value">${escHtml(sig.name) || '—'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">სამუშაო პოზიცია</span>
            <span class="info-value">${escHtml(sig.position) || '—'}</span>
          </div>
        </div>
        <div class="sig-canvas">
          ${sigImgTag}
          <div class="sig-date">${sig.date ? fmtDate(sig.date) : ''}</div>
        </div>
      </div>
    </div>`;

  // Photos — item-level photos first, then device summary photos
  const allItemPhotoPaths = [
    ...data.items.flatMap(i => i.photo_paths ?? []),
    ...(ci.photo_paths ?? []),
  ];
  const allPhotoPaths = [...allItemPhotoPaths, ...(data.photoPaths ?? [])];
  const photoCells = allPhotoPaths
    .map(p => photos[p] ? `<img src="${photos[p]}" alt="ფოტო" />` : '')
    .filter(Boolean)
    .join('');
  const photosHtml = `
    <div class="photos-block">
      <div class="photos-label">${escHtml(deviceLabel)} — ფოტო</div>
      ${photoCells
        ? `<div class="photos-grid">${photoCells}</div>`
        : '<span style="color:var(--inkFaint)">—</span>'}
    </div>`;

  return `
    <div class="device-section">
      <div class="device-header">
        <span class="device-badge">${escHtml(deviceLabel)}</span>
        <span class="device-meta">${escHtml(deviceMeta)}</span>
      </div>
      <table class="cl-table">
        <thead>
          <tr>
            <th style="width:28px">#</th>
            <th>პარამეტრი</th>
            <th style="width:36px">შეფ.</th>
            <th>კომენტარი</th>
          </tr>
        </thead>
        <tbody>${rows}${customRow}</tbody>
      </table>
      ${verdictHtml}
      ${sigHtml}
      ${photosHtml}
    </div>`;
}

// ── Main builder ──────────────────────────────────────────────────────────────

export async function buildFallProtectionPdfHtml(opts: {
  inspection: FallProtectionInspection;
  projectName: string;
}): Promise<string> {
  const { inspection: ins, projectName } = opts;

  // Collect all photo paths for embedding
  const allPaths = ins.deviceData.flatMap(d => [
    ...d.items.flatMap(i => i.photo_paths ?? []),
    ...(d.customItem.photo_paths ?? []),
    ...(d.photoPaths ?? []),
  ]);
  const photos = await embedInspectionPhotos(allPaths);

  // Registry table rows
  const regRows = ins.devices.map((d, i) => `
    <tr>
      <td>${escHtml(d.id)}</td>
      <td>${escHtml(d.type)}</td>
      <td>${escHtml(d.location)}</td>
      <td>${escHtml(d.floor)}</td>
      <td>${escHtml(d.purpose)}</td>
      <td>${escHtml(d.comment)}</td>
    </tr>`).join('');

  const inspTypeLabel =
    ins.inspectionType === 'primary' ? 'პირველადი' :
    ins.inspectionType === 'secondary' ? 'განმეორებითი' : '—';

  // Device sections
  const deviceSections = ins.devices.map((d, i) => {
    const data = ins.deviceData[i];
    if (!data) return '';
    const meta = [d.type, d.location, d.floor].filter(Boolean).join(' · ');
    return buildDeviceSection(data, d.id, meta, photos);
  }).join('');

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>დამჭერი მოწყობილობების შემოწმების აქტი</title>
  <style>${CSS}</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="logo-box"><span class="logo-text">S</span></div>
      <div>
        <div class="project-name">${escHtml(projectName)}</div>
      </div>
    </div>
    <div class="header-center">
      <div class="doc-title">
        დამჭერი მოწყობილობების<br/>შემოწმების აქტი
      </div>
      <div class="doc-sub">Fall Protection Equipment Inspection</div>
      <div class="regulation-badge">EN 363 · EN 795 · EN 354</div>
    </div>
    <div class="header-right">
      <div class="date-label">შემოწმების თარიღი</div>
      <div class="date-value">${fmtDate(ins.inspectionDate)}</div>
      ${ins.nextInspectionDate ? `
      <div class="date-label" style="margin-top:6px">მომდევნო შემოწმება</div>
      <div class="date-value">${fmtDate(ins.nextInspectionDate)}</div>` : ''}
    </div>
  </div>

  <!-- Section I: General info + registry -->
  <div class="section">
    <div class="section-title">I — ზოგადი ინფორმაცია / General Information</div>
    <div class="info-grid">
      <div class="info-row">
        <span class="info-label">ობიექტის დასახელება</span>
        <span class="info-value">${escHtml(ins.company) || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">მისამართი</span>
        <span class="info-value">${escHtml(ins.address) || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">უსაფრთხ. ხელმძღვ.</span>
        <span class="info-value">${escHtml(ins.safetyLeaderName) || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">ტელეფონი</span>
        <span class="info-value">${escHtml(ins.safetyLeaderPhone) || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">შემოწმების სახე</span>
        <span class="info-value">${inspTypeLabel}</span>
      </div>
    </div>

    <table class="reg-table" style="margin-top:16px">
      <thead>
        <tr>
          <th>ID</th>
          <th>ტიპი / სახეობა</th>
          <th>განთავს. ადგილი</th>
          <th>სართული</th>
          <th>ვისთვის / რისთვის</th>
          <th>კომენტარი</th>
        </tr>
      </thead>
      <tbody>${regRows}</tbody>
    </table>
  </div>

  <!-- Per-device sections -->
  ${deviceSections}

  <!-- Footer -->
  <div class="footer">
    EN 363:2008 · EN 795:2012 · EN 354:2010 · EN 355:2002 · EN 1891:2020 · EN 361:2002
  </div>

</div>
</body>
</html>`;
}
