/**
 * Spec/info step for the structured wizard. In create mode it shows the project
 * picker bound to local form state; in edit mode it shows the row's spec fields
 * (saved on blur, locked once completed). The field set is descriptor-driven.
 */
import FieldInput from '@/components/FieldInput';
import { ProjectPicker } from '@/components/ui/project-picker';
import type { Project } from '@/lib/data/projects';
import type { WizardSpecField } from '../types';

interface Props<T, P> {
  fields: WizardSpecField<T, P>[];
  /** Create mode: project picker + local spec state. */
  isNew: boolean;
  model: T | null;
  disabled: boolean;
  onSave: (patch: P) => void;
  // create-mode form state
  projects: Project[];
  projectId: string;
  onProjectChange: (id: string) => void;
  specValues: Record<string, string>;
  onSpecChange: (key: string, value: string) => void;
}

export function SpecStep<T, P>({
  fields,
  isNew,
  model,
  disabled,
  onSave,
  projects,
  projectId,
  onProjectChange,
  specValues,
  onSpecChange,
}: Props<T, P>) {
  return (
    <div className="space-y-5">
      {isNew && (
        <ProjectPicker
          label="პროექტი"
          required
          value={projectId}
          onChange={onProjectChange}
          options={projects.map((p) => ({ value: p.id, label: p.name, logo: p.logo, company: p.company_name }))}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) =>
          isNew ? (
            <FieldInput
              key={f.key}
              label={f.label}
              value={specValues[f.key] ?? ''}
              disabled={false}
              onSave={(v) => onSpecChange(f.key, v ?? '')}
            />
          ) : (
            <FieldInput
              key={f.key}
              label={f.label}
              value={model ? (f.value(model) ?? '') : ''}
              disabled={disabled}
              onSave={(v) => onSave(f.patch(v))}
            />
          ),
        )}
      </div>
    </div>
  );
}
