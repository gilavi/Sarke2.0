/**
 * PDF HTML generator for ალკოტესტერის შემოწმების ჟურნალი.
 *
 * Layout:
 *   Header (company | object | device S/N) →
 *   Title row →
 *   Instruction row (0.1 = SAFE | 0.1/0.2 >= WARNING) →
 *   Table (№ | თარიღი | სახელი/გვარი | პოზიცია | ტიპი | შედეგი | ხელმოწერა) →
 *   Summary block (სულ / SAFE / WARNING / FAIL) →
 *   Responsible person (name + signature) →
 *   Footer
 *
 * Call `generateAndSharePdf` from `lib/pdfOpen.ts` with the returned HTML.
 */

import { escHtml, fmtDate } from './pdfShared';
import {
  BL_RESULT_COLORS,
  countsByStatus,
  type BreathalizerLog,
  type BLEntry,
} from '../types/breathalyzerLog';

// ── CSS ────────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink:      #1A1A1A;
    --inkSoft:  #6B7280;
    --inkFaint: #9CA3AF;
    --hairline: #E5E7EB;
    --card:     #FFFFFF;
    --page:     #F9FAFB;
    --accent:   #1D9E75;
    --green:    #065F46;
    --greenBg:  #D1FAE5;
    --amber:    #92400E;
    --amberBg:  #FEF3C7;
    --red:      #991B1B;
    --redBg:    #FEE2E2;
    --catHdr:   #F3F4F6;
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
    max-width: 860px;
    margin: 0 auto;
    background: var(--card);
    padding: 28px 32px 40px;
  }

  /* Header */
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 14px;
    border-bottom: 2px solid var(--accent);
    margin-bottom: 16px;
  }
  .header-left .logo-box {
    width: 40px; height: 40px; border-radius: 9px;
    background: var(--accent); display: inline-flex;
    align-items: center; justify-content: center; margin-right: 10px;
    vertical-align: middle;
  }
  .header-meta { font-size: 11px; color: var(--inkSoft); line-height: 1.8; margin-top: 4px; }
  .header-right { text-align: right; }
  .doc-id { font-size: 10px; color: var(--inkFaint); }

  /* Title */
  .doc-title {
    text-align: center;
    font-size: 14px;
    font-weight: 800;
    color: var(--ink);
    margin-bottom: 4px;
  }
  .doc-sub {
    text-align: center;
    font-size: 11px;
    color: var(--inkSoft);
    margin-bottom: 10px;
  }

  /* Instruction */
  .instruction {
    background: var(--amberBg);
    border-left: 3px solid #D97706;
    padding: 6px 12px;
    font-size: 10px;
    color: var(--amber);
    border-radius: 4px;
    margin-bottom: 14px;
    font-weight: 600;
  }

  /* Main table */
  .log-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .log-table th, .log-table td {
    border: 0.5px solid var(--hairline);
    padding: 6px 7px;
    font-size: 10px;
    vertical-align: middle;
  }
  .log-table thead tr { background: var(--catHdr); }
  .log-table th {
    font-weight: 700;
    color: var(--inkSoft);
    text-transform: uppercase;
    letter-spacing: 0.4px;
    font-size: 9px;
  }
  .col-num  { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-date { width: 76px; }
  .col-name { width: 160px; }
  .col-pos  { width: 120px; }
  .col-type { width: 80px; text-align: center; }
  .col-res  { width: 80px; text-align: center; }
  .col-sig  { width: 80px; text-align: center; }

  .result-pill {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 9px;
    white-space: nowrap;
  }
  .result-safe    { background: var(--greenBg); color: var(--green); }
  .result-warning { background: var(--amberBg); color: var(--amber); }
  .result-fail    { background: var(--redBg);   color: var(--red);   font-weight: 800; }

  .type-pill {
    display: inline-block;
    padding: 2px 5px;
    border-radius: 8px;
    font-size: 9px;
    font-weight: 600;
    background: var(--catHdr);
    color: var(--inkSoft);
  }
  .type-repeat { background: #EFF6FF; color: #1D4ED8; }

  .repeat-indent { padding-left: 12px; }
  .repeat-label { font-size: 9px; color: var(--inkSoft); }

  .sig-img { max-height: 32px; max-width: 70px; display: block; margin: 0 auto; }
  .sig-refused { font-size: 9px; color: var(--inkFaint); font-style: italic; }

  /* Summary */
  .summary-block {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }
  .summary-item {
    flex: 1;
    border: 0.5px solid var(--hairline);
    border-radius: 8px;
    padding: 10px 12px;
    text-align: center;
  }
  .summary-number { font-size: 22px; font-weight: 800; color: var(--ink); }
  .summary-label  { font-size: 9px; font-weight: 600; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
  .summary-safe    .summary-number { color: var(--green); }
  .summary-warning .summary-number { color: var(--amber); }
  .summary-fail    .summary-number { color: var(--red); }

  /* Responsible person */
  .responsible-block {
    border: 0.5px solid var(--hairline);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 20px;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .responsible-cell {
    padding: 10px 14px;
    border-right: 0.5px solid var(--hairline);
  }
  .responsible-cell:last-child { border-right: none; }
  .responsible-lbl { font-size: 9px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .responsible-name { font-size: 13px; font-weight: 700; color: var(--ink); }
  .responsible-sig { max-height: 48px; max-width: 100%; margin-top: 4px; }
  .sig-line { height: 32px; border-bottom: 1px dashed var(--hairline); margin: 4px 0; }

  /* Footer */
  .footer {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid var(--hairline);
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--inkFaint);
  }

  @media print {
    html, body { background: #fff; }
    .page { padding: 0; max-width: none; }
    @page { margin: 16mm 12mm; }
  }
`;

// ── HTML builder ───────────────────────────────────────────────────────────────

export async function buildBreathalizerLogPdfHtml(args: {
  log: BreathalizerLog;
  projectName?: string;
  companyName?: string;
}): Promise<string> {
  const { log, projectName = 'პროექტი', companyName = '' } = args;

  const counts = countsByStatus(log.entries);
  const docDate = fmtDate(log.date);
  const docId = log.id.slice(-8).toUpperCase();
  const sn = log.deviceSerialNumber ? escHtml(log.deviceSerialNumber) : '-';

  // ── Header ─────────────────────────────────────────────────────────────────

  const headerHtml = `
    <div class="header">
      <div class="header-left">
        <div class="logo-box"><svg viewBox="0 0 250 250" width="26" height="26" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M247.544 81.6992C246.188 81.6992 245.088 82.7986 245.088 84.155C245.088 92.1243 243.912 99.9743 241.592 107.489C233.871 132.582 214.282 152.172 189.189 159.892L189.187 159.893C181.675 162.213 173.822 163.389 165.845 163.389H43.3007C19.4248 163.389 0 182.818 0 206.699C0 230.581 19.4248 250 43.3007 250C67.1766 250 86.611 230.575 86.611 206.699C86.611 185.526 103.832 168.3 125 168.3C146.168 168.3 163.389 185.526 163.389 206.699C163.389 230.575 182.818 250 206.699 250C230.581 250 250 230.575 250 206.699V84.1551C250 82.7987 248.901 81.6992 247.544 81.6992Z"/><path d="M2.4558 168.3C3.8122 168.3 4.9116 167.201 4.9116 165.844C4.9116 157.872 6.0877 150.022 8.4082 142.509C12.1706 130.258 18.9873 118.955 28.1208 109.821C37.2264 100.715 48.4953 93.9112 60.7167 90.1392C60.756 90.1291 60.7934 90.1186 60.8318 90.1066C68.344 87.787 76.1911 86.6109 84.1551 86.6109H206.699C230.575 86.6109 250 67.1818 250 43.3002C250 19.4186 230.575 0 206.699 0C182.823 0 163.389 19.4243 163.389 43.3002C163.389 64.4738 146.168 81.6993 125 81.6993C103.832 81.6993 86.6108 64.4737 86.6108 43.3002C86.6109 19.4243 67.1823 0 43.3007 0C19.4191 0 0 19.4243 0 43.3002V165.844C0 167.201 1.0994 168.3 2.4558 168.3Z"/></svg></div>
        <div class="header-meta">
          <strong>${escHtml(companyName || projectName)}</strong><br>
          ობიექტი: ${escHtml(projectName)}<br>
          სერიული ნომერი: ${sn}
        </div>
      </div>
      <div class="header-right">
        <div class="doc-id">ID: ${docId}</div>
        <div class="doc-id">${docDate}</div>
        ${log.status === 'closed'
          ? '<div style="margin-top:6px;background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;display:inline-block;">დასრულებული</div>'
          : ''}
      </div>
    </div>

    <div class="doc-title">ალკოტესტერის შემოწმების ჟურნალი</div>
    <div class="doc-sub">Breathalyzer Inspection Log</div>

    <div class="instruction">
      0.00–0.09 = SAFE (სამუშაოდ დაშვებულია) &nbsp;|&nbsp;
      0.10–0.19 = WARNING (ზედამხედველობა) &nbsp;|&nbsp;
      ≥ 0.20 = FAIL (სამუშაოდ დაუშვებელია)
    </div>
  `;

  // ── Table rows ─────────────────────────────────────────────────────────────

  const tableRows = log.entries.map((entry, i) => {
    const isRepeat = entry.testType === 'repeat';
    const timeStr = new Date(entry.time).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });

    const resultClass =
      entry.resultStatus === 'safe' ? 'result-safe' :
      entry.resultStatus === 'warning' ? 'result-warning' : 'result-fail';
    const resultLabel =
      entry.resultStatus === 'safe' ? `SAFE · ${entry.result.toFixed(2)}` :
      entry.resultStatus === 'warning' ? `⚠ ${entry.result.toFixed(2)}` :
      `✗ FAIL · ${entry.result.toFixed(2)}`;

    const typePill = isRepeat
      ? '<span class="type-pill type-repeat">↩ განმეო.</span>'
      : '<span class="type-pill">პირველ.</span>';

    const sigHtml = entry.refusedSignature
      ? '<span class="sig-refused">უარი</span>'
      : entry.signature
        ? `<img class="sig-img" src="data:image/png;base64,${entry.signature}" />`
        : '<span class="sig-refused">-</span>';

    const nameCellClass = isRepeat ? 'repeat-indent' : '';
    const nameContent = isRepeat
      ? `<span class="repeat-label">↩</span> ${escHtml(entry.personName)}`
      : escHtml(entry.personName);

    return `
      <tr>
        <td class="col-num">${i + 1}</td>
        <td class="col-date">${docDate}<br><span style="color:var(--inkFaint)">${timeStr}</span></td>
        <td class="col-name ${nameCellClass}">${nameContent}</td>
        <td class="col-pos">${escHtml(entry.position)}</td>
        <td class="col-type">${typePill}</td>
        <td class="col-res"><span class="result-pill ${resultClass}">${resultLabel}</span></td>
        <td class="col-sig">${sigHtml}</td>
      </tr>`;
  }).join('');

  const emptyRow = log.entries.length === 0
    ? '<tr><td colspan="7" style="text-align:center;color:var(--inkFaint);padding:20px;">ჩანაწერი არ არის</td></tr>'
    : '';

  const tableHtml = `
    <table class="log-table">
      <thead>
        <tr>
          <th class="col-num">№</th>
          <th class="col-date">თარიღი</th>
          <th class="col-name">სახელი / გვარი</th>
          <th class="col-pos">პოზიცია</th>
          <th class="col-type">ტესტ. ტიპი</th>
          <th class="col-res">შედეგი</th>
          <th class="col-sig">ხელმოწერა</th>
        </tr>
      </thead>
      <tbody>${tableRows}${emptyRow}</tbody>
    </table>
  `;

  // ── Summary ────────────────────────────────────────────────────────────────

  const summaryHtml = `
    <div class="summary-block">
      <div class="summary-item">
        <div class="summary-number">${log.entries.length}</div>
        <div class="summary-label">სულ</div>
      </div>
      <div class="summary-item summary-safe">
        <div class="summary-number">${counts.safe}</div>
        <div class="summary-label">SAFE</div>
      </div>
      <div class="summary-item summary-warning">
        <div class="summary-number">${counts.warning}</div>
        <div class="summary-label">WARNING</div>
      </div>
      <div class="summary-item summary-fail">
        <div class="summary-number">${counts.fail}</div>
        <div class="summary-label">FAIL</div>
      </div>
    </div>
  `;

  // ── Responsible person ─────────────────────────────────────────────────────

  const rp = log.responsiblePerson;
  const rpSigHtml = rp.signature
    ? `<img class="responsible-sig" src="data:image/png;base64,${rp.signature}" />`
    : '<div class="sig-line"></div>';

  const responsibleHtml = `
    <div class="responsible-block">
      <div class="responsible-cell">
        <div class="responsible-lbl">პასუხისმგებელი პირი</div>
        <div class="responsible-name">${escHtml(rp.name) || '-'}</div>
      </div>
      <div class="responsible-cell">
        <div class="responsible-lbl">ხელმოწერა</div>
        ${rpSigHtml}
      </div>
    </div>
  `;

  // ── Footer ─────────────────────────────────────────────────────────────────

  const footerHtml = `
    <div class="footer">
      <span>Safety Team · ალკოტესტერის შემოწმების ჟურნალი</span>
      <span>ID: ${docId}</span>
      <span>${docDate}</span>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ალკოტესტერის შემოწმების ჟურნალი</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="page">
    ${headerHtml}
    ${tableHtml}
    ${summaryHtml}
    ${responsibleHtml}
    ${footerHtml}
  </div>
</body>
</html>`;
}
