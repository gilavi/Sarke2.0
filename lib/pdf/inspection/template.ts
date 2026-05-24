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
import { getInspectionPdfCss } from './template.css';


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
  <style>${getInspectionPdfCss({ isPdf })}</style>
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

