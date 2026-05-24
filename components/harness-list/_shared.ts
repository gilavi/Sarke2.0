// Pure types + helpers for the harness inspection chip-list flow.
//
// Data model is keyed off the existing harness `component_grid` Answer.grid_values
// shape:
//   grid_values['N{i}'][col]                = 'ok' | 'bad' | 'ვარგისია' | 'დაზიანებულია'
//   grid_values['N{i}']['კომენტარი_{col}']  = description string
//   answer_photos with caption `row:N{i}:col:{col}`

import type { Answer, Question } from '../../types/models';

export type HarnessItem = {
  question: Question;
  col: string;
  label: string;
  itemKey: string;
};

export function buildItems(questions: Question[]): HarnessItem[] {
  const out: HarnessItem[] = [];
  const grids = questions.filter(
    q => q.type === 'component_grid' && (q.grid_rows?.[0] ?? '') === 'N1',
  );
  for (const q of grids) {
    for (const col of q.grid_cols ?? []) {
      if (col === 'კომენტარი') continue;
      out.push({ question: q, col, label: col, itemKey: `${q.id}::${col}` });
    }
  }
  return out;
}

export function rowLabelsFor(questions: Question[], harnessRowCount: number): string[] {
  const first = questions.find(
    q => q.type === 'component_grid' && (q.grid_rows?.[0] ?? '') === 'N1',
  );
  const all = first?.grid_rows ?? [];
  return all.slice(0, Math.min(harnessRowCount, all.length));
}

/** Returns 'bad' | 'ok' | undefined (untouched) */
export function cellState(
  answers: Record<string, Answer>,
  item: HarnessItem,
  row: string,
): 'bad' | 'ok' | undefined {
  const v = answers[item.question.id]?.grid_values?.[row]?.[item.col];
  if (v === 'bad' || v === 'დაზიანებულია') return 'bad';
  if (v === 'ok' || v === 'ვარგისია') return 'ok';
  return undefined;
}

export function readComment(answers: Record<string, Answer>, item: HarnessItem, row: string): string {
  return answers[item.question.id]?.grid_values?.[row]?.[`კომენტარი_${item.col}`] ?? '';
}

export function captionFor(row: string, col: string) {
  return `row:${row}:col:${col}`;
}