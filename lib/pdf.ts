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
 *
 * Name kept as `PdfCertificate` for backward-compat with existing imports;
 * this represents the expert's professional credential attached to the PDF,
 * not the generated PDF itself (which is now its own `Certificate` entity).
 */
export interface PdfCertificate extends Qualification {
  file_data_url?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFIED INDUSTRIAL PDF TEMPLATE — v3 redesign
// Before: card-based SaaS aesthetic with light gray page background
// After: authoritative, official safety inspection document. Deep slate navy,
//        warm amber accents, crisp white cards, industrial typography.
//        Designed for Georgian construction safety inspectors.
// ─────────────────────────────────────────────────────────────────────────────

// photosByAnswer: answer.id -> array of AnswerPhoto with pre-fetched data URLs in storage_path
export function buildPdfHtml(args: {
  /** Parameter name kept for backward-compat; type is now `Inspection`. */
  questionnaire: Inspection;
  template: Template;
  project: Project;
  questions: Question[];
  answers: Answer[];
  signatures: SignatureRecord[];
  photosByAnswer?: Record<string, AnswerPhoto[]>;
  certificates?: PdfCertificate[];
}): string {
  const {
    questionnaire,
    template,
    project,
    questions,
    answers,
    signatures,
    photosByAnswer = {},
    certificates = [],
  } = args;
  const answerFor = (q: Question) => answers.find(a => a.question_id === q.id);
  const date = new Date(questionnaire.created_at).toLocaleDateString('ka');
  const nowStr =
    new Date().toLocaleDateString('ka') +
    ' ' +
    new Date().toLocaleTimeString('ka', { hour: '2-digit', minute: '2-digit' });

  // Collect overflow photos (7th+ per question) for appendix
  const appendixPhotos: Array<{
    questionTitle: string;
    photos: AnswerPhoto[];
    isFailed: boolean;
  }> = [];

  const sections = Array.from(new Set(questions.map(q => q.section))).sort(
    (a, b) => a - b,
  );

  const body = sections
    .map((section, sectionIndex) => {
      const items = questions
        .filter(q => q.section === section)
        .sort((a, b) => a.order - b.order)
        .map(q => {
          const ans = answerFor(q);
          const photos = ans ? (photosByAnswer[ans.id] ?? []) : [];
          const isFailed = ans?.value_bool === false;
          if (photos.length > 6) {
            appendixPhotos.push({
              questionTitle: q.title,
              photos: photos.slice(6),
              isFailed,
            });
          }
          return renderQuestion(q, ans, photos.slice(0, 6), isFailed);
        })
        .join('');

      return `
      <div class="section-wrap">
        <div class="section-heading">
          <div class="section-number">${sectionIndex + 1}</div>
          <h2 class="section-title">${escapeHtml(String(section))}</h2>
        </div>
        <div class="section-rule"></div>
        ${items}
      </div>`;
    })
    .join('');

  const appendixHtml =
    appendixPhotos.length > 0
      ? `<div class="page-break"></div>
         <div class="section-wrap">
           <div class="section-heading">
             <div class="section-number">${sections.length + 1}</div>
             <h2 class="section-title">დანართი — დამატებითი ფოტოები</h2>
           </div>
           <div class="section-rule"></div>
           ${appendixPhotos
             .map(
               ({ questionTitle, photos, isFailed }) => `
             <div class="qa-card">
               <p class="appendix-sub">${escapeHtml(questionTitle)}</p>
               <div class="photo-grid">${photos.map(p => renderPhoto(p, isFailed, questionTitle)).join('')}</div>
             </div>`,
             )
             .join('')}
         </div>`
      : '';

  const safeStatus =
    questionnaire.is_safe_for_use === false
      ? conclusionBadge('unsafe', 'არ არის უსაფრთხო ექსპლუატაციისთვის')
      : questionnaire.is_safe_for_use === true
        ? conclusionBadge('safe', 'უსაფრთხოა ექსპლუატაციისთვის')
        : conclusionBadge('pending', 'შეფასება დაუსრულებელია');

  const reportId = questionnaire.id.slice(0, 8).toUpperCase();

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      /* ── Page Setup ── */
      @page {
        margin: 24px;
      }

      * { box-sizing: border-box; }

      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        background: #ffffff;
        color: #1e293b;
        font-size: 12px;
        line-height: 1.55;
        margin: 0;
        padding: 24px;
      }

      /* ── Header ── */
      .header-bar {
        background: #0f172a;
        padding: 20px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0 0 24px 0;
        border-radius: 6px;
      }
      .header-brand {
        color: #ffffff;
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        border-bottom: 2px solid #d97706;
        padding-bottom: 4px;
      }
      .header-meta {
        text-align: right;
        color: #cbd5e1;
        font-size: 12px;
        line-height: 1.6;
      }
      .header-meta strong {
        color: #ffffff;
        font-weight: 600;
      }
      .header-gold-line {
        height: 1px;
        background: #d97706;
        margin: 0 0 24px 0;
      }

