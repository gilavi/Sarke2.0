// Generated inspection PDF stylesheet. Extracted from template.ts so the
// HTML structure file is readable. The only dynamic value referenced inside
// the CSS is `isPdf` - when `mode === 'pdf'` we widen body padding and add
// `page-break-inside: avoid` to the structural cards.
//
// Colour/scale tokens live in tokens.css.ts (getInspectionPdfTokens) so the
// brand palette has one greppable owner. Brand/structure is monochrome ink +
// a single orange accent; semantic green/red/amber are reserved for the
// verdict and pass/fail answers.

import { getInspectionPdfTokens } from './tokens.css';

export function getInspectionPdfCss(opts: { isPdf: boolean }): string {
  const { isPdf } = opts;
  return `
    ${getInspectionPdfTokens()}

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      color: var(--ink);
      line-height: 1.55;
      background: #ffffff;
      ${isPdf ? 'padding: 20px;' : 'padding: 16px;'}
      font-size: 11px;
    }

    /* @page margins removed - caused hangs on iOS WKWebView print renderer.
       Body padding (20px) provides sufficient margin instead. */

    /* Watermark */
    .watermark {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 96px;
      color: rgba(180, 180, 180, 0.12);
      font-weight: 800;
      pointer-events: none;
      z-index: 0;
      letter-spacing: 8px;
      white-space: nowrap;
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 12px;
      position: relative;
      z-index: 1;
    }
    .header-brand { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
    .header-titles { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .report-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--ink);
      line-height: 1.25;
    }
    .report-company {
      font-size: 10px;
      font-weight: 600;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .project-brand-logo,
    .project-brand-initials {
      width: 56px; height: 56px;
      border-radius: 50%;
      display: block;
      flex-shrink: 0;
    }
    .project-brand-logo { object-fit: cover; }
    .project-brand-initials {
      background: var(--ink);
      color: #fff;
      font-weight: 700;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-right { flex-shrink: 0; }
    .report-id-chip {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--ink-soft);
      background: var(--bg-soft);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 12px;
      white-space: nowrap;
    }
    /* Ink rule carrying a single orange accent tick at its left edge. The tick
       is a real inline element (.header-rule-tick), not a ::before pseudo —
       the WKWebView print path renders real elements far more reliably. */
    .header-rule {
      position: relative;
      height: 2px;
      background: var(--ink);
      border: none;
      margin: 0 0 20px;
    }
    .header-rule-tick {
      position: absolute;
      top: 0; left: 0;
      width: 48px; height: 2px;
      background: var(--accent);
    }

    /* ── Info block ── */
    .info-card {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
      position: relative;
      z-index: 1;
    }
    .info-row { display: flex; flex-direction: column; gap: 2px; }
    .info-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--gray);
      font-weight: 600;
    }
    .info-value {
      font-size: 13px;
      color: var(--ink);
      font-weight: 600;
    }

    /* ── Hero summary (verdict + conclusion, top of report) ──
       Replaces the old full-bleed .status-hero banner AND the bottom
       .conclusion-card. Neutral card; semantic colour is confined to the
       verdict-coloured left border + verdict value. The single orange accent
       is the conclusion label. border-left (not a flex bar) is used so the
       accent survives the WKWebView print path — same technique the old
       .conclusion-card relied on. */
    .hero-summary {
      background: var(--bg-soft);
      border: 1px solid var(--line);
      border-left: 6px solid var(--gray);
      border-radius: var(--radius-lg);
      padding: 16px 18px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
      ${isPdf ? 'page-break-inside: avoid;' : ''}
    }
    .hero-summary.is-safe       { border-left-color: var(--green); }
    .hero-summary.is-unsafe     { border-left-color: var(--red); }
    .hero-summary.is-caution    { border-left-color: var(--amber); }
    .hero-summary.is-incomplete { border-left-color: var(--gray); }

    .hero-summary-verdict {
      display: flex;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;
    }
    .hero-verdict-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--gray);
    }
    .hero-verdict-value {
      font-size: 18px;
      font-weight: 800;
      line-height: 1.25;
    }
    .hero-summary.is-safe       .hero-verdict-value { color: var(--green-dark); }
    .hero-summary.is-unsafe     .hero-verdict-value { color: var(--red); }
    .hero-summary.is-caution    .hero-verdict-value { color: var(--amber); }
    .hero-summary.is-incomplete .hero-verdict-value { color: var(--ink-soft); }

    .hero-summary-conclusion {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
    }
    .hero-conclusion-label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--accent);
      margin-bottom: 6px;
    }
    .hero-conclusion-text {
      font-size: 13px;
      color: var(--ink);
      line-height: 1.65;
      margin: 0;
    }

    /* ── TOC ── */
    .toc-box {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--bg-soft);
      padding: 16px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .toc-heading {
      font-size: 10px;
      font-weight: 800;
      color: var(--ink);
      text-transform: uppercase;
      letter-spacing: 1px;
      padding-left: 10px;
      border-left: 3px solid var(--accent);
      margin-bottom: 12px;
    }
    .toc-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 7px 0;
      border-bottom: 1px solid var(--line);
    }
    .toc-item:last-child { border-bottom: none; }
    .toc-num {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 12px;
      font-weight: 700;
      color: var(--ink);
      min-width: 22px;
    }
    .toc-name { flex: 1; font-size: 12px; color: var(--ink); font-weight: 600; }
    .toc-count { font-size: 10px; color: var(--gray); font-weight: 600; }

    /* ── Section ── */
    .section {
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }
    .section-header { margin: 8px 0; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      border-left: 3px solid var(--accent);
      padding-left: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-num {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 11px;
      font-weight: 800;
      color: #fff;
      background: var(--ink);
      border-radius: 6px;
      padding: 2px 7px;
      line-height: 1.4;
    }
    .section-name { color: var(--ink); }

    /* ── Question card ── */
    .question-card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 12px 14px;
      margin-bottom: 8px;
      ${isPdf ? 'page-break-inside: avoid;' : ''}
    }
    .question-card.is-failed {
      border-left: 3px solid var(--red);
    }
    .question-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 8px;
    }
    .question-answer { font-size: 12px; color: var(--ink-soft); margin-bottom: 4px; }
    .answer-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.3px;
    }
    .pill-yes { background: var(--green-tint); color: var(--green-dark); }
    .pill-no  { background: var(--red-tint); color: var(--red); }
    .pill-empty { color: var(--gray); font-style: italic; font-size: 12px; }

    .question-comment {
      font-size: 11px;
      color: var(--ink-soft);
      font-style: italic;
      margin: 8px 0 0;
      padding: 8px 10px;
      background: var(--bg-soft);
      border-radius: 6px;
      border-left: 3px solid var(--line);
    }
    .question-notes {
      font-size: 11px;
      color: var(--amber);
      font-style: italic;
      margin: 8px 0 0;
      padding: 8px 10px;
      background: #FFFBEB;
      border-radius: 6px;
      border-left: 3px solid #F59E0B;
    }

    /* ── Photo grid ── */
    .photo-section-title {
      font-size: 10px;
      font-weight: 600;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 12px 0 8px;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 8px;
    }
    .photo-grid.single { grid-template-columns: 1fr; }
    .photo-item {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      background: #fff;
    }
    .photo-img-wrap {
      width: 100%;
      max-height: 200px;
      overflow: hidden;
      background: var(--bg-soft);
    }
    .photo-item img {
      width: 100%;
      max-height: 200px;
      object-fit: cover;
      display: block;
    }
    .photo-caption {
      font-size: 9px;
      color: var(--gray);
      text-align: center;
      padding: 5px 8px;
    }
    .photo-location {
      color: var(--ink-soft);
      font-style: italic;
    }
    .photo-missing {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 160px;
      background: var(--bg-soft);
      font-size: 10px;
      color: var(--gray);
    }

    /* ── Component table ── */
    .table-wrap {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      margin-top: 8px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .data-table thead th { background: var(--bg-subtle); color: var(--ink); }
    .data-table th {
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      font-size: 10px;
    }
    .data-table tbody th {
      background: var(--bg-soft);
      color: var(--ink);
      font-weight: 600;
    }
    .data-table td {
      padding: 8px 10px;
      border-top: 1px solid var(--line);
      color: var(--ink);
    }
    .data-table tbody tr:nth-child(even) td,
    .data-table tbody tr:nth-child(even) th { background: var(--bg-soft); }
    .data-table tbody tr.is-problem td,
    .data-table tbody tr.is-problem th {
      background: var(--red-tint);
      border-left: 3px solid var(--red);
    }
    .cell-status { font-weight: 700; }
    .cell-status--pass { color: var(--green-dark); }
    .cell-status--fail { color: var(--red); }
    .cell-status--neutral { color: var(--gray); }

    /* ── Signatures section (creator capture + empty hand-sign slots) ── */
    .signatures-section {
      position: relative;
      z-index: 1;
      margin-top: 24px;
      ${isPdf ? 'page-break-inside: avoid;' : ''}
    }
    .signatures-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .signatures-heading-text {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
    }
    .signatures-heading-rule { flex: 1; height: 1px; background: var(--line); }

    /* Creator (digital) block */
    .signatures-creator {
      margin-bottom: 18px;
    }
    .signatures-creator-img {
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 4px 0;
    }
    .signatures-creator-img img {
      max-height: 100px;
      max-width: 280px;
      display: block;
    }
    .signatures-creator-rule {
      height: 1px;
      background: var(--ink);
      margin-bottom: 6px;
    }
    .signatures-creator-meta {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .signatures-creator-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
    }
    .signatures-creator-date {
      font-size: 11px;
      color: var(--ink-soft);
    }

    /* Empty hand-sign slots */
    .signatures-empty-slot {
      padding: 10px 0;
      border-top: 1px solid var(--line);
    }
    .signatures-empty-slot:first-child { border-top: none; }
    .signatures-empty-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      margin-bottom: 14px;
    }
    .signatures-empty-row:last-child { margin-bottom: 0; }
    .signatures-empty-row-split { gap: 28px; }
    .signatures-empty-half {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      flex: 1;
    }
    .signatures-empty-label {
      font-size: 11px;
      color: var(--ink-soft);
      font-weight: 600;
      white-space: nowrap;
    }
    .signatures-empty-line {
      display: inline-block;
      border-bottom: 1px solid var(--ink);
      align-self: flex-end;
    }
    .signatures-empty-line-long {
      flex: 1;
      height: 80px;
    }
    .signatures-empty-line-short {
      flex: 1;
      height: 40px;
    }

    .audit-trail {
      font-size: 9px;
      color: var(--gray);
      margin-top: 8px;
      border-top: 1px solid var(--line);
      padding-top: 6px;
      text-align: left;
      line-height: 1.5;
    }
    .audit-trail strong { color: var(--ink-soft); font-weight: 600; }

    /* ── Certificates ── */
    .cert-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .cert-card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 14px;
      ${isPdf ? 'page-break-inside: avoid;' : ''}
    }
    .cert-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      margin: 0 0 6px;
    }
    .cert-meta-row {
      font-size: 11px;
      color: var(--ink-soft);
      margin-bottom: 2px;
    }
    .cert-meta-label { color: var(--gray); font-weight: 600; }
    .cert-img-wrap {
      position: relative;
      margin-top: 10px;
      width: 100%;
      /* padding-top % gives a 16:9 box in every engine; aspect-ratio is not
         honored by the expo-print/WKWebView print path and collapses to 0. */
      padding-top: 56.25%;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--line);
      background: var(--bg-soft);
    }
    .cert-img {
      position: absolute;
      top: 0;
      left: 0;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @media print {
      .question-card, .photo-item, .section, .signatures-section,
      .hero-summary, .cert-card {
        page-break-inside: avoid;
      }
    }
`;
}