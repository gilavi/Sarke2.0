/**
 * Web-only adapter that drives InspectionWizard for the harness inspection flow.
 *
 * Data mapping:
 *   grid_rows (up to harnessRowCount) → WizardItem  (one per harness)
 *   grid_cols (excluding 'კომენტარი') → Question    (one per check column)
 *   grid_values[row][col] 'ok'/'ვარგისია' → 'yes'
 *   grid_values[row][col] 'bad'/'დაზიანებულია' → 'no'
 *
 * Answers auto-save via onPatchAnswer on every cell change so the web wizard
 * never needs an explicit "save" step between harnesses. The footer's
 * "შენახვა და შემდეგი" still exists for UX but is a no-op (data already saved).
 *
 * Mobile code is untouched — this file is only imported under Platform.OS === 'web'.
 */

import { Platform } from 'react-native';
import { InspectionWizard } from '../../../components/web/InspectionWizard';
import type {
  AnswerValue,
  WizardConfig,
  WizardItem,
} from '../../../components/web/InspectionWizard';
import type { Answer, GridValues, Question } from '../../../types/models';

// ── Value codec ───────────────────────────────────────────────────────────────

function gridToWizard(raw: string | undefined): AnswerValue | undefined {
  if (raw === 'ok' || raw === 'ვარგისია') return 'yes';
  if (raw === 'bad' || raw === 'დაზიანებულია') return 'no';
  return undefined;
}

function wizardToGrid(v: AnswerValue): string {
  if (v === 'yes') return 'ok';
  if (v === 'no') return 'bad';
  return 'na';
}

// ── Data builders ─────────────────────────────────────────────────────────────

/** Derive a WizardItemStatus from whether all/some/no cells in a row are filled. */
function rowStatus(
  row: string,
  colIds: string[],
  answers: Record<string, Answer>,
  gridQuestionId: string,
): WizardItem['status'] {
  const grid = answers[gridQuestionId]?.grid_values ?? {};
  const vals = colIds.map((col) => grid[row]?.[col]);
  const filled = vals.filter(Boolean).length;
  if (filled === 0) return 'pending';
  const hasBad = vals.some((v) => v === 'bad' || v === 'დაზიანებულია');
  if (hasBad) return 'problem';
  if (filled === colIds.length) return 'done';
  return 'in_progress';
}

interface HarnessWebWizardProps {
  projectName: string;
  projectLogo?: string;
  actName?: string;
  harnessName: string;
  /** DB question rows (all questions for this template). */
  questions: Question[];
  answers: Record<string, Answer>;
  harnessRowCount: number;
  /** Called to persist an answer cell change. */
  onPatchAnswer: (q: Question, mutate: (a: Answer) => Answer) => Promise<void>;
  /** Called when user adds a new harness row. */
  onAddRow: () => void;
  /** Called when wizard is dismissed without completing. */
  onClose: () => void;
  /** Called when the user finishes all harnesses and submits. */
  onComplete: () => void;
}

/**
 * Renders the InspectionWizard configured for the harness grid.
 * Returns null on native (guard is also in the caller, but belt-and-suspenders).
 */
export function HarnessWebWizard({
  projectName,
  projectLogo,
  actName = 'ქამრების შემოწმება',
  harnessName,
  questions,
  answers,
  harnessRowCount,
  onPatchAnswer,
  onAddRow,
  onClose,
  onComplete,
}: HarnessWebWizardProps) {
  if (Platform.OS !== 'web') return null;

  // ── Resolve the component_grid question that holds harness rows ──────────────
  const gridQuestion = questions.find(
    (q) => q.type === 'component_grid' && (q.grid_rows?.[0] ?? '') === 'N1',
  );

  const allRows: string[] = gridQuestion?.grid_rows ?? [];
  const rowLabels = allRows.slice(0, Math.min(harnessRowCount, allRows.length));

  // Columns excluding the free-text "კომენტარი" sentinel — each becomes a Question
  const colLabels: string[] = (gridQuestion?.grid_cols ?? []).filter(
    (c) => c !== 'კომენტარი',
  );

  // ── Map cols → wizard Questions ──────────────────────────────────────────────
  const wizardQuestions = colLabels.map((col) => ({
    id: col,
    label: col,
    options: ['yes', 'no'] as AnswerValue[],
    hasComment: true,
  }));

  // ── Map rows → wizard WizardItems ────────────────────────────────────────────
  const gridValues: GridValues = answers[gridQuestion?.id ?? '']?.grid_values ?? {};

  const wizardItems: WizardItem[] = rowLabels.map((row) => {
    const rowAnswers: Record<string, AnswerValue> = {};
    const rowDetails: Record<string, { comment?: string }> = {};

    for (const col of colLabels) {
      const raw = gridValues[row]?.[col];
      const val = gridToWizard(raw);
      if (val) rowAnswers[col] = val;

      const comment = gridValues[row]?.[`კომენტარი_${col}`];
      if (comment) rowDetails[col] = { comment };
    }

    const yesCount = Object.values(rowAnswers).filter((v) => v === 'yes').length;
    const noCount = Object.values(rowAnswers).filter((v) => v === 'no').length;

    return {
      id: row,
      label: `ქამარი ${row}`,
      status: rowStatus(
        row,
        colLabels,
        answers,
        gridQuestion?.id ?? '',
      ),
      answers: rowAnswers,
      details: rowDetails,
      stats: { yes: yesCount, no: noCount },
    };
  });

  // ── Wizard callbacks ──────────────────────────────────────────────────────────

  /**
   * Persist a single cell change immediately.
   * col = wizardQuestion.id, value = wizard AnswerValue, row = wizardItem.id
   */
  async function saveCell(row: string, col: string, value: AnswerValue, comment?: string) {
    if (!gridQuestion) return;
    await onPatchAnswer(gridQuestion, (a) => {
      const grid: GridValues = { ...(a.grid_values ?? {}) };
      grid[row] = { ...(grid[row] ?? {}), [col]: wizardToGrid(value) };
      if (comment !== undefined) {
        grid[row][`კომენტარი_${col}`] = comment;
      }
      return { ...a, grid_values: grid };
    });
  }

  const config: WizardConfig = {
    projectName: harnessName || projectName,
    projectLogo,
    actName,
    itemLabel: 'ქამარი',
    items: wizardItems,
    questions: wizardQuestions,

    onSaveItem: async (item) => {
      // Flush all changed cells for this harness row
      for (const [col, value] of Object.entries(item.answers)) {
        const comment = item.details?.[col]?.comment;
        await saveCell(item.id, col, value as AnswerValue, comment);
      }
    },

    onAddItem: () => {
      const nextRow = allRows[wizardItems.length];
      if (!nextRow || wizardItems.length >= allRows.length) {
        // Already at max rows — return the last row as a no-op
        return wizardItems[wizardItems.length - 1] ?? {
          id: `row-${Date.now()}`,
          label: 'ქამარი',
          status: 'pending',
          answers: {},
        };
      }
      onAddRow();
      return {
        id: nextRow,
        label: `ქამარი ${nextRow}`,
        status: 'pending',
        answers: {},
      };
    },

    onClose,
    onComplete,
  };

  return <InspectionWizard config={config} />;
}