      /* ── Project Info Card ── */
      .info-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 16px;
        margin-bottom: 24px;
        border-left: 4px solid #d97706;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 24px;
      }
      .info-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .info-row.full {
        grid-column: 1 / -1;
      }
      .info-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #64748b;
        font-weight: 600;
      }
      .info-value {
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
      }

      /* ── Section Heading ── */
      .section-wrap {
        margin-top: 24px;
      }
      .section-heading {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 4px;
      }
      .section-number {
        width: 28px;
        height: 28px;
        background: #0f172a;
        color: #ffffff;
        font-size: 13px;
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
        color: #1e293b;
        margin: 0;
      }
      .section-rule {
        height: 1px;
        background: #e2e8f0;
        margin-bottom: 16px;
      }

      /* ── Question Card ── */
      .qa-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        page-break-inside: avoid;
      }
      .qa-question {
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 10px;
      }
      .qa-answer {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 8px;
      }
      .qa-comment {
        font-size: 11px;
        color: #64748b;
        font-style: italic;
        margin: 6px 0;
        padding: 8px 12px;
        background: #f8fafc;
        border-radius: 6px;
        border-left: 3px solid #e2e8f0;
      }
      .qa-notes {
        font-size: 13px;
        color: #92400e;
        font-style: italic;
        margin: 8px 0 0;
        padding: 12px;
        background: #fffbeb;
        border-radius: 6px;
        border-left: 3px solid #d97706;
      }

      /* ── Status Badges ── */
      .badge {
        display: inline-block;
        padding: 6px 14px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid;
      }
      .badge-pass {
        background: #ecfdf5;
        color: #059669;
        border-color: #a7f3d0;
      }
      .badge-fail {
        background: #fef2f2;
        color: #dc2626;
        border-color: #fecaca;
      }
      .badge-info {
        background: #eff6ff;
        color: #2563eb;
        border-color: #bfdbfe;
      }

      /* ── Conclusion Badge (larger) ── */
      .conclusion-badge {
        display: inline-block;
        padding: 8px 20px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 700;
        border: 1px solid;
        margin-top: 12px;
      }
      .conclusion-safe {
        background: #ecfdf5;
        color: #059669;
        border-color: #059669;
      }
      .conclusion-unsafe {
        background: #fef2f2;
        color: #dc2626;
        border-color: #dc2626;
      }
      .conclusion-pending {
        background: #eff6ff;
        color: #2563eb;
        border-color: #2563eb;
      }

      /* ── Tables ── */
      .table-wrap {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        margin-top: 10px;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .data-table thead {
        background: #0f172a;
        color: #ffffff;
      }
      .data-table th {
        padding: 12px;
        text-align: left;
        font-weight: 600;
        font-size: 12px;
      }
      .data-table td {
        padding: 12px;
        border-top: 1px solid #f1f5f9;
        color: #1e293b;
      }
      .data-table tbody tr:nth-child(even) {
        background: #f8fafc;
      }
      .status-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 6px;
      }
      .status-dot.pass { background: #059669; }
      .status-dot.fail { background: #dc2626; }
      .status-dot.info { background: #2563eb; }

      /* ── Photos ── */
      .photo-section-title {
        font-size: 16px;
        font-weight: 700;
        color: #1e293b;
        margin: 24px 0 12px;
      }
      .photo-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        page-break-inside: avoid;
      }
      .photo-cell {
        width: calc(50% - 6px);
        page-break-inside: avoid;
      }
      .photo-cell.single {
        width: 70%;
        margin: 0 auto;
      }
      .photo-cell .img-wrap {
        width: 100%;
        height: 180px;
        overflow: hidden;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
      }
      .photo-cell img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .photo-cell.failed .img-wrap {
        border: 2px solid #dc2626;
      }
      .photo-caption {
        font-size: 10px;
        color: #64748b;
        text-align: center;
        margin-top: 6px;
      }
      .photo-missing {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 180px;
        background: #f8fafc;
        border-radius: 6px;
        border: 1px dashed #e2e8f0;
        font-size: 11px;
        color: #94a3b8;
        text-align: center;
      }

      /* ── Conclusion Card ── */
      .conclusion-card {
        background: #ffffff;
        border-left: 4px solid #d97706;
        padding: 20px;
        border-radius: 6px;
        margin: 24px 0;
        page-break-inside: avoid;
      }
      .conclusion-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #d97706;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .conclusion-text {
        font-size: 15px;
        color: #1e293b;
        line-height: 1.6;
      }

      /* ── Signatures ── */
      .signatures-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 24px 0 16px;
      }
      .signatures-header-text {
        font-size: 16px;
        font-weight: 700;
        color: #1e293b;
        white-space: nowrap;
      }
      .signatures-header-rule {
        flex: 1;
        height: 1px;
        background: #e2e8f0;
      }
      .sig-grid {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      .sig-card {
        width: calc(50% - 8px);
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        page-break-inside: avoid;
      }
      .sig-role {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #64748b;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .sig-name {
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 8px;
      }
      .sig-box {
        border: 1px dashed #cbd5e1;
        border-radius: 4px;
        padding: 8px;
        text-align: center;
        min-height: 60px;
        background: #f8fafc;
      }
      .sig-box img {
        max-width: 100%;
        max-height: 70px;
        display: block;
        margin: 0 auto;
      }
      .sig-date {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 8px;
      }

      /* ── Certificates ── */
      .cert-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        page-break-inside: avoid;
      }
      .cert-title {
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 6px;
      }
      .cert-meta {
        font-size: 11px;
        color: #64748b;
        margin-bottom: 8px;
      }
      .cert-img-wrap {
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }
      .cert-img {
        display: block;
        width: 100%;
        max-height: 400px;
        object-fit: contain;
      }

      /* ── Appendix ── */
      .appendix-sub {
        font-weight: 600;
        font-size: 12px;
        color: #1e293b;
        margin: 0 0 8px;
      }

      /* ── Utilities ── */
      .page-break { page-break-before: always; }
      .muted { color: #64748b; }

      @media print {
        .qa-card { page-break-inside: avoid; }
        .photo-grid { page-break-inside: avoid; }
        .photo-cell { page-break-inside: avoid; }
        .sig-card { page-break-inside: avoid; }
        .conclusion-card { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <!-- Header Bar -->
    <div class="header-bar">
      <div class="header-brand">SARKE</div>
      <div class="header-meta">
        <div><strong>რეპორტის ID:</strong> ${reportId}</div>
        <div><strong>თარიღი:</strong> ${date}</div>
      </div>
    </div>
    <div class="header-gold-line"></div>

    <!-- Project Info Card -->
    <div class="info-card">
      <div class="info-grid">
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
          <span class="info-label">შემოწმების ტიპი</span>
          <span class="info-value">${escapeHtml(template.name)}</span>
        </div>
      </div>
    </div>

    <!-- Inspection Sections -->
    ${body}

    ${appendixHtml}

    <!-- Conclusion -->
    <div class="conclusion-card">
      <div class="conclusion-label">დასკვნა</div>
      <div class="conclusion-text">${escapeHtml(questionnaire.conclusion_text ?? '—')}</div>
      ${safeStatus}
    </div>

    <!-- Signatures -->
    <div class="signatures-header">
      <span class="signatures-header-text">ხელმოწერები</span>
      <div class="signatures-header-rule"></div>
    </div>
    <div class="sig-grid">
      ${renderSignatureBlocks(signatures, template.required_signer_roles ?? [])}
    </div>

    <!-- Certificates -->
    ${certificates.length > 0 ? `
    <div class="page-break"></div>
    <div class="section-wrap">
      <div class="section-heading">
        <div class="section-number">${sections.length + (appendixPhotos.length > 0 ? 2 : 1)}</div>
        <h2 class="section-title">თანდართული სერტიფიკატები</h2>
      </div>
      <div class="section-rule"></div>
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
                <img
                  src="${c.file_data_url}"
                  alt="${escapeHtml(c.type)}"
                  class="cert-img"
                  onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>სურათი მიუწვდომელია</div>';"
                />
              </div>`
            : ''}
        </div>
      `,
        )
        .join('')}
    </div>` : ''}

    <!-- Footer -->
    <div class="footer">
      <span>Sarke 2.0</span>
      <span>გენერირებული რეპორტი</span>
      <span>${nowStr}</span>
    </div>
  </body>
</html>`;
}

function statusBadge(type: 'pass' | 'fail' | 'info', text: string): string {
  return `<span class="badge badge-${type}">${escapeHtml(text)}</span>`;
}

function conclusionBadge(
  type: 'safe' | 'unsafe' | 'pending',
  text: string,
): string {
  const prefix = type === 'safe' ? '✓ ' : type === 'unsafe' ? '✕ ' : '● ';
  return `<span class="conclusion-badge conclusion-${type}">${prefix}${escapeHtml(text)}</span>`;
}

function renderPhoto(
  photo: AnswerPhoto,
  isFailed: boolean,
  questionTitle: string,
): string {
  const titlePart = escapeHtml(questionTitle.slice(0, 50));
  const timePart = photo.created_at ? formatDate(photo.created_at) : '';
  const captionText = timePart
    ? `${titlePart} — ${timePart}`
    : titlePart;
  const captionPrefix = isFailed ? '⚠ ' : '';
  const isInternalCaption = photo.caption?.startsWith('row:') ?? false;
  const noteCaption =
    photo.caption && !isInternalCaption
      ? `<div class="photo-caption${isFailed ? ' caption-failed' : ''}">${escapeHtml(photo.caption)}</div>`
      : '';

  const src = photo.storage_path;
  const isDataUrl = src.startsWith('data:');
  const isLocalFile = /^(file|content|ph|asset):\/\//.test(src);

  if (!isDataUrl && !isLocalFile) {
    return `<div class="photo-cell${isFailed ? ' failed' : ''}">
      <div class="img-wrap">
        <div class="photo-missing">სურათი მიუწვდომელია</div>
      </div>
      <div class="photo-caption">${captionPrefix}${captionText}</div>
      ${noteCaption}
    </div>`;
  }

  return `<div class="photo-cell${isFailed ? ' failed' : ''}">
    <div class="img-wrap">
      <img
        src="${src}"
        alt="ფოტო"
        onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'photo-missing\\'>სურათი მიუწვდომელია</div>';"
      />
    </div>
    <div class="photo-caption">${captionPrefix}${captionText}</div>
    ${noteCaption}
  </div>`;
}

function renderQuestion(
  q: Question,
  answer: Answer | undefined,
  inlinePhotos: AnswerPhoto[] = [],
  isFailed = false,
): string {
  const comment = answer?.comment
    ? `<div class="qa-comment">კომენტარი: ${escapeHtml(answer.comment)}</div>`
    : '';
  const notes = answer?.notes
    ? `<div class="qa-notes">შენიშვნა: ${escapeHtml(answer.notes)}</div>`
    : '';
  const photosHtml =
    inlinePhotos.length > 0
      ? `<div class="photo-section-title">📷 ფოტო მასალა</div>
         <div class="photo-grid">${inlinePhotos.map(p => renderPhoto(p, isFailed, q.title)).join('')}</div>`
      : '';

  switch (q.type) {
    case 'yesno': {
      const v = answer?.value_bool;
      const label =
        v === true
          ? statusBadge('pass', 'კი')
          : v === false
            ? statusBadge('fail', 'არა')
            : '<span class="muted">—</span>';
      return `<div class="qa-card">
        <div class="qa-question">${escapeHtml(q.title)}</div>
        <div class="qa-answer">${label}</div>
        ${comment}${notes}${photosHtml}
      </div>`;
    }
    case 'measure': {
      const v = answer?.value_num;
      return `<div class="qa-card">
        <div class="qa-question">${escapeHtml(q.title)}</div>
        <div class="qa-answer">${v ?? '—'} ${escapeHtml(q.unit ?? '')}</div>
        ${comment}${notes}${photosHtml}
      </div>`;
    }
    case 'freetext':
      return `<div class="qa-card">
        <div class="qa-question">${escapeHtml(q.title)}</div>
        <div class="qa-answer">${escapeHtml(answer?.value_text ?? '—')}</div>
        ${comment}${notes}${photosHtml}
      </div>`;
    case 'photo_upload':
      return `<div class="qa-card">
        <div class="qa-question">${escapeHtml(q.title)}</div>
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
      return `<div class="qa-card">
        <div class="qa-question">${escapeHtml(q.title)}</div>
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

/**
 * Build the signature section: 2-col grid, expert first, then every other
 * signed record in the given order. Only blocks with a non-empty inline
 * `data:` URL are emitted — empty/broken signatures are skipped entirely
 * so the PDF never shows a placeholder or a broken-image icon.
 */
function renderSignatureBlocks(
  signatures: SignatureRecord[],
  _requiredRoles: SignatureRecord['signer_role'][],
): string {
  const renderable = signatures.filter(
    sig =>
      sig.status === 'signed' &&
      sig.signature_png_url &&
      sig.signature_png_url.startsWith('data:image/') &&
      sig.signature_png_url.length > 'data:image/png;base64,'.length + 32,
  );
  // Expert first; rest preserve incoming order.
  const ordered = [
    ...renderable.filter(s => s.signer_role === 'expert'),
    ...renderable.filter(s => s.signer_role !== 'expert'),
  ];

  return ordered
    .map(sig => {
      const role = sig.signer_role;
      const label =
        role === 'expert' ? 'ექსპერტი' : SIGNER_ROLE_LABEL[role] ?? role;
      const signedDate = sig.signed_at
        ? new Date(sig.signed_at).toLocaleDateString('ka')
        : '';
      return `
      <div class="sig-card">
        <div class="sig-role">${escapeHtml(label)}</div>
        <div class="sig-name">${escapeHtml(sig.full_name || '—')}</div>
        <div class="sig-box">
          <img src="${sig.signature_png_url}" alt="ხელმოწერა" />
        </div>
        ${signedDate ? `<div class="sig-date">${escapeHtml(signedDate)}</div>` : ''}
      </div>`;
    })
    .join('');
}
