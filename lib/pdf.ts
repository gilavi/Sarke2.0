import type {
  Answer,
  AnswerPhoto,
  Certificate,
  Project,
  Question,
  Questionnaire,
  SignatureRecord,
  Template,
} from '../types/models';
import { SIGNER_ROLE_LABEL } from '../types/models';

export interface PdfCertificate extends Certificate {
  file_data_url?: string;
}

// photosByAnswer: answer.id -> array of AnswerPhoto with pre-fetched data URLs in storage_path
export function buildPdfHtml(args: {
  questionnaire: Questionnaire;
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

  // Collect overflow photos (7th+ per question) for appendix
  const appendixPhotos: Array<{ questionTitle: string; photos: AnswerPhoto[]; isFailed: boolean }> = [];

  const sections = Array.from(new Set(questions.map(q => q.section))).sort();
  const body = sections
    .map(section => {
      const items = questions
        .filter(q => q.section === section)
        .sort((a, b) => a.order - b.order)
        .map(q => {
          const ans = answerFor(q);
          const photos = ans ? (photosByAnswer[ans.id] ?? []) : [];
          const isFailed = ans?.value_bool === false;
          if (photos.length > 6) {
            appendixPhotos.push({ questionTitle: q.title, photos: photos.slice(6), isFailed });
          }
          return renderQuestion(q, ans, photos.slice(0, 6), isFailed);
        })
        .join('');
      return `<section>${items}</section>`;
    })
    .join('');

  const appendixHtml = appendixPhotos.length > 0
    ? `<div class="page-break"></div>
       <h2>დანართი — დამატებითი ფოტოები</h2>
       ${appendixPhotos.map(({ questionTitle, photos, isFailed }) => `
         <div class="qa appendix-group">
           <p class="appendix-sub">${escapeHtml(questionTitle)}</p>
           <div class="photo-grid">${photos.map(p => renderPhoto(p, isFailed, questionTitle)).join('')}</div>
         </div>`).join('')}`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      body { font-family: "Noto Sans Georgian", -apple-system, BlinkMacSystemFont, "Helvetica", sans-serif; padding: 28px; color: #1A1A1A; font-size: 12px; }
      h1 { font-size: 20px; margin: 0 0 6px; }
      h2 { font-size: 14px; margin: 14px 0 6px; }
      h3 { font-size: 13px; margin: 8px 0 4px; }
      .meta { border: 1px solid #E8E1D4; border-collapse: collapse; width: 100%; margin: 12px 0; }
      .meta td { border: 1px solid #E8E1D4; padding: 6px 10px; }
      .meta td.key { background: #F6F2EA; font-weight: 600; width: 28%; }
      .qa { margin: 8px 0; }
      .grid { border: 1px solid #E8E1D4; border-collapse: collapse; width: 100%; margin: 8px 0; }
      .grid th, .grid td { border: 1px solid #E8E1D4; padding: 5px 8px; font-size: 11px; }
      .grid th { background: #F6F2EA; }
      .muted { color: #4A4A4A; }
      .ok { color: #147A4F; font-weight: 600; }
      .bad { color: #C0433C; font-weight: 600; }
      .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 10px; }
      .sig-block {
        page-break-inside: avoid;
        background: #FFFFFF;
        border: 1px solid #E8E1D4;
        border-radius: 6px;
        padding: 10px 12px;
      }
      .sig-block h3 { margin: 0 0 2px; font-size: 12px; letter-spacing: 0.3px; text-transform: uppercase; color: #4A4A4A; font-weight: 600; }
      .sig-block .name { margin: 0; font-size: 14px; font-weight: 700; color: #1A1A1A; }
      .sig-block .sub { margin: 2px 0 0; font-size: 10px; color: #4A4A4A; }
      .sig-block .line { border-bottom: 1px solid #1A1A1A; height: 2px; margin-top: 42px; }
      .sig-block img.sig-img { display: block; max-width: 180px; max-height: 80px; margin: 8px 0 4px; }
      .sig-block.not-present { background: #F6F2EA; }
      .sig-block.not-present .placeholder { color: #4A4A4A; font-size: 11px; font-style: italic; margin-top: 4px; }
      .conclusion { padding: 10px; background: #F6F2EA; border-radius: 6px; }
      .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
      .photo-cell { display: flex; flex-direction: column; gap: 4px; }
      .photo-cell img { width: 100%; height: 160px; object-fit: cover; border-radius: 4px; border: 2px solid #E8E1D4; }
      .photo-cell.failed img { border-color: #C0433C; }
      .photo-caption { font-size: 10px; color: #4A4A4A; }
      .page-break { page-break-before: always; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(template.name)}</h1>
    <table class="meta">
      <tr><td class="key">კომპანია</td><td>${escapeHtml(project.company_name ?? '')}</td></tr>
      <tr><td class="key">ობიექტი</td><td>${escapeHtml(project.address ?? project.name)}</td></tr>
      ${template.category === 'harness' ? `<tr><td class="key">ღვედის დასახელება</td><td>${escapeHtml(questionnaire.harness_name ?? '')}</td></tr>` : ''}
      <tr><td class="key">თარიღი</td><td>${date}</td></tr>
    </table>

    ${body}

    ${appendixHtml}

    <h2>დასკვნითი ნაწილი</h2>
    <div class="conclusion">${escapeHtml(questionnaire.conclusion_text ?? '—')}</div>
    <p class="${questionnaire.is_safe_for_use === false ? 'bad' : 'ok'}">
      ${questionnaire.is_safe_for_use === false
        ? '✗ არ არის უსაფრთხო ექსპლუატაციისთვის'
        : '✓ უსაფრთხოა ექსპლუატაციისთვის'}
    </p>

    <h2>ხელმოწერები</h2>
    <div class="sig-grid">
    ${renderSignatureBlocks(signatures, template.required_signer_roles ?? [])}
    </div>

    ${certificates.length > 0 ? `
    <div class="page-break"></div>
    <h2>თანდართული სერტიფიკატები</h2>
    ${certificates.map(c => `
      <div class="qa">
        <h3>${escapeHtml(c.type)}</h3>
        <p class="muted">
          ${c.number ? `№ ${escapeHtml(c.number)}<br/>` : ''}
          ${c.issued_at ? `გაცემის თარიღი: ${escapeHtml(c.issued_at)}<br/>` : ''}
          ${c.expires_at ? `ვადა: ${escapeHtml(c.expires_at)}` : ''}
        </p>
        ${c.file_data_url
          ? `<img src="${c.file_data_url}" alt="${escapeHtml(c.type)}" style="max-width: 100%; margin-top: 8px; border: 1px solid #E8E1D4; border-radius: 4px;" />`
          : ''}
      </div>
    `).join('')}
    ` : ''}
  </body>
</html>`;
}

function renderPhoto(photo: AnswerPhoto, isFailed: boolean, questionTitle: string): string {
  const titlePart = escapeHtml(questionTitle.slice(0, 50));
  const timePart = photo.created_at ? formatDate(photo.created_at) : '';
  const captionText = timePart ? `${titlePart} — ${timePart}` : titlePart;
  const captionPrefix = isFailed ? '⚠ ' : '';
  const noteCaption = photo.caption ? `<div class="photo-caption muted">${escapeHtml(photo.caption)}</div>` : '';
  return `<div class="photo-cell${isFailed ? ' failed' : ''}">
    <img
      src="${photo.storage_path}"
      alt="ფოტო"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
    />
    <div class="photo-missing" style="display:none;">სურათი მიუწვდომელია</div>
    <div class="photo-caption${isFailed ? ' caption-failed' : ''}">${captionPrefix}${captionText}</div>
    ${noteCaption}
  </div>`;
}

function renderQuestion(q: Question, answer: Answer | undefined, inlinePhotos: AnswerPhoto[] = [], isFailed = false): string {
  const comment = answer?.comment
    ? `<p class="muted">კომენტარი: ${escapeHtml(answer.comment)}</p>`
    : '';
  const photosHtml = inlinePhotos.length > 0
    ? `<div class="photo-grid">${inlinePhotos.map(p => renderPhoto(p, isFailed, q.title)).join('')}</div>`
    : '';
  switch (q.type) {
    case 'yesno': {
      const v = answer?.value_bool;
      const label = v === true ? '<span class="ok">✓ კი</span>' : v === false ? '<span class="bad">✗ არა</span>' : '—';
      return `<div class="qa"><strong>${escapeHtml(q.title)}</strong><br/>${label}${comment}${photosHtml}</div>`;
    }
    case 'measure': {
      const v = answer?.value_num;
      return `<div class="qa"><strong>${escapeHtml(q.title)}</strong><br/>${v ?? '—'} ${escapeHtml(q.unit ?? '')}${comment}${photosHtml}</div>`;
    }
    case 'freetext':
      return `<div class="qa"><strong>${escapeHtml(q.title)}</strong><br/>${escapeHtml(answer?.value_text ?? '—')}${comment}${photosHtml}</div>`;
    case 'photo_upload':
      return `<div class="qa"><strong>${escapeHtml(q.title)}</strong>${photosHtml}${comment}</div>`;
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
      return `<div class="qa"><strong>${escapeHtml(q.title)}</strong>
        <table class="grid"><tr><th></th>${head}</tr>${body}</table>${comment}</div>`;
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
 * Build the signature section: 2-col grid, expert first, then each required
 * role. For signed rows we inline the PNG; for not_present rows we render
 * a line + "(არ იყო დამსწრე)"; for missing (never addressed) rows we show
 * an empty signature line with the role label only.
 */
function renderSignatureBlocks(
  signatures: SignatureRecord[],
  requiredRoles: SignatureRecord['signer_role'][],
): string {
  // Expert always first when present
  const expertSig = signatures.find(s => s.signer_role === 'expert');
  const hasExpertInRoles = requiredRoles.includes('expert');
  const orderedRoles: SignatureRecord['signer_role'][] = hasExpertInRoles
    ? ['expert', ...requiredRoles.filter(r => r !== 'expert')]
    : expertSig
      ? ['expert', ...requiredRoles]
      : requiredRoles;

  return orderedRoles
    .map(role => {
      const sig = signatures.find(s => s.signer_role === role);
      const label = role === 'expert' ? 'ექსპერტი' : SIGNER_ROLE_LABEL[role] ?? role;

      if (sig?.status === 'signed' && sig.signature_png_url) {
        return `
      <div class="sig-block">
        <h3>${escapeHtml(label)}</h3>
        <p class="name">${escapeHtml(sig.full_name || '—')}</p>
        ${sig.position ? `<p class="sub">${escapeHtml(sig.position)}</p>` : ''}
        <img class="sig-img" src="${sig.signature_png_url}" alt="ხელმოწერა" />
        ${sig.signed_at ? `<p class="sub">${escapeHtml(new Date(sig.signed_at).toLocaleDateString('ka'))}</p>` : ''}
      </div>`;
      }

      if (sig?.status === 'not_present') {
        const name = sig.full_name || sig.person_name || label;
        return `
      <div class="sig-block not-present">
        <h3>${escapeHtml(label)}</h3>
        <p class="name">${escapeHtml(name)}</p>
        <div class="line"></div>
        <p class="placeholder">(არ იყო დამსწრე)</p>
      </div>`;
      }

      // No record at all — empty line
      return `
      <div class="sig-block">
        <h3>${escapeHtml(label)}</h3>
        <p class="name">${escapeHtml(label)}</p>
        <div class="line"></div>
        <p class="sub">&nbsp;</p>
      </div>`;
    })
    .join('');
}
