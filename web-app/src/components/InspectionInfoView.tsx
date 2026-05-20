/**
 * InspectionInfoView — read-only (+ editable when draft) summary of an inspection.
 *
 * Renders four card sections:
 *   1. ზოგადი ინფო  — key fields, editable via FieldInput when isDraft
 *   2. ქამრების შედეგები — grid answer table (read-only)
 *   3. შეფასება — safety verdict chip + conclusion text (editable when draft)
 *   4. ფოტოები — conclusion photo grid (signed URLs from answer-photos bucket)
 *
 * Props:
 *   inspection   Full inspection row
 *   isDraft      Whether fields can be edited
 *   answers      Pre-fetched answer list (avoids duplicate fetch)
 *   gridQuestion The component_grid question, or null if not found
 *   onFieldSave  Called with a patch object; caller calls updateInspection
 */
import { useState, useEffect } from 'react';
import { Textarea } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FieldInput from '@/components/FieldInput';
import { signedInspectionPhotoUrl } from '@/lib/photoUpload';
import {
  type Inspection,
  type Answer,
  type Question,
  updateInspection,
} from '@/lib/data/inspections';

interface Props {
  inspection: Inspection;
  isDraft: boolean;
  answers: Answer[];
  gridQuestion: Question | null;
  onFieldSave: (patch: Parameters<typeof updateInspection>[1]) => void;
}

