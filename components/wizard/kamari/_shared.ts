// Shared helpers + constants for the Kamari (ქამარი / harness) inspection
// flow.
//
// Data model: maps onto the existing harness component_grid Answer.grid_values
// shape so the results screen and PDF generation keep working unchanged.
//
//   grid_values['N{i}'][componentCol]            = 'bad' | undefined
//   grid_values['N{i}']['კომენტარი_{col}']       = description
//   answer_photos with caption "row:N{i}:col:{col}" (matches HarnessListFlow)

import type { Answer, Question } from '../../../types/models';

export const BRAND_GREEN = '#1D9E75';
export const COMMENT_PREFIX = 'კომენტარი_';

export function rowKey(i: number) {
  return `N${i}`;
}

export function captionFor(row: string, col: string) {
  return `row:${row}:col:${col}`;
}

export function componentColsFor(question: Question): string[] {
  return (question.grid_cols ?? []).filter(c => c !== 'კომენტარი');
}

export function maxRowsFor(question: Question): number {
  return question.grid_rows?.length ?? 15;
}

export function badCountFor(answer: Answer | undefined, row: string, cols: string[]): number {
  const cells = answer?.grid_values?.[row];
  if (!cells) return 0;
  let n = 0;
  for (const col of cols) if (cells[col] === 'bad') n++;
  return n;
}
