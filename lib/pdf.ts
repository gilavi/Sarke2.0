import type {
  Answer,
  Project,
  Question,
  Questionnaire,
  SignatureRecord,
  Template,
} from '../types/models';
import { SIGNER_ROLE_LABEL } from '../types/models';

// Minimal HTML -> PDF. expo-print renders this with the system WebView.
export function buildPdfHtml(args: {
  questionnaire: Questionnaire;
  template: Template;
  project: Project;
  questions: Question[];
  answers: Answer[];
  signatures: SignatureRecord[];
}): string {
  const { questionnaire, template, project, questions, answers, signatures } = args;
  const answerFor = (q: Question) => answers.find(a => a.question_id === q.id);
  const date = new Date(questionnaire.created_at).toLocaleDateString('ka');

  const sections = Array.from(new Set(questions.map(q => q.section))).sort();
  const body = sections
    .map(section => {
      const items = questions
        .filter(q => q.section === section)
        .sort((a, b) => a.order - b.order)
        .map(q => renderQuestion(q, answerFor(q)))
        .join('');
      return `<section>${items}</section>`;
    })
    .join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Noto Sans Georgian", "Helvetica", sans-serif; padding: 28px; color: #1A1A1A; font-size: 12px; }
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
      .sig { border-top: 1px solid #E8E1D4; padding-top: 10px; margin-top: 22px; }
      .sig .line { border-bottom: 1px solid #1A1A1A; margin-top: 30px; width: 260px; height: 2px; }
      .conclusion { padding: 10px; background: #F6F2EA; border-radius: 6px; }
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

    <h2>დასკვნითი ნაწილი</h2>
    <div class="conclusion">${escapeHtml(questionnaire.conclusion_text ?? '—')}</div>
    <p class="${questionnaire.is_safe_for_use === false ? 'bad' : 'ok'}">
      ${questionnaire.is_safe_for_use === false
        ? '✗ არ არის უსაფრთხო ექსპლუატაციისთვის'
        : '✓ უსაფრთხოა ექსპლუატაციისთვის'}
    </p>

    <h2>ხელმოწერები</h2>
    ${(template.required_signer_roles ?? []).map(role => {
      const sig = signatures.find(s => s.signer_role === role);
      return `
      <div class="sig">
        <h3>${SIGNER_ROLE_LABEL[role] ?? role}</h3>
        <p>სახელი გვარი: ${escapeHtml(sig?.full_name ?? '')}<br/>
           ტელ: ${escapeHtml(sig?.phone ?? '')}<br/>
           პოზიცია: ${escapeHtml(sig?.position ?? '')}</p>
        <div class="line"></div>
      </div>`;
    }).join('')}
  </body>
</html>`;
}

function renderQuestion(q: Question, answer: Answer | undefined): string {
  const comment = answer?.comment
    ? `<p class="muted">კომენტარი: ${escapeHtml(answer.comment)}</p>`
    : '';
  switch (q.type) {
    case 'yesno': {
      const v = answer?.value_bool;
      const label = v === true ? '<span class="ok">✓ კი</span>' : v === false ? '<span class="bad">✗ არა</span>' : '—';
      return `<div class="qa"><strong>${escapeHtml(q.title)}</strong><br/>${label}${comment}</div>`;
    }
    case 'measure': {
      const v = answer?.value_num;
      return `<div class="qa"><strong>${escapeHtml(q.title)}</strong><br/>${v ?? '—'} ${escapeHtml(q.unit ?? '')}${comment}</div>`;
    }
    case 'freetext':
      return `<div class="qa"><strong>${escapeHtml(q.title)}</strong><br/>${escapeHtml(answer?.value_text ?? '—')}${comment}</div>`;
    case 'photo_upload':
      return `<div class="qa"><strong>${escapeHtml(q.title)}</strong><br/><em>ფოტოები: მიმაგრებულია აპში.</em>${comment}</div>`;
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
