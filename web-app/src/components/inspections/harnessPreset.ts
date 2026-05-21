import { routes } from '@/app/routes';
import type { WizardPreset } from '@/components/InspectionWizard';

/** System harness ("დამცავი ქამრები") template id. */
export const HARNESS_TEMPLATE_ID = '22222222-2222-2222-2222-222222222222';

/**
 * Streamlined harness create flow, driven by the shared InspectionWizard:
 * project-only info step, grid-first checklist (HarnessWizard), required
 * conclusion, and navigation to the harness detail page on success.
 */
export const harnessWizardPreset: WizardPreset = {
  templateId: HARNESS_TEMPLATE_ID,
  title: 'დამცავი ქამრების შემოწმება',
  requireConclusionText: true,
  successDetailRoute: (id) => routes.harness.detail(id),
};
