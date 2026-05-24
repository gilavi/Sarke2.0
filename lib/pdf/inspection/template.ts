// template.ts — single-source HTML builder for generic inspection PDFs
// (harness, bobcat-generic, etc.). Pure synchronous; zero platform-specific
// deps. Photo URLs/data-URIs must be pre-resolved.

import type {
  Answer,
  AnswerPhoto,
  Inspection,
  InspectionAttachment,
  Project,
  Question,
  SignatureRecord,
  Template,
} from '../../../types/models';
import { escapeHtml, formatDate, pad2, tPdf } from './_shared';
import { renderQuestion } from './renderQuestion';
import { renderPhoto } from './renderPhoto';
import { renderSignatures } from './renderSignatures';
import { renderProjectBrand } from './renderProjectBrand';


/**
 * InspectionAttachment row augmented with a base64-encoded image data URL so
 * the HTML/WebView rendering pipeline can embed the certificate photo without
 * making a network call at render time. When `photo_data_url` is missing the
 * row renders as a text-only card.
 */
export interface PdfAttachment extends InspectionAttachment {
  photo_data_url?: string;
}

/** Args accepted by the shared template function. */
export interface PdfTemplateArgs {
  questionnaire: Inspection;
  template: Template;
  project: Project;
  questions: Question[];
  answers: Answer[];
  signatures: SignatureRecord[];
  photosByAnswer?: Record<string, AnswerPhoto[]>;
  attachments?: PdfAttachment[];
  mode?: 'pdf' | 'preview';
}

/**
 * Build the complete HTML string for an inspection PDF.
 *
 * Synchronous — all photo paths in `photosByAnswer[id][*].storage_path`
 * must already be resolved to renderable URLs (data-URIs for mobile,
 * signed HTTPS URLs for web) before calling this function.
 */
