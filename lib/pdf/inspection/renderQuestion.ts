import type { Answer, AnswerPhoto, Question } from '../../../types/models';
import { escapeHtml } from './_shared';
import { renderPhoto } from './renderPhoto';

function isProblemValue(raw: string): boolean {
  const v = (raw ?? '').trim().toLocaleLowerCase('ka-GE');
  if (!v) return false;
  return /(პრობლემ|აღენიშნება|არა|fail|bad|no|broken|damaged|defect)/i.test(v);
}

function classifyCell(raw: string): 'pass' | 'fail' | 'neutral' | null {
  const v = (raw ?? '').trim().toLocaleLowerCase('ka-GE');
  if (!v) return null;
  if (/(პრობლემ|აღენიშნება|არა|fail|bad|no|broken|damaged|defect)/i.test(v)) return 'fail';
  if (/(კი|ok|pass|yes|good|ok\.|ნორმ|გამართულია)/i.test(v)) return 'pass';
  if (/(არ გააჩნია|^na$|n\/a)/i.test(v)) return 'neutral';
  return null;
}

// Canonical Georgian labels for classified cells. Web stores internal keys
// (ok/bad/na); mobile already stores Georgian. Rendering the canonical label
// makes the printed/PDF act consistently Georgian regardless of source.
function cellLabel(status: 'pass' | 'fail' | 'neutral', raw: string): string {
  if (status === 'pass') return 'კი';
  if (status === 'fail') return 'არა';
  // neutral
  return raw && /კი|ok|pass|yes|good|ok\.|ნორმ|გამართულია|არა|fail|bad|no|broken|damaged|defect/i.test(raw)
    ? raw
    : '—';
}

export function renderQuestion(
  q: Question,
  answer: Answer | undefined,
  photos: AnswerPhoto[] = [],
  isFailed = false,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const comment = answer?.comment
    ? `<div class="question-comment">${t('pdf.commentLabel')}: ${escapeHtml(answer.comment)}</div>`
    : '';
  const notes = (answer as any)?.notes
    ? `<div class="question-notes">${t('pdf.notesLabel')}: ${escapeHtml((answer as any).notes)}</div>`
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
            .map((_col, i) => {
              const raw = rowVals[i];
              const status = classifyCell(raw);
              if (status === 'pass') {
                return `<td><span class="cell-status cell-status--pass">${escapeHtml(cellLabel('pass', raw))}</span></td>`;
              }
              if (status === 'fail') {
                return `<td><span class="cell-status cell-status--fail">${escapeHtml(cellLabel('fail', raw))}</span></td>`;
              }
              if (status === 'neutral') {
                return `<td><span class="cell-status cell-status--neutral">${escapeHtml(cellLabel('neutral', raw))}</span></td>`;
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
