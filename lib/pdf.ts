import type {
  Answer,
  AnswerPhoto,
  Inspection,
  Project,
  Qualification,
  Question,
  SignatureRecord,
  Template,
} from '../types/models';
import { SIGNER_ROLE_LABEL } from '../types/models';

/**
 * Qualification row augmented with a base64-encoded image data URL so the
 * HTML/WebView rendering pipeline can embed the proof image without making
 * a network call at render time.
 */
export interface PdfCertificate extends Qualification {
  file_data_url?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFESSIONAL PDF TEMPLATE ENGINE — Phase 5
// Award-worthy construction safety inspection report for Georgian market.
// ─────────────────────────────────────────────────────────────────────────────

/** Shared args for both PDF generation and preview. */
export interface PdfHtmlArgs {
  questionnaire: Inspection;
  template: Template;
  project: Project;
  questions: Question[];
  answers: Answer[];
  signatures: SignatureRecord[];
  photosByAnswer?: Record<string, AnswerPhoto[]>;
  certificates?: PdfCertificate[];
}

// ═════════════════════════════════════════════════════════════════════════════
// BUILD PDF HTML (for printing / sharing)
// ═════════════════════════════════════════════════════════════════════════════

export function buildPdfHtml(args: PdfHtmlArgs): string {
  return buildHtml({ ...args, mode: 'pdf' });
}

// ═════════════════════════════════════════════════════════════════════════════
// BUILD PDF PREVIEW HTML (for WebView — no page breaks, PREVIEW banner)
// ═════════════════════════════════════════════════════════════════════════════

export function buildPdfPreviewHtml(args: PdfHtmlArgs): string {
  return buildHtml({ ...args, mode: 'preview' });
}

// ═════════════════════════════════════════════════════════════════════════════
// CORE HTML BUILDER
// ═════════════════════════════════════════════════════════════════════════════

function buildHtml(
  args: PdfHtmlArgs & { mode: 'pdf' | 'preview' },
): string {
  const {
    questionnaire,
    template,
    project,
    questions,
    answers,
    signatures,
    photosByAnswer = {},
    certificates = [],
    mode,
  } = args;

  const isPdf = mode === 'pdf';
  const isDraft = questionnaire.status !== 'completed';
  const answerFor = (q: Question) => answers.find(a => a.question_id === q.id);
  const dateStr = new Date(questionnaire.created_at).toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const reportId = questionnaire.id.slice(0, 8).toUpperCase();

  // ── Sections ──
  const sections = Array.from(new Set(questions.map(q => q.section))).sort(
    (a, b) => a - b,
  );

  const tocItems = sections
    .map((section, idx) => {
      const sectionQuestions = questions.filter(q => q.section === section);
      return `<div class="toc-item"><span class="toc-num">${idx + 1}</span><span class="toc-title">${escapeHtml(
        String(section),
      )}</span><span class="toc-count">${sectionQuestions.length} კითხვა</span></div>`;
    })
    .join('');

  const body = sections
    .map((section, sectionIdx) => {
      const items = questions
        .filter(q => q.section === section)
        .sort((a, b) => a.order - b.order)
        .map(q => {
          const ans = answerFor(q);
          const photos = ans ? (photosByAnswer[ans.id] ?? []) : [];
          const isFailed = ans?.value_bool === false;
          return renderQuestion(q, ans, photos, isFailed);
        })
        .join('');

      return `
        <div class="section" ${isPdf ? 'style="page-break-inside: avoid;"' : ''}>
          <div class="section-header">
            <div class="section-number">${sectionIdx + 1}</div>
            <h2 class="section-title">${escapeHtml(String(section))}</h2>
          </div>
          <div class="section-body">${items}</div>
        </div>
      `;
    })
    .join('');

  // ── Signatures ──
  const sigHtml = renderSignatures(signatures);

  // ── Certificates ──
  const certHtml =
    certificates.length > 0
      ? `
        <div class="section" ${isPdf ? 'style="page-break-before: always;"' : ''}>
          <div class="section-header">
            <div class="section-number">${sections.length + 1}</div>
            <h2 class="section-title">თანდართული სერტიფიკატები</h2>
          </div>
          <div class="section-body">
            ${certificates
              .map(
                c => `
              <div class="cert-card">
                <div class="cert-title">${escapeHtml(c.type)}</div>
                <div class="cert-meta">
                  ${c.number ? `№ ${escapeHtml(c.number)} · ` : ''}
                  ${c.issued_at ? `გაცემა: ${escapeHtml(c.issued_at)} · ` : ''}
                  ${c.expires_at ? `ვადა: ${escapeHtml(c.expires_at)}` : ''}
                </div>
                ${c.file_data_url
                  ? `<div class="cert-img-wrap">
                      <img src="${c.file_data_url}" alt="${escapeHtml(c.type)}" class="cert-img"
                        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>სურათი მიუწვდომელია</div>';" />
                    </div>`
                  : ''}
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      `
      : '';

  // ── Status badge ──
  const statusBadge =
    questionnaire.is_safe_for_use === false
      ? `<span class="status-badge status-fail">✗ არ არის უსაფრთხო ექსპლუატაციისთვის</span>`
      : questionnaire.is_safe_for_use === true
        ? `<span class="status-badge status-pass">✓ უსაფრთხოა ექსპლუატაციისთვის</span>`
        : `<span class="status-badge status-pending">● შეფასება დაუსრულებელია</span>`;

  // ── Watermark ──
  const watermark = isDraft
    ? `<div class="watermark">დრაფტი / DRAFT</div>`
    : '';

  // ── Preview banner ──
  const previewBanner = !isPdf
    ? `<div class="preview-banner">👁 PREVIEW — ეს არის PDF-ის პრევიუ. საბოლოო ვერსია შეიძლება განსხვავდებოდეს.</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sarke — ${escapeHtml(template.name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* ── Reset & Base ── */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans Georgian', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      line-height: 1.65;
      background: #ffffff;
      ${isPdf ? 'padding: 32px;' : 'padding: 16px;'}
      font-size: 13px;
    }

    /* ── Page Setup (PDF only) ── */
    ${isPdf ? `
    @page {
      margin: 28px 24px 40px 24px;
      @bottom-center {
        content: "Sarke 2.0 · შრომის უსაფრთხოების ექსპერტული სისტემა · გვერდი " counter(page) " / " counter(pages);
        font-size: 9px;
        color: #9ca3af;
        font-family: 'Noto Sans Georgian', sans-serif;
      }
    }
    ` : ''}

    /* ── Preview Banner ── */
    .preview-banner {
      background: #FEF3C7;
      border: 2px dashed #F59E0B;
      color: #92400E;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 24px;
    }

    /* ── Watermark ── */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 96px;
      color: rgba(180, 180, 180, 0.12);
      font-weight: 700;
      pointer-events: none;
      z-index: 0;
      letter-spacing: 8px;
      white-space: nowrap;
    }

    /* ── Report Header ── */
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 3px solid #147A4F;
      padding-bottom: 24px;
      margin-bottom: 28px;
      position: relative;
      z-index: 1;
    }
    .report-header-left {
      flex: 1;
    }
    .report-logo {
      font-size: 28px;
      font-weight: 700;
      color: #147A4F;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .report-logo-sub {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 600;
    }
    .report-header-right {
      text-align: right;
    }
    .report-meta-row {
      font-size: 12px;
      color: #4b5563;
      margin-bottom: 4px;
    }
    .report-meta-row strong {
      color: #1f2937;
      font-weight: 600;
    }
    .report-id {
      font-family: 'SF Mono', monospace;
      font-size: 11px;
      color: #9ca3af;
      letter-spacing: 0.5px;
      margin-top: 6px;
    }
    .qr-placeholder {
      width: 72px;
      height: 72px;
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #9ca3af;
      text-align: center;
      margin-left: 16px;
    }

