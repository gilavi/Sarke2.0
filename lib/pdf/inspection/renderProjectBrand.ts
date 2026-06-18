import type { Project } from '../../../types/models';
import { escapeHtml } from './_shared';

export function renderProjectBrand(project: Project): string {
  if (project.logo) {
    return `<img class="project-brand-logo" src="${escapeHtml(project.logo)}" alt="${escapeHtml(project.company_name || project.name)}" />`;
  }
  const trimmed = (project.company_name || project.name || '').trim();
  const initials = trimmed
    ? Array.from(trimmed).slice(0, 2).join('').toLocaleUpperCase('ka-GE')
    : '-';
  return `<div class="project-brand-initials">${escapeHtml(initials)}</div>`;
}
