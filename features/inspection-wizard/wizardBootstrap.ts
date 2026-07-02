/**
 * Flow-start reads for the inspection wizard, routed through `cachedRead`
 * (lib/cachedRead.ts) so a previously-synced inspection opens fully offline:
 * online each read fetches fresh and lands in the persisted query cache;
 * offline it resolves from that cache instead of hanging on a paused fetch.
 *
 * Extracted as a sibling because useWizardState.ts is over its size target —
 * it swaps its five load() call sites for these and stays flat.
 */
import { onlineManager } from '@tanstack/react-query';
import { qk } from '../../lib/apiHooks';
import { cachedRead, OfflineDataMissingError } from '../../lib/cachedRead';
import { answersApi, inspectionsApi, projectsApi, templatesApi } from '../../lib/services';

/** Inspection row for the wizard (qk.inspections.byId). */
export function loadWizardInspection(id: string) {
  return cachedRead(qk.inspections.byId(id), () => inspectionsApi.getById(id));
}

/** Project for the wizard header/autofill (qk.projects.byId — seeded from the list by prefetchFlowStartCaches). */
export function loadWizardProject(projectId: string) {
  return cachedRead(qk.projects.byId(projectId), () => projectsApi.getById(projectId));
}

/** Template row (qk.templates.byId). */
export function loadWizardTemplate(templateId: string) {
  return cachedRead(qk.templates.byId(templateId), () => templatesApi.getById(templateId));
}

/** Template question set (qk.templates.questions — prefetched for every template post-login). */
export function loadWizardQuestions(templateId: string) {
  return cachedRead(qk.templates.questions(templateId), () => templatesApi.questions(templateId));
}

/**
 * Remote answers list, gated on connectivity: offline it rejects immediately
 * instead of hanging on the auth/token layer. The wizard's existing catch
 * flips `remoteOk = false` and hydrates from the offline answers cache
 * (`@offline:answers:<id>`), which stays the source of truth for answers —
 * they mutate mid-flow through the offline queue, so the query cache is
 * deliberately NOT involved here.
 */
export function loadWizardAnswers(inspectionId: string) {
  if (!onlineManager.isOnline()) {
    return Promise.reject(new OfflineDataMissingError(qk.inspections.answers(inspectionId)));
  }
  return answersApi.list(inspectionId);
}
