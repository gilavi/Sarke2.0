import { useTranslation } from 'react-i18next';
import { FlowHeader } from '../../components/FlowHeader';
import { useTheme } from '../../lib/theme';
import { inspectionDisplayName } from '../../lib/shared/documentName';
import type { Project, Template } from '../../types/models';
import type { FlatStep } from './wizardSchema';

export function WizardHeader({
  step,
  stepIndex,
  total,
  project,
  template,
  onBack,
  onClose,
}: {
  step: FlatStep;
  stepIndex: number;
  total: number;
  project: Project | null;
  template: Template | null;
  onBack: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  // step is unused now that the header always shows the flow title - kept in
  // the signature so the call site doesn't have to change shape.
  void step;
  const { theme } = useTheme();
  return (
    <FlowHeader
      flowTitle={template?.name ? inspectionDisplayName(template.name) : t('inspections.questionnaireFallbackTitle')}
      project={project}
      step={stepIndex + 1}
      totalSteps={total}
      leading="back"
      trailing="close"
      onBack={onBack}
      onClose={onClose}
      surfaceColor={theme.colors.surface}
    />
  );
}
