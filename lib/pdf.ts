import QRCode from 'qrcode';
import type {
  Answer,
  AnswerPhoto,
  Inspection,
  Project,
  Qualification,
  Question,
  SignatureRecord,
  SignerRole,
  Template,
} from '../types/models';
import { SIGNER_ROLE_LABEL } from '../types/models';
import ka from '../locales/ka.json';
import en from '../locales/en.json';

const pdfLocales = { ka, en };

function tPdf(lang: 'ka' | 'en', key: string, vars?: Record<string, string | number>): string | undefined {
  const parts = key.split('.');
  let val: any = pdfLocales[lang];
  for (const p of parts) {
    val = val?.[p];
    if (val === undefined) break;
  }
  if (typeof val !== 'string') return undefined;
  if (!vars) return val;
  return val.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => String(vars[k] ?? ''));
}

/**
 * Qualification row augmented with a base64-encoded image data URL so the
 * HTML/WebView rendering pipeline can embed the proof image without making
 * a network call at render time.
 */
export interface PdfCertificate extends Qualification {
  file_data_url?: string;
}

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
  language?: 'ka' | 'en';
}

export async function buildPdfHtml(args: PdfHtmlArgs): Promise<string> {
  return buildHtml({ ...args, mode: 'pdf' });
}

export async function buildPdfPreviewHtml(args: PdfHtmlArgs): Promise<string> {
  return buildHtml({ ...args, mode: 'preview' });
}

async function buildQrDataUrl(payload: string): Promise<string | null> {
  try {
    // SVG output is pure JS — works in React Native without Canvas.
    const svg = await QRCode.toString(payload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: { dark: '#111827', light: '#FFFFFF' },
    });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch {
    return null;
  }
}