export default function InspectionInfoView({
  inspection,
  isDraft,
  answers,
  gridQuestion,
  onFieldSave,
}: Props) {
  const [isSafe, setIsSafe] = useState<boolean | null>(inspection.is_safe_for_use ?? null);
  const [conclusionText, setConclusionText] = useState(inspection.conclusion_text ?? '');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  // Sync safety/conclusion when inspection reloads
  useEffect(() => {
    setIsSafe(inspection.is_safe_for_use ?? null);
    setConclusionText(inspection.conclusion_text ?? '');
  }, [inspection.id, inspection.is_safe_for_use, inspection.conclusion_text]);

  // Resolve signed photo URLs
  useEffect(() => {
    if (!inspection.conclusion_photo_paths?.length) {
      setPhotoUrls([]);
      return;
    }
    let cancelled = false;
    Promise.all(inspection.conclusion_photo_paths.map((p) => signedInspectionPhotoUrl(p))).then(
      (urls) => { if (!cancelled) setPhotoUrls(urls); },
    );
    return () => { cancelled = true; };
  }, [inspection.conclusion_photo_paths]);

  /* ── Grid data ── */
  const gridAnswer = gridQuestion
    ? answers.find((a) => a.question_id === gridQuestion.id)
    : null;
  const gridValues = gridAnswer?.grid_values ?? {};
  const gridRows = Object.keys(gridValues);
  const gridCols = (gridQuestion?.grid_cols ?? []).filter((c) => c !== 'კომენტარი');

  function statusCell(value: string | undefined) {
    if (value === 'ok')  return <span className="font-semibold text-emerald-600 dark:text-emerald-400">კი</span>;
    if (value === 'bad') return <span className="font-semibold text-red-500 dark:text-red-400">არა</span>;
    return <span className="text-neutral-400">—</span>;
  }

  const safeChipBase =
    'rounded-full border-2 px-5 py-2 text-sm font-semibold transition-all cursor-pointer select-none';

  return (
    <div className="space-y-4">
      {/* ── 1. ზოგადი ინფო ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ზოგადი ინფორმაცია</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {isDraft ? (
            <FieldInput
              label="დასახელება"
              value={inspection.harness_name ?? null}
              disabled={false}
              onSave={(v) => onFieldSave({ harness_name: v })}
            />
          ) : (
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">დასახელება</p>
              <p className="text-sm text-neutral-800 dark:text-neutral-200">{inspection.harness_name ?? '—'}</p>
            </div>
          )}
          {isDraft ? (
            <FieldInput
              label="ინსპექტორი"
              value={inspection.inspector_name ?? null}
              disabled={false}
              onSave={(v) => onFieldSave({ inspector_name: v })}
            />
          ) : (
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">ინსპექტორი</p>
              <p className="text-sm text-neutral-800 dark:text-neutral-200">{inspection.inspector_name ?? '—'}</p>
            </div>
          )}
          {isDraft ? (
            <FieldInput
              label="დეპარტამენტი"
              value={inspection.department ?? null}
              disabled={false}
              onSave={(v) => onFieldSave({ department: v })}
            />
          ) : (
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">დეპარტამენტი</p>
              <p className="text-sm text-neutral-800 dark:text-neutral-200">{inspection.department ?? '—'}</p>
            </div>
          )}
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">შექმნის თარიღი</p>
            <p className="text-sm text-neutral-800 dark:text-neutral-200">
              {new Date(inspection.created_at).toLocaleDateString('ka-GE', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          {inspection.completed_at && (
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">დასრულების თარიღი</p>
              <p className="text-sm text-neutral-800 dark:text-neutral-200">
                {new Date(inspection.completed_at).toLocaleDateString('ka-GE', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 2. შეფასება ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">შეფასება</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Safety chips */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              უსაფრთხოების სტატუსი
            </p>
            {isDraft ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSafe(true)}
                  className={`${safeChipBase} ${
                    isSafe === true
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-emerald-400 dark:border-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  უსაფრთხოა
                </button>
                <button
                  type="button"
                  onClick={() => setIsSafe(false)}
                  className={`${safeChipBase} ${
                    isSafe === false
                      ? 'border-red-500 bg-red-500 text-white'
                      : 'border-neutral-200 text-neutral-600 hover:border-red-400 dark:border-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  არ არის უსაფრთხო
                </button>
              </div>
            ) : (
              <span
                className={[
                  'inline-block rounded-full px-4 py-1.5 text-sm font-semibold',
                  inspection.is_safe_for_use === true
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : inspection.is_safe_for_use === false
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700',
                ].join(' ')}
              >
                {inspection.is_safe_for_use === true
                  ? '✓ უსაფრთხოა'
                  : inspection.is_safe_for_use === false
                  ? '✗ არ არის უსაფრთხო'
                  : '—'}
              </span>
            )}
          </div>

          {/* Conclusion text */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">შენიშვნა</p>
            {isDraft ? (
              <>
                <Textarea
                  value={conclusionText}
                  onChange={(e) => setConclusionText(e.target.value)}
                  placeholder="დასკვნა / შენიშვნა..."
                  rows={3}
                  radius="md"
                />
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onFieldSave({
                        is_safe_for_use: isSafe,
                        conclusion_text: conclusionText.trim() || null,
                      })
                    }
                  >
                    შენახვა
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                {inspection.conclusion_text || <span className="text-neutral-400">—</span>}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── 3. ქამრების შედეგები ── */}
      {gridQuestion && gridRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ქამრების შედეგები</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/60">
                  <th className="px-4 py-2.5 text-left font-medium text-neutral-600 dark:text-neutral-400">
                    ქამარი
                  </th>
                  {gridCols.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2.5 text-center font-medium text-neutral-600 dark:text-neutral-400"
                    >
                      {col}
                    </th>
                  ))}
                  {gridAnswer?.grid_values &&
                    Object.values(gridAnswer.grid_values).some((r) => r['კომენტარი']) && (
                      <th className="px-4 py-2.5 text-left font-medium text-neutral-600 dark:text-neutral-400">
                        კომენტარი
                      </th>
                    )}
                </tr>
              </thead>
              <tbody>
                {gridRows.map((row, i) => {
                  const rowVals = gridValues[row] ?? {};
                  const hasComment = !!rowVals['კომენტარი'];
                  const showCommentCol =
                    gridAnswer?.grid_values &&
                    Object.values(gridAnswer.grid_values).some((r) => r['კომენტარი']);
                  return (
                    <tr
                      key={row}
                      className={[
                        'border-b border-neutral-100 dark:border-neutral-700/60',
                        i % 2 === 1 ? 'bg-neutral-50/50 dark:bg-neutral-800/20' : '',
                      ].join(' ')}
                    >
                      <td className="px-4 py-2.5 font-medium text-neutral-800 dark:text-neutral-200">
                        {row}
                      </td>
                      {gridCols.map((col) => (
                        <td key={col} className="px-4 py-2.5 text-center">
                          {statusCell(rowVals[col])}
                        </td>
                      ))}
                      {showCommentCol && (
                        <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400">
                          {hasComment ? rowVals['კომენტარი'] : ''}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── 4. ფოტოები ── */}
      {photoUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ფოტოები</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {photoUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700"
                >
                  <img
                    src={url}
                    alt={`ფოტო ${i + 1}`}
                    className="aspect-square w-full object-cover transition-opacity hover:opacity-80"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
