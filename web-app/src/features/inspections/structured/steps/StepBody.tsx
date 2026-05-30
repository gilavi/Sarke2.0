/**
 * Renders the active step's body in the draft wizard, dispatching on the
 * descriptor step `kind`. Extracted from `StructuredInspectionWizard` to keep
 * that orchestrator under the component size target.
 *
 * Note: the wizard only ever runs for drafts (StructuredActPage routes completed
 * rows to the result screen), so there is no signature capture or read-only mode
 * here — signature lives on `StructuredInspectionResult`, matching harness.
 */
import DeleteButton from '@/components/DeleteButton';
import { SpecStep } from './SpecStep';
import { ChecklistStep } from './ChecklistStep';
import { VerdictStep } from './VerdictStep';
import type { WizardDescriptor } from '../types';

interface StepBodyProps<T extends { id: string; status: string }, P, C> {
  step: WizardDescriptor<T, P, C>['steps'][number];
  item: T;
  itemId: string;
  onSave: (patch: P) => void;
  onDelete: () => void;
  deleting: boolean;
}

export function StepBody<T extends { id: string; status: string }, P, C>({
  step,
  item,
  itemId,
  onSave,
  onDelete,
  deleting,
}: StepBodyProps<T, P, C>) {
  if (step.kind === 'specs') {
    return (
      <div className="space-y-4">
        <SpecStep
          fields={step.fields}
          isNew={false}
          model={item}
          disabled={false}
          onSave={onSave}
          projects={[]}
          projectId=""
          onProjectChange={() => {}}
          specValues={{}}
          onSpecChange={() => {}}
        />
        <div className="flex justify-end">
          <DeleteButton onDelete={onDelete} isPending={deleting} />
        </div>
      </div>
    );
  }
  if (step.kind === 'checklist') {
    return <ChecklistStep step={step} model={item} inspectionId={itemId} disabled={false} onSave={onSave} />;
  }
  if (step.kind === 'custom') {
    return <>{step.render({ model: item, disabled: false, save: onSave })}</>;
  }
  // verdict (last step)
  return <VerdictStep step={step} model={item} disabled={false} onSave={onSave} />;
}
