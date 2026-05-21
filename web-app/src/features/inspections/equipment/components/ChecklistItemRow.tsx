/**
 * One checklist item: numbered label + description, the result pills, an
 * uncontrolled comment field, and the photo uploader. This is the row that was
 * copy-pasted into the bobcat / excavator / cargo-platform checklists. The
 * comment field stays uncontrolled (defaultValue + onBlur) to match the
 * existing save-on-blur behavior.
 */
import { TextInput } from '@mantine/core';
import PhotoUploadWidget from '@/components/PhotoUploadWidget';
import { ResultPills, type ResultOption } from './ResultPills';

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
  return (
    <li className="py-3">
      <div className="text-sm font-medium text-neutral-900">
        {entryId}. {label}
      </div>
      <div className="text-xs text-neutral-600">{description}</div>
      <ResultPills options={options} value={result} disabled={disabled} onSelect={onResult} />
      <TextInput
        disabled={disabled}
        defaultValue={comment ?? ''}
        onBlur={(e) => {
          const v = e.target.value || null;
          if (v !== (comment ?? null)) onComment(v);
        }}
        placeholder="კომენტარი"
        classNames={{ input: 'mt-2 text-xs' }}
        radius="md"
      />
      <PhotoUploadWidget
        paths={photoPaths ?? []}
        disabled={disabled}
        prefix={photoPrefix}
        inspectionId={inspectionId}
        itemId={entryId}
        onAdd={onAddPhoto}
        onRemove={onRemovePhoto}
      />
    </li>
  );
}
