/**
 * PDF HTML builders for the რისკების შეფასება register.
 *   buildRiskAssessmentPdfHtml   — doc B: hazard table + a×ш scoring + 5×5 matrix + legend
 *   buildPpeDeterminationPdfHtml — doc A: PPE-by-job-position matrix (იდს განსაზღვრა)
 * Render with `generateAndSharePdf` from lib/pdfOpen.ts.
 */

import { escHtml, fmtDate } from './pdfShared';
import {
  riskScore,
  riskCategory,
  RA_CATEGORY_LABEL,
  RA_CATEGORY_COLOR,
  RA_CATEGORY_BG,
  RA_PROBABILITY_LABELS,
  RA_SEVERITY_LABELS,
  type RiskAssessment,
  type RiskHazardEntry,
  type PpeEntry,
  type RASignatory,
} from '../types/riskAssessment';

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;600;700;800&display=swap');`;

const BASE_CSS = `
  ${FONT}
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Noto Sans Georgian', 'Sylfaen', Arial, sans-serif;
    font-size: 10px; color: #1A1A1A; line-height: 1.4;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page { padding: 18px 22px 28px; }
  .doc-title { text-align: center; font-size: 15px; font-weight: 800; margin-bottom: 2px; }
  .doc-sub { text-align: center; font-size: 10px; color: #6B7280; margin-bottom: 12px; }
  table.meta { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
  table.meta td { border: 0.5px solid #D1D5DB; padding: 4px 7px; vertical-align: top; }
  table.meta td.k { font-weight: 700; width: 24%; background: #F9FAFB; }
  table.grid { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  table.grid th, table.grid td { border: 0.5px solid #D1D5DB; padding: 4px 5px; vertical-align: top; font-size: 9px; }
  table.grid thead th { background: #F3F4F6; font-weight: 700; text-align: center; }
  .num { text-align: center; color: #9CA3AF; width: 22px; }
  .score { text-align: center; font-weight: 700; }
  .section-h { font-size: 11px; font-weight: 700; margin: 14px 0 6px; }
  .sig-row { display: flex; gap: 14px; margin-top: 18px; }
  .sig-box { flex: 1; border: 0.5px solid #D1D5DB; border-radius: 6px; padding: 8px 10px; }
  .sig-role { font-size: 9px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }
  .sig-name { font-weight: 700; font-size: 11px; }
  .sig-img { max-height: 40px; max-width: 100%; margin-top: 4px; display: block; }
  .sig-line { height: 26px; border-bottom: 1px dashed #9CA3AF; margin-top: 6px; }
  .legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 9px; margin-bottom: 8px; }
  .legend .col { flex: 1; min-width: 150px; }
  .legend b { display: block; margin-bottom: 2px; }
  table.matrix { border-collapse: collapse; margin: 6px 0 4px; }
  table.matrix td, table.matrix th { border: 0.5px solid #9CA3AF; width: 30px; height: 26px; text-align: center; font-weight: 700; font-size: 10px; }
  table.matrix th { background: #F3F4F6; font-weight: 700; }
  .matrix-wrap { display: flex; align-items: center; gap: 8px; }
  .axis-v { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 9px; font-weight: 700; color: #6B7280; }
  .axis-h { text-align: center; font-size: 9px; font-weight: 700; color: #6B7280; margin-top: 2px; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #E5E7EB; font-size: 8.5px; color: #9CA3AF; display: flex; justify-content: space-between; }
`;

function metaRows(rows: [string, string][]): string {
  return rows
    .filter(([, v]) => v != null)
    .map(([k, v]) => `<tr><td class="k">${escHtml(k)}</td><td>${escHtml(v) || '—'}</td></tr>`)
    .join('');
}

function riskPill(score: number): string {
  const cat = riskCategory(score);
  if (!cat) return '<span class="score">—</span>';
  return `<span class="score" style="display:inline-block;min-width:18px;border-radius:8px;padding:1px 4px;color:${RA_CATEGORY_COLOR[cat]};background:${RA_CATEGORY_BG[cat]};">${score}</span>`;
}

