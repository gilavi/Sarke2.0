/**
 * One checklist item, in the shared wizard-kit look: numbered label + description
 * with the kit SegmentedControl on the right, and - once a result is chosen - an
 * uncontrolled comment field + photo drop zone. Generic over the result enum so
 * each equipment type maps its own values; `tone` drives the selected color.
 *
 * Used by the bobcat / excavator / cargo-platform checklists.
 */
import { Input } from '@/components/ui/input';
import PhotoUploadZone from '@/components/PhotoUploadZone';
import { SegmentedControl } from '@/components/wizard';
import type { ResultOption } from './ResultPills';

interface ChecklistItemRowProps<V extends string> {
  entryId: number;
  label: string;
  description: string;
  options: ResultOption<V>[];
  result: V | null;
  comment: string | null;
  photoPaths: string[];
  disabled?: boolean;
  photoPrefix: string;
  inspectionId: string;
  onResult: (value: V | null) => void;
  onComment: (value: string | null) => void;
  onAddPhoto: (path: string) => void;
  onRemovePhoto: (path: string) => void;
}

export function ChecklistItemRow<V extends string>({
  entryId,
  label,
  description,
  options,
  result,
  comment,
  photoPaths,
  disabled,
  photoPrefix,
  inspectionId,
  onResult,
  onComment,
  onAddPhoto,
  onRemovePhoto,
}: ChecklistItemRowProps<V>) {
  const segOptions = options.map((o) => ({ label: o.label, value: o.value }));
  const showDetails = result !== null || !!comment || (photoPaths?.length ?? 0) > 0;

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingTop: 14, paddingBottom: 14 }}>
      {/* Question text on its own line; the answer control gets the full row width
          below it so multi-word labels (e.g. "მცირე კრიტიკული") never clip. */}
      <div className="flex items-start gap-3">
        <span
          className="font-mono tabular-nums"
          style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: '1.75ch', textAlign: 'right', marginTop: 2 }}
        >
          {entryId}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-neutral-900 dark:text-neutral-100">{label}</div>
          {description && (
            <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {description}
            </div>
          )}
          <div className="mt-2.5">
            <SegmentedControl
              fullWidth
              height={40}
              options={segOptions}
              selected={result}
              onSelect={(v) => { if (!disabled) onResult(v === result ? null : (v as V)); }}
            />
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 space-y-2" style={{ paddingLeft: 'calc(1.75ch + 0.75rem)' }}>
          <Input
            disabled={disabled}
            defaultValue={comment ?? ''}
            onBlur={(e) => {
              const v = e.target.value || null;
              if (v !== (comment ?? null)) onComment(v);
            }}
            placeholder="კომენტარი"
            className="text-xs"
          />
          <PhotoUploadZone
            paths={photoPaths ?? []}
            disabled={disabled}
            prefix={photoPrefix}
            inspectionId={inspectionId}
            itemId={entryId}
            onAdd={onAddPhoto}
            onRemove={onRemovePhoto}
            placeholder="ფოტო არ არის სავალდებულო"
          />
        </div>
      )}
    </div>
  );
}