async function buildHtml(
  args: PdfHtmlArgs & { mode: 'pdf' | 'preview' },
): Promise<string> {
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
    language = 'ka',
  } = args;

  const t = (key: string, vars?: Record<string, string | number>) => tPdf(language, key, vars) ?? key;

  const isPdf = mode === 'pdf';
  const isDraft = questionnaire.status !== 'completed';
  const answerFor = (q: Question) => answers.find(a => a.question_id === q.id);
  const dateStr = questionnaire.created_at
    ? new Date(questionnaire.created_at).toLocaleDateString(
        language === 'en' ? 'en-US' : 'ka-GE',
        { year: 'numeric', month: 'long', day: 'numeric' },
      )
    : '—';
  const reportId = questionnaire.id.slice(0, 8).toUpperCase();

  // ── QR code ──
  const expertName =
    signatures.find(s => s.signer_role === 'expert')?.full_name ?? '';
  const qrPayload = JSON.stringify({
    id: questionnaire.id,
    date: questionnaire.created_at ?? null,
    inspector: expertName,
  });
  const qrDataUrl = await buildQrDataUrl(qrPayload);

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
              <span class="section-dash">—</span>
              <span class="section-name">${escapeHtml(String(section))}</span>
            </h2>
          </div>
          <div class="section-body">${items}</div>
        </div>
      `;
    })
    .join('');

  // ── Signatures ──
  const sigHtml = renderSignatures(signatures, language);

  // ── Certificates ──
  const certHtml =
    certificates.length > 0
      ? `
        <div class="section" ${isPdf ? 'style="page-break-before: always;"' : ''}>
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-num">${pad2(sections.length + 1)}</span>
              <span class="section-dash">—</span>
              <span class="section-name">${t('pdf.attachedCerts')}</span>
            </h2>
          </div>
          <div class="cert-grid">
            ${certificates
              .map(
                c => `
              <div class="cert-card">
                <div class="cert-title">${escapeHtml(c.type)}</div>
                ${c.number ? `<div class="cert-meta-row"><span class="cert-meta-label">№</span> ${escapeHtml(c.number)}</div>` : ''}
                ${c.issued_at ? `<div class="cert-meta-row">${t('pdf.certIssued', { date: escapeHtml(c.issued_at) })}</div>` : ''}
                ${c.expires_at ? `<div class="cert-meta-row">${t('pdf.certExpires', { date: escapeHtml(c.expires_at) })}</div>` : ''}
                ${c.file_data_url
                  ? `<div class="cert-img-wrap">
                      <img src="${c.file_data_url}" alt="${escapeHtml(c.type)}" class="cert-img"
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

  // ── Preview banner ──
  const previewBanner = !isPdf
    ? `<div class="preview-banner">${t('pdf.previewBanner')}</div>`
    : '';

  const qrBlock = qrDataUrl
    ? `<img class="qr-img" src="${qrDataUrl}" alt="QR" />`
    : `<div class="qr-placeholder">QR</div>`;

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('pdf.htmlTitle', { templateName: escapeHtml(template.name) })}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --green: #1D9E75;
      --green-dark: #147A4F;
      --green-tint: #E8F5F0;
      --red: #C0433C;
      --red-tint: #FBE8E6;
      --amber: #B45309;
      --amber-bg: #FEF3C7;
      --ink: #111827;
      --ink-soft: #4B5563;
      --gray: #9CA3AF;
      --line: #E5E7EB;
      --bg-soft: #FAFAFA;
      --radius: 10px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans Georgian', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: var(--ink);
      line-height: 1.55;
      background: #ffffff;
      ${isPdf ? 'padding: 32px;' : 'padding: 16px;'}
      font-size: 12px;
      border-top: 3px solid var(--green);
    }

    ${isPdf ? `
    @page {
      margin: 28px 24px 40px 24px;
      @bottom-center {
        content: "${t('pdf.footerText', { systemName: t('pdf.systemName') })}" counter(page) " / " counter(pages);
        font-size: 9px;
        color: var(--gray);
        font-family: 'Noto Sans Georgian', sans-serif;
      }
    }
    ` : ''}

    /* Preview banner */
    .preview-banner {
      background: var(--amber-bg);
      border: 1px solid #F59E0B;
      color: var(--amber);
      padding: 12px 16px;
      border-radius: var(--radius);
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 16px;
    }

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
      gap: 24px;
      padding-bottom: 16px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .header-left { display: flex; align-items: center; gap: 14px; flex: 1; }
    .project-brand-logo {
      width: 60px; height: 60px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }
    .project-brand-initials {
      width: 60px; height: 60px;
      border-radius: 50%;
      background: var(--green-tint);
      color: var(--green);
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
    .qr-img {
      width: 72px; height: 72px;
      display: block;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 2px;
    }
    .qr-placeholder {
      width: 72px; height: 72px;
      display: flex; align-items: center; justify-content: center;
      border: 1px dashed var(--line);
      border-radius: 6px;
      color: var(--gray);
      font-size: 10px;
    }
    .report-id {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 10px;
      color: var(--gray);
      letter-spacing: 0.5px;
    }
    .header-rule {
      border: none;
      border-top: 1px solid var(--line);
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
      font-family: 'SF Mono', 'Menlo', monospace;
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
    .section-header { margin-bottom: 12px; }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--ink);
      border-left: 3px solid var(--green);
      padding-left: 12px;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .section-num {
      font-family: 'SF Mono', 'Menlo', monospace;
      color: var(--green);
      font-weight: 800;
    }
    .section-dash { color: var(--gray); font-weight: 400; }
    .section-name { color: var(--ink); }

    /* ── Question card ── */
    .question-card {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 14px 16px;
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
      height: 160px;
      overflow: hidden;
      background: var(--bg-soft);
    }
    .photo-item img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }
    .photo-caption {
      font-size: 10px;
      color: var(--gray);
      text-align: center;
      padding: 6px 8px;
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
    .data-table thead { background: var(--green); color: #fff; }
    .data-table th {
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      font-size: 11px;
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
      max-width: 120px;
      max-height: 60px;
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
  ${previewBanner}
  ${watermark}

  <div class="report-header">
    <div class="header-left">
      ${renderProjectBrand(project)}
      <div>
        <div class="brand-name">SARKE</div>
        <div class="brand-sub">${t('pdf.systemName')}</div>
      </div>
    </div>
    <div class="header-right">
      ${qrBlock}
      <div class="report-id">${reportId}</div>
    </div>
  </div>
  <hr class="header-rule" />

  <div class="info-card">
    <div class="info-row">
      <span class="info-label">${t('pdf.infoCompany')}</span>
      <span class="info-value">${escapeHtml(project.company_name ?? '—')}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${t('pdf.infoObject')}</span>
      <span class="info-value">${escapeHtml(project.address ?? project.name)}</span>
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
  </div>

  ${statusHero}

  <div class="toc-box">
    <div class="toc-heading">${t('pdf.tocTitle')}</div>
    ${tocItems}
    ${certificates.length > 0 ? `
    <div class="toc-item">
      <span class="toc-num">${pad2(sections.length + 1)}</span>
      <span class="toc-name">${t('pdf.attachedCerts')}</span>
      <span class="toc-count">${certificates.length}</span>
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

  ${certHtml}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function renderQuestion(
  q: Question,
  answer: Answer | undefined,
  photos: AnswerPhoto[] = [],
  isFailed = false,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const comment = answer?.comment
    ? `<div class="question-comment">${t('pdf.commentLabel')}: ${escapeHtml(answer.comment)}</div>`
    : '';
  const notes = answer?.notes
    ? `<div class="question-notes">${t('pdf.notesLabel')}: ${escapeHtml(answer.notes)}</div>`
    : '';
  const gridClass = photos.length === 1 ? 'photo-grid single' : 'photo-grid';
  const photosHtml =
    photos.length > 0
      ? `<div class="photo-section-title">${t('pdf.photosTitle')}</div>
         <div class="${gridClass}">${photos.map(p => renderPhoto(p, isFailed, q.title, t)).join('')}</div>`
      : '';

  const cardClass = `question-card${isFailed ? ' is-failed' : ''}`;

  switch (q.type) {
    case 'yesno': {
      const v = answer?.value_bool;
      const label =
        v === true
          ? `<span class="answer-pill pill-yes">✓ ${t('pdf.yes')}</span>`
          : v === false
            ? `<span class="answer-pill pill-no">✗ ${t('pdf.no')}</span>`
            : '<span class="pill-empty">—</span>';
      return `<div class="${cardClass}">
        <div class="question-title">${escapeHtml(q.title)}</div>
        <div class="question-answer">${label}</div>
        ${comment}${notes}${photosHtml}
      </div>`;
    }
    case 'measure': {
      const v = answer?.value_num;
      return `<div class="${cardClass}">
        <div class="question-title">${escapeHtml(q.title)}</div>
        <div class="question-answer">${v ?? '—'} ${escapeHtml(q.unit ?? '')}</div>
        ${comment}${notes}${photosHtml}
      </div>`;
    }
    case 'freetext':
      return `<div class="${cardClass}">
        <div class="question-title">${escapeHtml(q.title)}</div>
        <div class="question-answer">${escapeHtml(answer?.value_text ?? '—')}</div>
        ${comment}${notes}${photosHtml}
      </div>`;
    case 'photo_upload':
      return `<div class="${cardClass}">
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
          const rowVals = cols.map(col => grid[row]?.[col] ?? '');
          const isProblem = rowVals.some(v => isProblemValue(v));
          const cells = cols
            .map((col, i) => {
              const raw = rowVals[i];
              const status = classifyCell(raw);
              if (status === 'pass') {
                return `<td><span class="cell-status cell-status--pass">${escapeHtml(raw)}</span></td>`;
              }
              if (status === 'fail') {
                return `<td><span class="cell-status cell-status--fail">${escapeHtml(raw)}</span></td>`;
              }
              return `<td>${escapeHtml(raw)}</td>`;
            })
            .join('');
          const trClass = isProblem ? ' class="is-problem"' : '';
          return `<tr${trClass}><th>${escapeHtml(row)}</th>${cells}</tr>`;
        })
        .join('');
      return `<div class="${cardClass}">
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

function isProblemValue(raw: string): boolean {
  const v = (raw ?? '').trim().toLocaleLowerCase('ka-GE');
  if (!v) return false;
  return /(პრობლემ|არა|fail|no|broken|damaged|defect)/i.test(v);
}

function classifyCell(raw: string): 'pass' | 'fail' | null {
  const v = (raw ?? '').trim().toLocaleLowerCase('ka-GE');
  if (!v) return null;
  if (/(პრობლემ|არა|fail|no|broken|damaged|defect)/i.test(v)) return 'fail';
  if (/(კი|ok|pass|yes|good|ok\.|ნორმ)/i.test(v)) return 'pass';
  return null;
}

function renderPhoto(
  photo: AnswerPhoto,
  isFailed: boolean,
  questionTitle: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
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
        <div class="photo-missing">${t('pdf.imageUnavailable')}</div>
      </div>
      <div class="photo-caption">${captionText}</div>
      ${noteCaption}
    </div>`;
  }

  return `<div class="photo-item${isFailed ? ' failed' : ''}">
    <div class="photo-img-wrap">
      <img src="${src}" alt="${t('pdf.photoAlt')}"
        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>${escapeHtml(t('pdf.imageUnavailable'))}</div>';" />
    </div>
    <div class="photo-caption">${captionText}</div>
    ${noteCaption}
  </div>`;
}