function sigBox(role: string, s: RASignatory | undefined): string {
  const sig = s?.signature
    ? `<img class="sig-img" src="data:image/png;base64,${s.signature}" />`
    : '<div class="sig-line"></div>';
  return `<div class="sig-box">
    <div class="sig-role">${escHtml(role)}</div>
    <div class="sig-name">${escHtml(s?.name) || '—'}</div>
    ${s?.position ? `<div style="font-size:9px;color:#6B7280;">${escHtml(s.position)}</div>` : ''}
    ${sig}
    ${s?.date ? `<div style="font-size:9px;color:#9CA3AF;margin-top:3px;">${escHtml(fmtDate(s.date))}</div>` : ''}
  </div>`;
}

// ── 5×5 risk matrix (probability rows 5→1 × severity cols 1→5) ──────────────────
function renderMatrix(): string {
  let rows = '';
  for (let p = 5; p >= 1; p -= 1) {
    let cells = `<th>${p}</th>`;
    for (let s = 1; s <= 5; s += 1) {
      const score = p * s;
      const cat = riskCategory(score)!;
      cells += `<td style="background:${RA_CATEGORY_BG[cat]};color:${RA_CATEGORY_COLOR[cat]};">${score}</td>`;
    }
    rows += `<tr>${cells}</tr>`;
  }
  const headCols = [1, 2, 3, 4, 5].map((s) => `<th>${s}</th>`).join('');
  return `
    <div class="section-h">რისკის შეფასების მატრიცა (ალბათობა × შედეგი)</div>
    <div class="matrix-wrap">
      <div class="axis-v">ალბათობა</div>
      <table class="matrix">
        <tr><th></th>${headCols}</tr>
        ${rows}
      </table>
    </div>
    <div class="axis-h">შედეგი (სიმძიმე) →</div>
  `;
}

function renderLegend(): string {
  const prob = Object.entries(RA_PROBABILITY_LABELS).map(([n, l]) => `${n} = ${l}`).join('; ');
  const sev = Object.entries(RA_SEVERITY_LABELS).map(([n, l]) => `${n} = ${l}`).join('; ');
  const cats = `კრიტიკული (20–25); ძალიან მაღალი (10–16); მაღალი (5–9); საშუალო (3–4); დაბალი (1–2)`;
  return `
    <div class="legend">
      <div class="col"><b>„ა“ — ალბათობა</b>${escHtml(prob)}.</div>
      <div class="col"><b>„შ“ — შედეგი (სიმძიმე)</b>${escHtml(sev)}.</div>
      <div class="col"><b>„რ“ — რისკის დონე = ა × შ</b>${escHtml(cats)}.</div>
    </div>
  `;
}

