/**
 * Single-source HTML template for ტვირთის მიმღები პლატფორმის შემოწმების აქტი.
 *
 * Zero platform deps — safe to import from both the Expo app and web-app.
 * Callers are responsible for resolving photo paths to URLs/data-URIs before
 * calling this function; pass them in `photoUrls`.
 *
 * Mobile: uses embedInspectionPhotos() → base64 data URIs (offline-safe for expo-print).
 * Web:    uses signedInspectionPhotoUrl() → HTTPS signed Supabase URLs.
 */

import {
  CP_ITEMS,
  CP_SECTION_LABELS,
  CP_VERDICT_LABEL,
  cpTotalWeight,
  type CargoPlatformInspection,
  type CPResult,
} from '../types/cargoPlatform';

function escHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ka-GE', { year: 'numeric', month: 'long', day: 'numeric' });
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

  /* Platform ID table (2-col: parameter | value) */
  .param-table { width: 100%; border-collapse: collapse; }
  .param-table td { padding: 5px 8px; font-size: 11px; border: 0.5px solid var(--hairline); vertical-align: middle; }
  .param-table td:first-child { width: 52%; color: var(--inkSoft); font-weight: 600; }
  .param-table td:last-child { color: var(--ink); }
  .param-table tr:nth-child(even) td { background: var(--catHdr); }

  /* Cargo table */
  .cargo-table { width: 100%; border-collapse: collapse; }
  .cargo-table th, .cargo-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .cargo-table thead tr { background: var(--catHdr); }
  .cargo-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .cargo-total td { background: var(--catHdr); font-weight: 700; }
  .col-num-sm { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-weight { width: 88px; text-align: right; }

  /* Legend */
  .legend {
    display: flex; gap: 16px; align-items: center;
    padding: 7px 10px; background: var(--catHdr);
    border-radius: 6px; margin-bottom: 8px; flex-wrap: wrap;
  }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: var(--inkSoft); }
  .dot { width: 8px; height: 8px; border-radius: 4px; }
  .dot-good { background: var(--green); }
  .dot-fix  { background: var(--amber); }
  .dot-na   { background: var(--na); border: 1px solid var(--hairline); }

  /* Checklist table */
  .cl-table { width: 100%; border-collapse: collapse; }
  .cl-table th, .cl-table td { border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top; }
  .cl-table thead tr { background: var(--catHdr); }
  .cl-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .cl-cat-row td { background: var(--catHdr); font-weight: 700; font-size: 11px; color: var(--inkSoft); padding: 6px 8px; }
  .col-num { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-result { width: 80px; white-space: nowrap; }
  .col-comment { width: 180px; }
  .item-fix { border-left: 3px solid var(--amberBdr) !important; }
  .item-comment { font-size: 10px; color: var(--inkSoft); font-style: italic; margin-top: 4px; }
  .item-photo { display: inline-block; margin: 4px 4px 0 0; }
  .item-photo img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); }

  /* Result pills */
  .pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 12px; font-size: 10px; font-weight: 600; white-space: nowrap; }
  .pill-good { background: var(--greenSoft); color: #065F46; }
  .pill-fix  { background: var(--amberSoft); color: #92400E; }
  .pill-na   { background: var(--na); color: var(--naText); }
  .pill-null { background: var(--catHdr); color: var(--inkFaint); }

  /* Verdict block */
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

  /* Signatures — two blocks side by side */
  .sig-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
  .sig-block {
    border: 0.5px solid var(--hairline); border-radius: 8px; overflow: hidden;
  }
  .sig-cell { padding: 10px 12px; border-bottom: 0.5px solid var(--hairline); }
  .sig-cell:last-child { border-bottom: none; }
  .sig-lbl { font-size: 10px; font-weight: 700; color: var(--inkSoft); text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .sig-name { font-size: 12px; font-weight: 700; color: var(--ink); }
  .sig-role { font-size: 10px; color: var(--inkSoft); margin-top: 2px; }
  .sig-org  { font-size: 10px; color: var(--inkSoft); }
  .sig-img  { max-height: 48px; max-width: 100%; margin-top: 4px; }
  .sig-line { height: 36px; border-bottom: 1px dashed var(--hairline); margin: 4px 0; }
  .sig-date { font-size: 11px; color: var(--ink); }

  /* Legal note */
  .legal-note {
    margin-top: 16px; font-size: 9px; color: var(--inkFaint);
    text-align: center; line-height: 1.5; font-style: italic;
  }

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

// ── Template ──────────────────────────────────────────────────────────────────

export function buildCargoPlatformPdfTemplate(args: {
  inspection: CargoPlatformInspection;
  projectName?: string;
  /** photo storage path → resolved URL or base64 data URI */
  photoUrls: Record<string, string>;
}): string {
  const { inspection: insp, projectName = 'პროექტი', photoUrls } = args;

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
        <div class="doc-title">ტვირთის მიმღები პლატფორმის<br>შემოწმების აქტი</div>
        <div class="doc-sub">Cargo Receiving Platform — Technical Inspection &amp; Safety Acceptance Act</div>
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
        <td><span class="lbl">სართული / ზონა</span><span class="val">${escHtml(insp.floorZone) || '—'}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">შემოწმების ჩამტარებელი</span><span class="val">${escHtml(insp.inspectorName) || '—'}</span></td>
        <td></td>
      </tr>
    </table>
  `;

  // ── Section II — პლატფორმის იდენტიფიკაცია ──────────────────────────────────

  function binaryLabel(val: string | null, noneLabel: string, completeLabel: string): string {
    if (val === 'none')     return `☑ ${noneLabel} &nbsp; ☐ ${completeLabel}`;
    if (val === 'complete') return `☐ ${noneLabel} &nbsp; ☑ ${completeLabel}`;
    return '—';
  }
  function guardrailHeightLabel(val: string | null): string {
    if (val === 'non_standard') return '☑ ვერ აკმაყოფილებს სტანდარტს &nbsp; ☐ სტანდარტს აკმაყოფილებს';
    if (val === 'standard')     return '☐ ვერ აკმაყოფილებს სტანდარტს &nbsp; ☑ სტანდარტს აკმაყოფილებს';
    return '—';
  }

  const sectionIIHtml = `
    <div class="section-title">II — პლატფორმის იდენტიფიკაცია</div>
    <table class="param-table">
      <tr><td>პლატფორმის ტიპი / მოდელი</td><td>${escHtml(insp.platformTypeModel) || '—'}</td></tr>
      <tr><td>სიგრძე (მ)</td><td>${insp.platformLength != null ? insp.platformLength : '—'}</td></tr>
      <tr><td>სიგანე (მ)</td><td>${insp.platformWidth != null ? insp.platformWidth : '—'}</td></tr>
      <tr><td>ვიზუალური აღწერა / ფერი</td><td>${escHtml(insp.platformColorDesc) || '—'}</td></tr>
      <tr><td>გვერდის დამცავი მოაჯირი</td><td>${binaryLabel(insp.sideGuardrail, 'არ გააჩნია', 'მოაჯირი სრულია')}</td></tr>
      <tr><td>წინა დამცავი მოაჯირი</td><td>${binaryLabel(insp.frontGuardrail, 'არ გააჩნია', 'მოაჯირი სრულია')}</td></tr>
      <tr><td>მოაჯირის სიმაღლე (სტანდ. 90–120 სმ)</td><td>${guardrailHeightLabel(insp.guardrailHeight)}</td></tr>
    </table>
  `;

  // ── Section III — ტვირთის იდენტიფიკაცია ────────────────────────────────────

  const totalKg = cpTotalWeight(insp.cargo);
  const cargoRows = insp.cargo.map((r, idx) => `
    <tr>
      <td class="col-num-sm">${idx + 1}</td>
      <td>${escHtml(r.name) || '—'}</td>
      <td class="col-weight">${r.unit_weight_kg != null ? r.unit_weight_kg : '—'}</td>
      <td class="col-weight">${r.total_weight_kg != null ? r.total_weight_kg : '—'}</td>
      <td>${escHtml(r.note) || ''}</td>
    </tr>
  `).join('');

  const sectionIIIHtml = `
    <div class="section-title">III — ტვირთის იდენტიფიკაცია</div>
    <p style="font-size:10px;color:var(--inkSoft);font-style:italic;margin-bottom:8px;">
      ყველა ტვირთი, რომელიც განთავსდება პლატფორმაზე, ექვემდებარება იდენტიფიკაციას და წინასწარ წონის დადასტურებას
    </p>
    <table class="cargo-table">
      <thead>
        <tr>
          <th class="col-num-sm">#</th>
          <th>დასახელება</th>
          <th class="col-weight">ერთ. წონა კგ</th>
          <th class="col-weight">სრ. წონა კგ</th>
          <th>შენიშვნა</th>
        </tr>
      </thead>
      <tbody>
        ${cargoRows}
        <tr class="cargo-total">
          <td colspan="3" style="text-align:right;">სულ:</td>
          <td class="col-weight">${totalKg} კგ</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `;

  // ── Section IV — შემოწმება ──────────────────────────────────────────────────

  function resultPill(result: CPResult | null): string {
    if (result === 'good') return '<span class="pill pill-good">✓ კარგი</span>';
    if (result === 'fix')  return '<span class="pill pill-fix">✗ გამოსასწ.</span>';
    if (result === 'na')   return '<span class="pill pill-na">— N/A</span>';
    return '<span class="pill pill-null">—</span>';
  }

  let checklistRows = '';
  let currentSection = '';

  for (const entry of CP_ITEMS) {
    if (entry.section !== currentSection) {
      currentSection = entry.section;
      checklistRows += `
        <tr class="cl-cat-row">
          <td colspan="4">${escHtml(CP_SECTION_LABELS[entry.section as keyof typeof CP_SECTION_LABELS])}</td>
        </tr>
      `;
    }

    const state = insp.items.find(i => i.id === entry.id);
    const result = state?.result ?? null;
    const comment = state?.comment ?? null;
    const photos = state?.photo_paths ?? [];
    const isFix = result === 'fix';

    let photoHtml = '';
    for (const p of photos) {
      const src = photoUrls[p];
      if (src) photoHtml += `<span class="item-photo"><img src="${src}" alt="ფოტო" /></span>`;
    }

    checklistRows += `
      <tr${isFix ? ' class="item-fix"' : ''}>
        <td class="col-num">${entry.id}</td>
        <td>
          <strong>${escHtml(entry.label)}</strong><br>
          <span style="color:var(--inkSoft)">${escHtml(entry.description)}</span>
          ${comment ? `<div class="item-comment">${escHtml(comment)}</div>` : ''}
          ${photoHtml ? `<div style="margin-top:4px;">${photoHtml}</div>` : ''}
        </td>
        <td class="col-result">${resultPill(result)}</td>
      </tr>
    `;
  }

  const sectionIVHtml = `
    <div class="section-title">IV — პლატფორმის შემოწმება</div>
    <div class="legend">
      <span class="legend-item"><span class="dot dot-good"></span>✓ კარგი</span>
      <span class="legend-item"><span class="dot dot-fix"></span>✗ გამოსასწორებელი</span>
      <span class="legend-item"><span class="dot dot-na"></span>N/A — არ ვრცელდება</span>
    </div>
    <table class="cl-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th>შემოწმების პუნქტი</th>
          <th class="col-result">შედეგი</th>
        </tr>
      </thead>
      <tbody>${checklistRows}</tbody>
    </table>
  `;

  // ── Section V — დასკვნა ─────────────────────────────────────────────────────

  const vx = (v: string) => insp.verdict === v ? 'selected' : '';
  const vchecked = (v: string) => insp.verdict === v ? 'checked' : '';

  const sectionVHtml = `
    <div class="section-title">V — დასკვნა</div>
    <div class="verdict-block">
      ${(['approved', 'conditional', 'rejected'] as const).map(v => `
        <div class="verdict-option ${vx(v)}">
          <div class="verdict-box ${vchecked(v)}"></div>
          <span class="verdict-label">${escHtml(CP_VERDICT_LABEL[v])}</span>
        </div>
      `).join('')}
    </div>
    <div class="comment-label" style="margin-top:14px;">კომენტარი</div>
    <div class="comment-block">${escHtml(insp.verdictComment) || '&nbsp;'}</div>
  `;

  // ── Section VI — ფოტო მასალა ────────────────────────────────────────────────

  const photoItems = insp.summaryPhotos.map((p, idx) => {
    const src = photoUrls[p];
    if (!src) return '';
    return `
      <div class="photo-item">
        <img src="${src}" alt="ფოტო ${idx + 1}" />
        <div class="photo-caption">ფოტო ${idx + 1}</div>
      </div>
    `;
  }).filter(Boolean).join('');

  const sectionVIHtml = insp.summaryPhotos.length > 0 ? `
    <div class="section-title">VI — ფოტო / ვიდეო მასალა</div>
    <p style="font-size:10px;color:var(--inkSoft);font-style:italic;margin-bottom:8px;">
      დოკუმენტს თან ერთვის ტესტირების ამსახველი ფოტო/ვიდეო მასალა
    </p>
    <div class="photo-grid">${photoItems}</div>
  ` : '';

  // ── Section VII — ხელმოწერები ───────────────────────────────────────────────

  function renderSignatoryBlock(sig: CargoPlatformInspection['signatures'][0], label: string): string {
    const sigImg = sig.signature
      ? `<img class="sig-img" src="data:image/png;base64,${sig.signature}" alt="ხელმოწერა" />`
      : '<div class="sig-line"></div>';
    return `
      <div class="sig-block">
        <div class="sig-cell">
          <div class="sig-lbl">${escHtml(label)}</div>
          <div class="sig-name">${escHtml(sig.name) || '—'}</div>
          <div class="sig-role">${escHtml(sig.position) || ''}</div>
          <div class="sig-org">${escHtml(sig.organization) || ''}</div>
        </div>
        <div class="sig-cell">
          <div class="sig-lbl">ხელმოწერა</div>
          ${sigImg}
        </div>
        <div class="sig-cell">
          <div class="sig-lbl">თარიღი</div>
          <div class="sig-date">${sig.date ? fmtDate(sig.date) : fmtDate(insp.completedAt ?? insp.inspectionDate)}</div>
        </div>
      </div>
    `;
  }

  const sectionVIIHtml = `
    <div class="section-title">VII — ხელმოწერები</div>
    <div class="sig-two-col">
      ${renderSignatoryBlock(insp.signatures[0], 'I ხელმომწერი')}
      ${renderSignatoryBlock(insp.signatures[1], 'II ხელმომწერი')}
    </div>
    <div class="legal-note">
      წინამდებარე შემოწმების აქტი წარმოადგენს სამართლებრივი ძალის მქონე დოკუმენტს.
      ხელმოწერის გარეშე ამ დოკუმენტს იურიდიული ძალა არ გააჩნია.
    </div>
  `;

  // ── Footer ───────────────────────────────────────────────────────────────────

  const footerHtml = `
    <div class="footer">
      <span>Sarke 2.0 — ტვირთის მიმღები პლატფორმის შემოწმების აქტი</span>
      <span>${escHtml(docDate)} · ID ${escHtml(docId)}</span>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ტვირთის მიმღები პლატფორმის შემოწმების აქტი</title>
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
    ${footerHtml}
  </div>
</body>
</html>`;
}