function renderSignatures(signatures: SignatureRecord[], lang: 'ka' | 'en'): string {
  const validSig = /^data:image\/\w+;base64,.{32,}$/;
  const renderable = signatures.filter(
    sig =>
      sig.status === 'signed' &&
      !!sig.signature_png_url &&
      validSig.test(sig.signature_png_url),
  );

  const ordered = [
    ...renderable.filter(s => s.signer_role === 'expert'),
    ...renderable.filter(s => s.signer_role !== 'expert'),
  ];

  return ordered
    .map(sig => {
      const role = sig.signer_role;
      const label = role === 'expert'
        ? tPdf(lang, 'pdf.expertLabel') ?? 'Expert'
        : (tPdf(lang, `roles.${role.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}`) ?? SIGNER_ROLE_LABEL[role as SignerRole] ?? role);
      const signedDate = sig.signed_at
        ? new Date(sig.signed_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'ka-GE')
        : '';
      const signedTime = sig.signed_at
        ? new Date(sig.signed_at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'ka-GE', { hour: '2-digit', minute: '2-digit' })
        : '';

      const auditParts: string[] = [];
      if (signedDate) auditParts.push(`<strong>${tPdf(lang, 'pdf.timeLabel')}:</strong> ${signedDate} ${signedTime}`);
      if (sig.latitude != null && sig.longitude != null) {
        auditParts.push(`<strong>${tPdf(lang, 'pdf.locationLabel')}:</strong> ${sig.latitude.toFixed(5)}, ${sig.longitude.toFixed(5)}`);
      }
      if (sig.device_id_hash) {
        auditParts.push(`<strong>${tPdf(lang, 'pdf.deviceLabel')}:</strong> ${sig.device_id_hash.slice(0, 8)}…`);
      }
      if (sig.ip_address) {
        auditParts.push(`<strong>IP:</strong> ${sig.ip_address}`);
      }
      const auditHtml = auditParts.length
        ? `<div class="audit-trail">${auditParts.join(' · ')}</div>`
        : '';

      return `
      <div class="sig-block">
        <div class="sig-name">${escapeHtml(sig.full_name || '—')}</div>
        <div class="sig-role">${escapeHtml(label)}</div>
        ${sig.position ? `<div class="sig-position">${escapeHtml(sig.position)}</div>` : ''}
        <div class="sig-img-box">
          <img src="${sig.signature_png_url}" alt="${tPdf(lang, 'pdf.signatureAlt') ?? 'Signature'}" />
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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function renderProjectBrand(project: Project): string {
  if (project.logo) {
    return `<img class="project-brand-logo" src="${project.logo}" alt="${escapeHtml(project.name)}" />`;
  }
  const trimmed = (project.name ?? '').trim();
  const initials = trimmed
    ? Array.from(trimmed).slice(0, 2).join('').toLocaleUpperCase('ka-GE')
    : '—';
  return `<div class="project-brand-initials">${escapeHtml(initials)}</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