function pageHtml(title: string, css: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ka">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>${BASE_CSS}${css}</style></head>
<body><div class="page">${body}</div></body></html>`;
}

// ── doc B: risk assessment ──────────────────────────────────────────────────────

export function buildRiskAssessmentPdfHtml(args: {
  assessment: RiskAssessment;
  projectName?: string;
}): string {
  const { assessment: a } = args;
  const h = a.header;
  const entries = a.entries as RiskHazardEntry[];

  const meta = `<table class="meta">${metaRows([
    ['ობიექტი', h.objectName ?? args.projectName ?? ''],
    ['შემფასებელი', h.assessorName ?? ''],
    ['თარიღი', h.date ? fmtDate(h.date) : ''],
    ['დრო', h.time ?? ''],
    ['სამუშაოს აღწერა', h.workDescription ?? ''],
  ])}</table>`;

  const rows = entries.map((e, i) => {
    const initial = riskScore(e.probability, e.severity);
    const residual = riskScore(e.residualProbability, e.residualSeverity);
    return `<tr>
      <td class="num">${i + 1}</td>
      <td>${escHtml(e.hazard)}</td>
      <td>${escHtml(e.persons)}</td>
      <td>${escHtml(e.injuryType)}</td>
      <td>${escHtml(e.existingControls)}</td>
      <td class="score">${e.probability || '—'}</td>
      <td class="score">${e.severity || '—'}</td>
      <td>${riskPill(initial)}</td>
      <td>${escHtml(e.additionalControls)}</td>
      <td class="score">${e.residualProbability || '—'}</td>
      <td class="score">${e.residualSeverity || '—'}</td>
      <td>${riskPill(residual)}</td>
      <td>${escHtml(e.measures)}</td>
      <td>${escHtml(e.responsible)}</td>
      <td>${e.reviewDate ? escHtml(fmtDate(e.reviewDate)) : '—'}</td>
    </tr>`;
  }).join('');

  const emptyRow = entries.length === 0
    ? '<tr><td colspan="15" style="text-align:center;color:#9CA3AF;padding:16px;">ჩანაწერი არ არის</td></tr>'
    : '';

  const table = `
    <table class="grid">
      <thead>
        <tr>
          <th rowspan="2" class="num">№</th>
          <th rowspan="2">საფრთხის იდენტიფიცირება</th>
          <th rowspan="2">პირთა წრე</th>
          <th rowspan="2">დაშავების ტიპი</th>
          <th rowspan="2">არსებული კონტ. ზომები</th>
          <th colspan="3">საწყისი რისკი</th>
          <th rowspan="2">დამატებითი კონტ. ზომები</th>
          <th colspan="3">ნარჩენი რისკი</th>
          <th rowspan="2">გასატარებელი ზომები</th>
          <th rowspan="2">პასუხ. პირი / ვადა</th>
          <th rowspan="2">გადახედვა</th>
        </tr>
        <tr><th>ა</th><th>შ</th><th>რ</th><th>ა</th><th>შ</th><th>რ</th></tr>
      </thead>
      <tbody>${rows}${emptyRow}</tbody>
    </table>
  `;

  const sigs = `<div class="sig-row">
    ${sigBox('შემფასებელი', a.signatories.assessor)}
    ${sigBox('კომპანიის წარმომადგენელი', a.signatories.companyRep)}
  </div>`;

  const body = `
    <div class="doc-title">რისკების შეფასება</div>
    <div class="doc-sub">RISK ASSESSMENT</div>
    ${meta}
    ${table}
    ${renderLegend()}
    ${renderMatrix()}
    ${sigs}
    <div class="footer"><span>რისკების შეფასება</span><span>${escHtml(fmtDate(a.createdAt))}</span></div>
  `;

  const css = `@page { size: A4 landscape; margin: 10mm; }`;
  return pageHtml('რისკების შეფასება', css, body);
}

// ── doc A: PPE determination (იდს განსაზღვრა) ──────────────────────────────────

export function buildPpeDeterminationPdfHtml(args: {
  assessment: RiskAssessment;
  projectName?: string;
}): string {
  const { assessment: a } = args;
  const h = a.header;
  const entries = a.entries as PpeEntry[];

  const meta = `<table class="meta">${metaRows([
    ['კომპანია', h.companyName ?? ''],
    ['ობიექტი (დასახელება / ს.ნ.)', h.objectName ?? args.projectName ?? ''],
    ['ობიექტის მისამართი', h.address ?? ''],
    ['ფორმის შემვსები (შრ. უსაფ. სპეციალისტი)', h.hseSpecialist ?? ''],
  ])}</table>`;

  const rows = entries.map((e, i) => `<tr>
    <td class="num">${i + 1}</td>
    <td>${escHtml(e.position)}</td>
    <td>${escHtml(e.activities)}</td>
    <td>${escHtml(e.hazards)}</td>
    <td>${escHtml(e.bodyParts)}</td>
    <td>${escHtml(e.ppe)}</td>
  </tr>`).join('');

  const emptyRow = entries.length === 0
    ? '<tr><td colspan="6" style="text-align:center;color:#9CA3AF;padding:16px;">ჩანაწერი არ არის</td></tr>'
    : '';

  const table = `
    <table class="grid">
      <thead><tr>
        <th class="num">№</th>
        <th>სამუშაო პოზიცია</th>
        <th>სამუშაო აქტივობების აღწერა</th>
        <th>საფრთხეები (რისკები)</th>
        <th>სხეულის დასაცავი ნაწილები</th>
        <th>ინდ. დაცვის საშუალებები</th>
      </tr></thead>
      <tbody>${rows}${emptyRow}</tbody>
    </table>
  `;

  const sigs = `<div class="sig-row">
    ${sigBox('შრომის უსაფრთხოების სპეციალისტი', a.signatories.hse)}
    ${sigBox('დირექტორი', a.signatories.director)}
  </div>`;

  const body = `
    <div class="doc-title">ინდივიდუალური დაცვის საშუალებების განსაზღვრა</div>
    <div class="doc-sub">PPE DETERMINATION BY JOB POSITION</div>
    ${meta}
    ${table}
    ${sigs}
    <div class="footer"><span>იდს განსაზღვრა</span><span>${escHtml(fmtDate(a.createdAt))}</span></div>
  `;

  const css = `@page { size: A4 landscape; margin: 12mm; }`;
  return pageHtml('იდს განსაზღვრა', css, body);
}
