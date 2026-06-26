/**
 * Unit tests for planInspectionStart — the pure step-resolution for the
 * "start a შემოწმების აქტი" flow. No mocks: it's a pure function over
 * templates + projects + optional projectId/templateId.
 *
 * Verifies which pre-wizard steps survive (template / project), what gets
 * pre-resolved, and the auto-create case (steps empty) — plus that only
 * `is_system` templates count toward the single-template shortcut.
 */
import { describe, it, expect } from 'vitest';
import { planInspectionStart } from '../../lib/inspection/startFlow';
import type { Project, Template } from '../../types/models';

const tpl = (id: string, over: Partial<Template> = {}): Template =>
  ({
    id,
    owner_id: null,
    name: `tpl ${id}`,
    category: 'bobcat',
    is_system: true,
    required_qualifications: [],
    required_signer_roles: [],
    ...over,
  }) as Template;

const proj = (id: string): Project =>
  ({
    id,
    user_id: 'u1',
    name: `proj ${id}`,
    company_name: `co ${id}`,
    address: 'addr',
    latitude: null,
    longitude: null,
    crew: null,
    logo: null,
    contact_phone: null,
    created_at: '2026-01-01',
  }) as Project;

describe('planInspectionStart', () => {
  it('keeps both steps when many templates and many projects, nothing pre-resolved', () => {
    const plan = planInspectionStart({
      templates: [tpl('a'), tpl('b')],
      projects: [proj('p1'), proj('p2')],
    });
    expect(plan.steps).toEqual(['template', 'project']);
    expect(plan.preTemplate).toBeNull();
    expect(plan.preProject).toBeNull();
    expect(plan.systemTemplates).toHaveLength(2);
  });

  it('skips the template step when a templateId is supplied', () => {
    const plan = planInspectionStart({
      templates: [tpl('a'), tpl('b')],
      projects: [proj('p1'), proj('p2')],
      templateId: 'b',
    });
    expect(plan.preTemplate?.id).toBe('b');
    expect(plan.steps).toEqual(['project']);
  });

  it('skips the project step when launched from a project', () => {
    const plan = planInspectionStart({
      templates: [tpl('a'), tpl('b')],
      projects: [proj('p1'), proj('p2')],
      projectId: 'p2',
    });
    expect(plan.preProject?.id).toBe('p2');
    expect(plan.steps).toEqual(['template']);
  });

  it('auto-resolves the only system template and the only project (no steps)', () => {
    const plan = planInspectionStart({
      templates: [tpl('only')],
      projects: [proj('solo')],
    });
    expect(plan.steps).toEqual([]);
    expect(plan.preTemplate?.id).toBe('only');
    expect(plan.preProject?.id).toBe('solo');
  });

  it('returns no steps when both ids are supplied (deep link)', () => {
    const plan = planInspectionStart({
      templates: [tpl('a'), tpl('b')],
      projects: [proj('p1'), proj('p2')],
      templateId: 'a',
      projectId: 'p1',
    });
    expect(plan.steps).toEqual([]);
    expect(plan.preTemplate?.id).toBe('a');
    expect(plan.preProject?.id).toBe('p1');
  });

  it('only counts is_system templates for the single-template shortcut', () => {
    // One system + one custom: NOT a single-system shortcut → template step stays,
    // and the grid only lists the system one.
    const plan = planInspectionStart({
      templates: [tpl('sys'), tpl('custom', { is_system: false })],
      projects: [proj('p1'), proj('p2')],
    });
    expect(plan.systemTemplates.map((t) => t.id)).toEqual(['sys']);
    // exactly one system template → shortcut applies, template step skipped;
    // two projects remain → only the project step survives.
    expect(plan.preTemplate?.id).toBe('sys');
    expect(plan.steps).toEqual(['project']);
  });

  it('falls back to the picker when templateId matches nothing and >1 system templates', () => {
    const plan = planInspectionStart({
      templates: [tpl('a'), tpl('b')],
      projects: [proj('p1'), proj('p2')],
      templateId: 'missing',
    });
    expect(plan.preTemplate).toBeNull();
    expect(plan.steps).toContain('template');
  });

  it('matches a templateId even for a non-system template (deep link)', () => {
    const plan = planInspectionStart({
      templates: [tpl('a'), tpl('custom', { is_system: false })],
      projects: [proj('p1'), proj('p2')],
      templateId: 'custom',
    });
    expect(plan.preTemplate?.id).toBe('custom');
    expect(plan.steps).toEqual(['project']);
  });
});
