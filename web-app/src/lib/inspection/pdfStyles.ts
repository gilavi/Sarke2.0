/**
 * Canonical CSS for equipment-inspection PDFs.
 *
 * Web-app mirror of the Expo app's `lib/inspection/pdfStyles.ts` (the `@root`
 * import is banned by eslint). Kept byte-faithful so the web-generated PDF is
 * visually identical to the mobile one. Type-specific classes (result columns,
 * weight tables) live in each schema's `extraCss`, appended after this base.
 */
export const BASE_PDF_CSS = `
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
  .info-table td {
    padding: 6px 8px; font-size: 11px; border: 0.5px solid var(--hairline);
    vertical-align: top; width: 50%;
  }
  .info-table .lbl { color: var(--inkSoft); font-weight: 600; display: block; font-size: 10px; margin-bottom: 2px; }
  .info-table .val { color: var(--ink); font-weight: 400; }

  /* Specs table */
  .specs-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .specs-table th {
    background: var(--catHdr); border: 0.5px solid var(--hairline);
    padding: 5px 8px; font-size: 10px; color: var(--inkSoft);
    text-transform: uppercase; letter-spacing: 0.4px; text-align: left;
  }
  .specs-table td { border: 0.5px solid var(--hairline); padding: 6px 8px; font-size: 11px; color: var(--ink); }

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

  /* Checklist table (base — result columns are type-specific, see extraCss) */
  .cl-table { width: 100%; border-collapse: collapse; }
  .cl-table th, .cl-table td {
    border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top;
  }
  .cl-table thead tr { background: var(--catHdr); }
  .cl-table th {
    font-weight: 700; color: var(--inkSoft); font-size: 10px;
    text-transform: uppercase; letter-spacing: 0.4px; text-align: center;
  }
  .cl-sec-row td {
    background: var(--catHdr); font-weight: 700;
    font-size: 11px; color: var(--inkSoft); padding: 6px 8px; text-align: left;
  }
  .col-num { width: 28px; text-align: center; color: var(--inkFaint); }
  .col-check { width: 44px; text-align: center; }
  .item-comment { font-size: 10px; color: var(--inkSoft); font-style: italic; margin-top: 4px; }
  .item-photo { display: inline-block; margin: 4px 4px 0 0; }
  .item-photo img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); }

  /* Maintenance table */
  .maint-table { width: 100%; border-collapse: collapse; }
  .maint-table th, .maint-table td {
    border: 0.5px solid var(--hairline); padding: 5px 7px; font-size: 11px; vertical-align: top;
  }
  .maint-table thead tr { background: var(--catHdr); }
  .maint-table th { font-weight: 700; color: var(--inkSoft); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; text-align: center; }
  .col-maint-check { width: 56px; text-align: center; }
  .col-maint-date { width: 110px; }

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
    flex-shrink: 0; margin-top: 1px; display: flex; align-items: center; justify-content: center;
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

  /* Summary photos */
  .summary-photos { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .summary-photos img { width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 0.5px solid var(--hairline); }

  /* Signature (grid columns are type-specific, set in extraCss) */
  .sig-block {
    display: grid; gap: 0; margin-top: 8px;
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

  /* ── Unified signatures section (wizard creator + empty hand-sign slots) ── */
  .signatures-section { margin-top: 18px; page-break-inside: avoid; }
  .signatures-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .signatures-heading-text {
    font-size: 12px; font-weight: 700; color: var(--ink);
    text-transform: uppercase; letter-spacing: 0.4px;
  }
  .signatures-heading-rule { flex: 1; height: 1px; background: var(--hairline); }

  .signatures-creator { margin-bottom: 14px; }
  .signatures-creator-img {
    height: 90px;
    display: flex; align-items: center; justify-content: flex-start;
    padding: 2px 0;
  }
  .signatures-creator-img img { max-height: 90px; max-width: 260px; display: block; }
  .signatures-creator-rule { height: 1px; background: var(--ink); margin-bottom: 4px; }
  .signatures-creator-meta { display: flex; align-items: baseline; gap: 10px; }
  .signatures-creator-name { font-size: 12px; font-weight: 700; color: var(--ink); }
  .signatures-creator-date { font-size: 10px; color: var(--inkSoft); }

  .signatures-empty-slot {
    padding: 8px 0;
    border-top: 1px solid var(--hairline);
  }
  .signatures-empty-slot:first-child { border-top: none; }
  .signatures-empty-row {
    display: flex; align-items: flex-end; gap: 8px;
    margin-bottom: 10px;
  }
  .signatures-empty-row:last-child { margin-bottom: 0; }
  .signatures-empty-row-split { gap: 24px; }
  .signatures-empty-half {
    display: flex; align-items: flex-end; gap: 6px; flex: 1;
  }
  .signatures-empty-label {
    font-size: 10px; color: var(--inkSoft); font-weight: 600; white-space: nowrap;
  }
  .signatures-empty-line {
    display: inline-block; border-bottom: 1px solid var(--ink); align-self: flex-end;
  }
  .signatures-empty-line-long { flex: 1; height: 70px; }
  .signatures-empty-line-short { flex: 1; height: 32px; }

  @media print {
    html, body { background: #fff; }
    .page { padding: 0; max-width: none; }
    @page { margin: 18mm 14mm; }
  }
`;
