/**
 * One checklist item, in the shared wizard-kit look: numbered label + description
 * with the kit SegmentedControl on the right, and — once a result is chosen — an
 * uncontrolled comment field + photo drop zone. Generic over the result enum so
 * each equipment type maps its own values; `tone` drives the selected color.
 *
 * Used by the bobcat / excavator / cargo-platform checklists.
 */
import { TextInput } from '@mantine/core';
import PhotoUploadZone from '@/components/PhotoUploadZone';
import { SegmentedControl } from '@/components/wizard';
import type { ResultOption, ResultTone } from './ResultPills';

const TONE_BG: Record<ResultTone, string> = {
  good: '#1D9E75',
  warn: '#D97706',
  bad: '#EF4444',
  neutral: '#94A3B8',
};

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
  const segOptions = options.map((o) => ({ label: o.label, value: o.value, selectedBg: TONE_BG[o.tone] }));
  const showDetails = result !== null || !!comment || (photoPaths?.length ?? 0) > 0;

  return (
    <div style={{ borderBottom: '1px solid #F0EFEC', paddingTop: 14, paddingBottom: 14, paddingLeft: 16, paddingRight: 16 }}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {entryId}. {label}
          </div>
          {description && <div className="mt-0.5 text-xs text-neutral-500">{description}</div>}
        </div>
        <div className="shrink-0" style={{ width: 240 }}>
          <SegmentedControl
            fullWidth
            options={segOptions}
            selected={result}
            onSelect={(v) => { if (!disabled) onResult(v === result ? null : (v as V)); }}
          />
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 space-y-2">
          <TextInput
            disabled={disabled}
            defaultValue={comment ?? ''}
            onBlur={(e) => {
              const v = e.target.value || null;
              if (v !== (comment ?? null)) onComment(v);
            }}
            placeholder="კომენტარი"
            classNames={{ input: 'text-xs' }}
            radius="md"
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