    /* ── Info Card ── */
    .info-card {
      background: #F9FAF8;
      border: 1px solid #E8E1D4;
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 28px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 24px;
      position: relative;
      z-index: 1;
    }
    .info-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .info-row.full { grid-column: 1 / -1; }
    .info-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #9ca3af;
      font-weight: 600;
    }
    .info-value {
      font-size: 14px;
      color: #1f2937;
      font-weight: 600;
    }

    /* ── Status Badge ── */
    .status-badge {
      display: inline-block;
      padding: 8px 18px;
      border-radius: 24px;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.3px;
      margin: 16px 0 4px;
    }
    .status-pass {
      background: #E8F5F0;
      color: #147A4F;
      border: 1px solid #A7F3D0;
    }
    .status-fail {
      background: #FBE8E6;
      color: #C0433C;
      border: 1px solid #FECACA;
    }
    .status-pending {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }

    /* ── Table of Contents ── */
    .toc-box {
      background: #FAFAF8;
      border: 1px solid #E8E1D4;
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 28px;
      position: relative;
      z-index: 1;
    }
    .toc-title {
      font-size: 14px;
      font-weight: 700;
      color: #147A4F;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .toc-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .toc-item:last-child { border-bottom: none; }
    .toc-num {
      width: 24px;
      height: 24px;
      background: #147A4F;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .toc-title { flex: 1; font-size: 13px; color: #1f2937; font-weight: 500; }
    .toc-count { font-size: 11px; color: #9ca3af; font-weight: 600; }

    /* ── Section ── */
    .section {
      margin-bottom: 28px;
      position: relative;
      z-index: 1;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .section-number {
      width: 32px;
      height: 32px;
      background: #147A4F;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #147A4F;
      border-left: 4px solid #147A4F;
      padding-left: 12px;
    }

    /* ── Question Card ── */
    .question-card {
      background: #FAFAF8;
      border: 1px solid #E8E1D4;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      ${isPdf ? 'page-break-inside: avoid;' : ''}
    }
    .question-title {
      font-size: 14px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .question-answer {
      font-size: 13px;
      color: #4b5563;
      margin-bottom: 6px;
    }
    .question-comment {
      font-size: 12px;
      color: #6b7280;
      font-style: italic;
      margin: 6px 0;
      padding: 8px 12px;
      background: #f3f4f6;
      border-radius: 8px;
      border-left: 3px solid #d1d5db;
    }
    .question-notes {
      font-size: 12px;
      color: #92400e;
      font-style: italic;
      margin: 6px 0 0;
      padding: 10px 12px;
      background: #fffbeb;
      border-radius: 8px;
      border-left: 3px solid #f59e0b;
    }

    /* ── Photo Grid ── */
    .photo-section-title {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 14px 0 8px;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 8px;
    }
    .photo-item {
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      border: 1px solid #e5e7eb;
    }
    .photo-img-wrap {
      width: 100%;
      height: 160px;
      overflow: hidden;
      background: #f9fafb;
    }
    .photo-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .photo-caption {
      font-size: 10px;
      color: #6b7280;
      text-align: center;
      padding: 8px 10px;
      background: #f9fafb;
      min-height: 30px;
    }
    .photo-missing {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 160px;
      background: #f9fafb;
      font-size: 11px;
      color: #9ca3af;
    }

    /* ── Table ── */
    .table-wrap {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 10px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .data-table thead {
      background: #147A4F;
      color: #fff;
    }
    .data-table th {
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
    }
    .data-table td {
      padding: 10px 12px;
      border-top: 1px solid #f3f4f6;
      color: #1f2937;
    }
    .data-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    /* ── Conclusion ── */
    .conclusion-card {
      background: #fff;
      border-left: 4px solid #147A4F;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      ${isPdf ? 'page-break-inside: avoid;' : ''}
      position: relative;
      z-index: 1;
    }
    .conclusion-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #147A4F;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .conclusion-text {
      font-size: 15px;
      color: #1f2937;
      line-height: 1.7;
    }

    /* ── Signatures ── */
    .signatures-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 28px 0 16px;
      position: relative;
      z-index: 1;
    }
    .signatures-header-text {
      font-size: 16px;
      font-weight: 700;
      color: #1f2937;
      white-space: nowrap;
    }
    .signatures-header-rule {
      flex: 1;
      height: 1px;
      background: #e5e7eb;
    }
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      position: relative;
      z-index: 1;
    }
    .sig-block {
      background: #fff;
      border: 2px solid #E8E1D4;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      ${isPdf ? 'page-break-inside: avoid;' : ''}
    }
    .sig-role {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .sig-name {
      font-size: 15px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 2px;
    }
    .sig-position {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 10px;
    }
    .sig-img-box {
      border: 1px dashed #d1d5db;
      border-radius: 8px;
      padding: 10px;
      background: #fafafa;
      min-height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-img-box img {
      max-width: 100%;
      max-height: 70px;
      display: block;
    }
    .sig-date {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 8px;
    }

    /* ── Audit Trail ── */
    .audit-trail {
      font-size: 9px;
      color: #9ca3af;
      margin-top: 8px;
      border-top: 1px dashed #e5e7eb;
      padding-top: 6px;
      text-align: left;
      line-height: 1.5;
    }
    .audit-trail strong {
      color: #6b7280;
      font-weight: 600;
    }

    /* ── Certificates ── */
    .cert-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 10px;
      ${isPdf ? 'page-break-inside: avoid;' : ''}
    }
    .cert-title {
      font-size: 14px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 4px;
    }
    .cert-meta {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 6px;
    }
    .cert-img-wrap {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .cert-img {
      display: block;
      width: 100%;
      max-height: 360px;
      object-fit: contain;
    }

    /* ── Print helpers ── */
    @media print {
      .question-card { page-break-inside: avoid; }
      .photo-item { page-break-inside: avoid; }
      .sig-block { page-break-inside: avoid; }
      .section { page-break-inside: avoid; }
      .conclusion-card { page-break-inside: avoid; }
      .cert-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${previewBanner}
  ${watermark}

  <!-- Report Header -->
  <div class="report-header">
    <div class="report-header-left">
      <div class="report-logo">SARKE</div>
      <div class="report-logo-sub">შრომის უსაფრთხოების ექსპერტული სისტემა</div>
    </div>
    <div style="display:flex;align-items:center;">
      <div class="report-header-right">
        <div class="report-meta-row"><strong>${escapeHtml(template.name)}</strong></div>
        <div class="report-meta-row">თარიღი: ${dateStr}</div>
        <div class="report-meta-row">ობიექტი: ${escapeHtml(project.name)}</div>
        <div class="report-id">ID: ${reportId}</div>
      </div>
      <div class="qr-placeholder">QR<br/>CODE</div>
    </div>
  </div>

  <!-- Info Card -->
  <div class="info-card">
    <div class="info-row">
      <span class="info-label">კომპანია</span>
      <span class="info-value">${escapeHtml(project.company_name ?? '—')}</span>
    </div>
    <div class="info-row">
      <span class="info-label">ობიექტი</span>
      <span class="info-value">${escapeHtml(project.address ?? project.name)}</span>
    </div>
    ${template.category === 'harness' ? `
    <div class="info-row">
      <span class="info-label">ღვედის დასახელება</span>
      <span class="info-value">${escapeHtml(questionnaire.harness_name ?? '—')}</span>
    </div>` : ''}
    <div class="info-row">
      <span class="info-label">სტატუსი</span>
      <span class="info-value">${statusBadge}</span>
    </div>
  </div>

  <!-- Table of Contents -->
  <div class="toc-box">
    <div class="toc-title">შინაარსი</div>
    ${tocItems}
    ${certificates.length > 0 ? `
    <div class="toc-item">
      <span class="toc-num">${sections.length + 1}</span>
      <span class="toc-title">თანდართული სერტიფიკატები</span>
      <span class="toc-count">${certificates.length}</span>
    </div>` : ''}
  </div>

  <!-- Inspection Sections -->
  ${body}

  <!-- Conclusion -->
  <div class="conclusion-card">
    <div class="conclusion-label">დასკვნა</div>
    <div class="conclusion-text">${escapeHtml(questionnaire.conclusion_text ?? '—')}</div>
    ${statusBadge}
  </div>

  <!-- Signatures -->
  <div class="signatures-header">
    <span class="signatures-header-text">ხელმოწერები</span>
    <div class="signatures-header-rule"></div>
  </div>
  <div class="sig-grid">${sigHtml}</div>

  <!-- Certificates -->
  ${certHtml}
</body>
</html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// RENDER HELPERS
// ═════════════════════════════════════════════════════════════════════════════

function renderQuestion(
  q: Question,
  answer: Answer | undefined,
  photos: AnswerPhoto[] = [],
  isFailed = false,
): string {
  const comment = answer?.comment
    ? `<div class="question-comment">კომენტარი: ${escapeHtml(answer.comment)}</div>`
    : '';
  const notes = answer?.notes
    ? `<div class="question-notes">შენიშვნა: ${escapeHtml(answer.notes)}</div>`
    : '';
  const photosHtml =
    photos.length > 0
      ? `<div class="photo-section-title">📷 ფოტო მასალა</div>
         <div class="photo-grid">${photos.map(p => renderPhoto(p, isFailed, q.title)).join('')}</div>`
      : '';

  switch (q.type) {
    case 'yesno': {
      const v = answer?.value_bool;
      const label =
        v === true
          ? `<span class="status-badge status-pass" style="margin:0 0 8px 0;">✓ კი</span>`
          : v === false
            ? `<span class="status-badge status-fail" style="margin:0 0 8px 0;">✗ არა</span>`
            : '<span style="color:#9ca3af;font-style:italic;">—</span>';
      return `<div class="question-card">
        <div class="question-title">${escapeHtml(q.title)}</div>
        <div class="question-answer">${label}</div>
        ${comment}${notes}${photosHtml}
      </div>`;
    }
    case 'measure': {
      const v = answer?.value_num;
      return `<div class="question-card">
        <div class="question-title">${escapeHtml(q.title)}</div>
        <div class="question-answer">${v ?? '—'} ${escapeHtml(q.unit ?? '')}</div>
        ${comment}${notes}${photosHtml}
      </div>`;
    }
    case 'freetext':
      return `<div class="question-card">
        <div class="question-title">${escapeHtml(q.title)}</div>
        <div class="question-answer">${escapeHtml(answer?.value_text ?? '—')}</div>
        ${comment}${notes}${photosHtml}
      </div>`;
    case 'photo_upload':
      return `<div class="question-card">
        <div class="question-title">${escapeHtml(q.title)}</div>
        ${photosHtml}${comment}${notes}
      </div>`;
    case 'component_grid': {
      const rows = q.grid_rows ?? [];
      const cols = q.grid_cols ?? [];
      const grid = answer?.grid_values ?? {};
      const head = cols.map(c => `<th>${escapeHtml(c)}</th>`).join('');
      const body = rows
        .map(row => {
          const cells = cols
            .map(col => `<td>${escapeHtml(grid[row]?.[col] ?? '')}</td>`)
            .join('');
          return `<tr><th>${escapeHtml(row)}</th>${cells}</tr>`;
        })
        .join('');
      return `<div class="question-card">
        <div class="question-title">${escapeHtml(q.title)}</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th></th>${head}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
        ${comment}${notes}${photosHtml}
      </div>`;
    }
    default:
      return '';
  }
}

function renderPhoto(
  photo: AnswerPhoto,
  isFailed: boolean,
  questionTitle: string,
): string {
  const titlePart = escapeHtml(questionTitle.slice(0, 50));
  const timePart = photo.created_at ? formatDate(photo.created_at) : '';
  const captionText = timePart ? `${titlePart} — ${timePart}` : titlePart;
  const isInternalCaption = photo.caption?.startsWith('row:') ?? false;
  const noteCaption =
    photo.caption && !isInternalCaption
      ? `<div class="photo-caption">${escapeHtml(photo.caption)}</div>`
      : '';

  const src = photo.storage_path;
  const isDataUrl = src.startsWith('data:');
  const isLocalFile = /^(file|content|ph|asset):\/\//.test(src);

  if (!isDataUrl && !isLocalFile) {
    return `<div class="photo-item${isFailed ? ' failed' : ''}">
      <div class="photo-img-wrap">
        <div class="photo-missing">სურათი მიუწვდომელია</div>
      </div>
      <div class="photo-caption">${captionText}</div>
      ${noteCaption}
    </div>`;
  }

  return `<div class="photo-item${isFailed ? ' failed' : ''}">
    <div class="photo-img-wrap">
      <img src="${src}" alt="ფოტო"
        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>სურათი მიუწვდომელია</div>';" />
    </div>
    <div class="photo-caption">${captionText}</div>
    ${noteCaption}
  </div>`;
}

function renderSignatures(signatures: SignatureRecord[]): string {
  const renderable = signatures.filter(
    sig =>
      sig.status === 'signed' &&
      sig.signature_png_url &&
      sig.signature_png_url.startsWith('data:image/') &&
      sig.signature_png_url.length > 'data:image/png;base64,'.length + 32,
  );

  const ordered = [
    ...renderable.filter(s => s.signer_role === 'expert'),
    ...renderable.filter(s => s.signer_role !== 'expert'),
  ];

  return ordered
    .map(sig => {
      const role = sig.signer_role;
      const label = role === 'expert' ? 'ექსპერტი' : SIGNER_ROLE_LABEL[role] ?? role;
      const signedDate = sig.signed_at
        ? new Date(sig.signed_at).toLocaleDateString('ka-GE')
        : '';
      const signedTime = sig.signed_at
        ? new Date(sig.signed_at).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })
        : '';

      // Audit trail
      const auditParts: string[] = [];
      if (signedDate) auditParts.push(`<strong>დრო:</strong> ${signedDate} ${signedTime}`);
      if (sig.latitude != null && sig.longitude != null) {
        auditParts.push(`<strong>ლოკაცია:</strong> ${sig.latitude.toFixed(5)}, ${sig.longitude.toFixed(5)}`);
      }
      if (sig.device_id_hash) {
        auditParts.push(`<strong>მოწყობილობა:</strong> ${sig.device_id_hash.slice(0, 8)}…`);
      }
      if (sig.ip_address) {
        auditParts.push(`<strong>IP:</strong> ${sig.ip_address}`);
      }
      const auditHtml = auditParts.length
        ? `<div class="audit-trail">${auditParts.join(' · ')}</div>`
        : '';

      return `
      <div class="sig-block">
        <div class="sig-role">${escapeHtml(label)}</div>
        <div class="sig-name">${escapeHtml(sig.full_name || '—')}</div>
        ${sig.position ? `<div class="sig-position">${escapeHtml(sig.position)}</div>` : ''}
        <div class="sig-img-box">
          <img src="${sig.signature_png_url}" alt="ხელმოწერა" />
        </div>
        ${signedDate ? `<div class="sig-date">${escapeHtml(signedDate)}</div>` : ''}
        ${auditHtml}
      </div>`;
    })
    .join('');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