export function buildInspectionPdfTemplate(args: PdfTemplateArgs): string {
  const {
    questionnaire,
    template,
    project,
    questions,
    answers,
    signatures,
    photosByAnswer = {},
    attachments = [],
    mode = 'pdf',
  } = args;

  const t = (key: string, vars?: Record<string, string | number>) => tPdf(key, vars) ?? key;

  const isPdf = mode === 'pdf';
  const isDraft = questionnaire.status !== 'completed';
  const answerFor = (q: Question) => answers.find(a => a.question_id === q.id);
  const dateStr = questionnaire.created_at
    ? new Date(questionnaire.created_at).toLocaleDateString('ka-GE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';
  const reportId = questionnaire.id.slice(0, 8).toUpperCase();

  // ── Inspection location from first photo that has an address ──
  let inspectionLocation: string | null = null;
  outer: for (const photoList of Object.values(photosByAnswer)) {
    for (const p of photoList) {
      const addr = (p as any).address ?? (p.caption?.startsWith('addr:') ? p.caption.slice(5) : null);
      if (addr) { inspectionLocation = addr; break outer; }
    }
  }

  // ── Sections ──
  const sections = Array.from(new Set(questions.map(q => q.section))).sort(
    (a, b) => a - b,
  );

  const tocItems = sections
    .map((section, idx) => {
      const sectionQuestions = questions.filter(q => q.section === section);
      return `<div class="toc-item"><span class="toc-num">${pad2(idx + 1)}</span><span class="toc-name">${escapeHtml(
        String(section),
      )}</span><span class="toc-count">${t('pdf.tocQuestionCount', { count: sectionQuestions.length })}</span></div>`;
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
          return renderQuestion(q, ans, photos, isFailed, t);
        })
        .join('');

      return `
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${pad2(sectionIdx + 1)}</span>
              <span class="section-pipe">|</span>
              <span class="section-name">${escapeHtml(String(section))}</span>
            </h2>
          </div>
          <div class="section-body">${items}</div>
        </div>
      `;
    })
    .join('');

  // ── Signatures ──
  const sigHtml = renderSignatures(signatures);

  // ── Attachments (equipment certs uploaded against this inspection) ──
  const attachmentsHtml =
    attachments.length > 0
      ? `
        <div class="section" ${isPdf ? 'style="page-break-before: always;"' : ''}>
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${pad2(sections.length + 1)}</span>
              <span class="section-pipe">|</span>
              <span class="section-name">${t('pdf.attachedCerts')}</span>
            </h2>
          </div>
          <div class="cert-grid">
            ${attachments
              .map(
                a => `
              <div class="cert-card">
                <div class="cert-title">${escapeHtml(a.cert_type)}</div>
                ${a.cert_number ? `<div class="cert-meta-row"><span class="cert-meta-label">№</span> ${escapeHtml(a.cert_number)}</div>` : ''}
                ${a.photo_data_url
                  ? `<div class="cert-img-wrap">
                      <img src="${a.photo_data_url}" alt="${escapeHtml(a.cert_type)}" class="cert-img"
                        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${escapeHtml(t('pdf.imageUnavailable'))}</div>';" />
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

  // ── Status hero (full-width banner) ──
  const isSafe = questionnaire.is_safe_for_use === true;
  const isUnsafe = questionnaire.is_safe_for_use === false;
  const heroClass = isSafe ? 'hero-pass' : isUnsafe ? 'hero-fail' : 'hero-pending';
  const heroIcon = isSafe ? '✓' : isUnsafe ? '⚠' : '…';
  const heroLabel = isSafe
    ? t('pdf.statusSafe')
    : isUnsafe
      ? t('pdf.statusNotSafe')
      : t('pdf.statusIncomplete');
  const statusHero = `
    <div class="status-hero ${heroClass}">
      <span class="status-hero-icon">${heroIcon}</span>
      <span class="status-hero-text">${heroLabel}</span>
    </div>
  `;

  // Small badge reused inside conclusion card.
  const statusBadge = isUnsafe
    ? `<span class="status-badge status-fail">${t('pdf.statusNotSafe')}</span>`
    : isSafe
      ? `<span class="status-badge status-pass">${t('pdf.statusSafe')}</span>`
      : `<span class="status-badge status-pending">${t('pdf.statusIncomplete')}</span>`;

  // ── Watermark ──
  const watermark = isDraft
    ? `<div class="watermark">${t('pdf.watermarkDraft')}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('pdf.htmlTitle', { templateName: escapeHtml(template.name) })}</title>
  <style>
    :root {
      --green: #1D9E75;
      --green-dark: #147A4F;
      --green-tint: #E8F5F0;
      --red: #DC2626;
      --red-tint: #FCEBEB;
      --amber: #B45309;
      --amber-bg: #FEF3C7;
      --ink: #111827;
      --ink-soft: #4B5563;
      --gray: #9CA3AF;
      --line: #E5E7EB;
      --bg-soft: #FAFAFA;
      --radius: 8px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      color: var(--ink);
      line-height: 1.55;
      background: #ffffff;
      ${isPdf ? 'padding: 20px;' : 'padding: 16px;'}
      font-size: 11px;
    }

    /* @page margins removed — caused hangs on iOS WKWebView print renderer.
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
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      margin-bottom: 0;
      position: relative;
      z-index: 1;
    }
    .header-left { display: flex; align-items: center; gap: 14px; flex: 1; }
    .header-center {
      flex: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 8px;
    }
    .report-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--ink);
      line-height: 1.3;
    }
    .project-brand-logo {
      width: 60px; height: 60px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
    .project-brand-initials {
      width: 60px; height: 60px;
      border-radius: 50%;
      background: var(--green);
      color: #fff;
      font-weight: 700;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-name {
      font-size: 26px;
      font-weight: 800;
      color: var(--green);
      letter-spacing: 1px;
      line-height: 1.1;
    }
    .brand-sub {
      font-size: 9px;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-top: 4px;
    }
    .header-right {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
    }
    .report-id {
      font-family: monospace;
      font-size: 10px;
      color: var(--gray);
      letter-spacing: 0.5px;
    }
    .header-rule {
      border: none;
      border-top: 3px solid var(--green);
      margin: 0 0 20px;
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

    /* ── Status Hero ── */
    .status-hero {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      width: 100%;
      padding: 16px 20px;
      border-radius: var(--radius);
      color: #fff;
      margin-bottom: 16px;
      ${isPdf ? 'page-break-inside: avoid;' : ''}
    }
    .hero-pass { background: var(--green); }
    .hero-fail { background: var(--red); }
    .hero-pending { background: var(--amber); }
    .status-hero-icon {
      font-size: 30px;
      font-weight: 700;
      line-height: 1;
    }
    .status-hero-text {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    /* Inline status badge (used inside conclusion card) */
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.3px;
    }
    .status-pass { background: var(--green-tint); color: var(--green-dark); }
    .status-fail { background: var(--red-tint); color: var(--red); }
    .status-pending { background: var(--amber-bg); color: var(--amber); }

    /* ── TOC ── */
    .toc-box {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .toc-heading {
      font-size: 10px;
      font-weight: 700;
      color: var(--gray);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .toc-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .toc-item:last-child { border-bottom: none; }
    .toc-num {
      font-family: monospace;
      font-size: 12px;
      font-weight: 700;
      color: var(--green);
      min-width: 24px;
    }
    .toc-name { flex: 1; font-size: 12px; color: var(--ink); font-weight: 500; }
    .toc-count { font-size: 10px; color: var(--gray); font-weight: 600; }

    /* ── Section ── */
    .section {
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }
    .section-header { margin-bottom: 4px; margin-top: 8px; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      border-left: 3px solid var(--green);
      padding-left: 10px;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .section-num {
      color: var(--green);
      font-weight: 800;
    }
    .section-pipe { color: var(--green); font-weight: 700; margin: 0 2px; }
    .section-name { color: var(--ink); }

    /* ── Question card ── */
    .question-card {
      background: #fff;
      border: 1px solid #E8E6E0;
      border-radius: var(--radius);
      padding: 12px;
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
      border-radius: 16px;
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
    .data-table thead th { background: #F5F3EE; color: var(--ink); }
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
      border-top: 1px solid #F3F4F6;
      color: var(--ink);
    }
    .data-table tbody tr:nth-child(even) td,
    .data-table tbody tr:nth-child(even) th { background: #FAFAFA; }
    .data-table tbody tr.is-problem td,
    .data-table tbody tr.is-problem th {
      background: var(--red-tint);
      border-left: 3px solid var(--red);
    }
    .cell-status { font-weight: 700; }
    .cell-status--pass { color: var(--green-dark); }
    .cell-status--fail { color: var(--red); }
    .cell-status--neutral { color: var(--gray); }

    /* ── Conclusion ── */
    .conclusion-card {
      background: #fff;
      border: 1px solid var(--line);
      border-left: 4px solid var(--green);
      border-radius: var(--radius);
      padding: 18px 20px;
      margin: 16px 0;
      ${isPdf ? 'page-break-inside: avoid;' : ''}
      position: relative;
      z-index: 1;
    }
    .conclusion-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--green);
      font-weight: 700;
      margin-bottom: 8px;
    }
    .conclusion-text {
      font-size: 14px;
      color: var(--ink);
      line-height: 1.7;
      margin-bottom: 12px;
    }

    /* ── Signatures ── */
    .signatures-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 24px 0 12px;
      position: relative;
      z-index: 1;
    }
    .signatures-header-text {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
    }
    .signatures-header-rule { flex: 1; height: 1px; background: var(--line); }
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      position: relative;
      z-index: 1;
    }
    .sig-block {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 14px;
      ${isPdf ? 'page-break-inside: avoid;' : ''}
    }
    .sig-block.is-expert {
      background: var(--green-tint);
      border-color: var(--green);
    }
    .sig-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 2px;
    }
    .sig-role {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--gray);
      font-weight: 600;
      margin-bottom: 2px;
    }
    .sig-position {
      font-size: 11px;
      color: var(--ink-soft);
      margin-bottom: 10px;
    }
    .sig-img-box {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px;
      background: #fff;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-img-box img {
      max-width: 160px;
      max-height: 80px;
      display: block;
    }
    .sig-date {
      font-size: 10px;
      color: var(--gray);
      margin-top: 8px;
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
      margin-top: 10px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--line);
      aspect-ratio: 16 / 9;
      background: var(--bg-soft);
    }
    .cert-img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    @media print {
      .question-card, .photo-item, .sig-block, .section,
      .conclusion-card, .cert-card, .status-hero {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${watermark}

  <div class="report-header">
    <div class="header-left">
      ${renderProjectBrand(project)}
    </div>
    <div class="header-center">
      <div class="report-title">${escapeHtml(template.name)}</div>
    </div>
    <div class="header-right">
      <div class="report-id">${reportId}</div>
    </div>
  </div>
  <hr class="header-rule" />

  <div class="info-card">
    <div class="info-row">
      <span class="info-label">${t('pdf.infoCompany')}</span>
      <span class="info-value">${escapeHtml(project.company_name)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${t('pdf.infoObject')}</span>
      <span class="info-value">${escapeHtml(project.address ?? '—')}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${t('pdf.metaDate', { date: '' }).replace(/[:：].*/, '').trim() || 'თარიღი'}</span>
      <span class="info-value">${dateStr}</span>
    </div>
    <div class="info-row">
      <span class="info-label">ID</span>
      <span class="info-value" style="font-family:'SF Mono','Menlo',monospace;font-size:12px;">${reportId}</span>
    </div>
    ${template.category === 'harness' ? `
    <div class="info-row" style="grid-column:1 / -1;">
      <span class="info-label">${t('pdf.infoHarness')}</span>
      <span class="info-value">${escapeHtml(questionnaire.harness_name ?? '—')}</span>
    </div>` : ''}
    ${inspectionLocation ? `
    <div class="info-row" style="grid-column:1 / -1;">
      <span class="info-label">📍 ლოკაცია</span>
      <span class="info-value">${escapeHtml(inspectionLocation)}</span>
    </div>` : ''}
  </div>

  ${statusHero}

  <div class="toc-box">
    <div class="toc-heading">${t('pdf.tocTitle')}</div>
    ${tocItems}
    ${attachments.length > 0 ? `
    <div class="toc-item">
      <span class="toc-num">${pad2(sections.length + 1)}</span>
      <span class="toc-name">${t('pdf.attachedCerts')}</span>
      <span class="toc-count">${attachments.length}</span>
    </div>` : ''}
  </div>

  ${body}

  <div class="conclusion-card">
    <div class="conclusion-label">${t('pdf.conclusionTitle')}</div>
    <div class="conclusion-text">${escapeHtml(questionnaire.conclusion_text ?? '—')}</div>
    ${statusBadge}
  </div>

  <div class="signatures-header">
    <span class="signatures-header-text">${t('pdf.signaturesTitle')}</span>
    <div class="signatures-header-rule"></div>
  </div>
  <div class="sig-grid">${sigHtml}</div>

  ${attachmentsHtml}
</body>
</html>`;
}

