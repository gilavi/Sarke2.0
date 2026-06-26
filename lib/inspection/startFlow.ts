/**
 * Pure step-resolution for the "start a შემოწმების აქტი" flow.
 *
 * The flow has two possible pre-wizard steps — pick a template (type), then pick
 * a project. Either can be pre-resolved and therefore skipped:
 *   - template: a `templateId` was supplied (deep link / single shortcut), OR
 *     exactly one system template exists.
 *   - project:  a `projectId` was supplied (launched from a project screen), OR
 *     exactly one project exists.
 *
 * When both resolve, `steps` is empty and the caller creates the inspection
 * immediately. This is the single source of truth for what the user must pick;
 * crucially, NOTHING is written until the caller reaches the wizard, so selecting
 * a template and backing out never leaves a draft behind.
 */
import type { Project, Template } from '../../types/models';

export type StartStep = 'template' | 'project';

export interface StartFlowInput {
  /** All templates (system + custom). Only `is_system` ones populate the grid. */
  templates: Template[];
  projects: Project[];
  /** Project to attach (when launched from a project screen). */
  projectId?: string | null;
  /** Template to preselect (deep link / shortcut). Matched against all templates. */
  templateId?: string | null;
}

export interface StartFlowPlan {
  /** System templates shown in the picker grid. */
  systemTemplates: Template[];
  /** Pre-resolved template, or null when the user must pick one. */
  preTemplate: Template | null;
  /** Pre-resolved project, or null when the user must pick one. */
  preProject: Project | null;
  /** Ordered pre-wizard steps the user still has to complete. */
  steps: StartStep[];
}

export function planInspectionStart({
  templates,
  projects,
  projectId,
  templateId,
}: StartFlowInput): StartFlowPlan {
  const systemTemplates = templates.filter((t) => t.is_system);

  const preTemplate =
    (templateId ? templates.find((t) => t.id === templateId) : undefined) ??
    (systemTemplates.length === 1 ? systemTemplates[0] : null);

  const preProject =
    (projectId ? projects.find((p) => p.id === projectId) : undefined) ??
    (projects.length === 1 ? projects[0] : null);

  const steps: StartStep[] = [];
  if (!preTemplate) steps.push('template');
  if (!preProject) steps.push('project');

  return { systemTemplates, preTemplate: preTemplate ?? null, preProject: preProject ?? null, steps };
}
