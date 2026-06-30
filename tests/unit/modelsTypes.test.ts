import { describe, it, expect } from 'vitest';
import {
  SIGNER_ROLE_LABEL,
  CREW_ROLE_KEYS,
  CREW_ROLE_LABEL,
  ATTACHMENT_TYPE_PRESETS,
  INCIDENT_TYPE_LABEL,
  INCIDENT_TYPE_FULL_LABEL,
  ORDER_DOCUMENT_TYPE_LABEL,
} from '../../types/models';

describe('types/models constant tables', () => {
  it('SIGNER_ROLE_LABEL covers all four roles', () => {
    expect(SIGNER_ROLE_LABEL.expert).toBeTruthy();
    expect(SIGNER_ROLE_LABEL.xaracho_supervisor).toBeTruthy();
    expect(SIGNER_ROLE_LABEL.xaracho_assembler).toBeTruthy();
    expect(SIGNER_ROLE_LABEL.other).toBeTruthy();
    expect(Object.keys(SIGNER_ROLE_LABEL)).toHaveLength(4);
  });

  it('CREW_ROLE_KEYS matches CREW_ROLE_LABEL keys', () => {
    expect(CREW_ROLE_KEYS).toHaveLength(4);
    for (const k of CREW_ROLE_KEYS) {
      expect(CREW_ROLE_LABEL[k]).toBeTruthy();
    }
  });

  it('ATTACHMENT_TYPE_PRESETS is a non-empty const tuple', () => {
    expect(ATTACHMENT_TYPE_PRESETS.length).toBeGreaterThan(0);
    expect(ATTACHMENT_TYPE_PRESETS.every((p) => typeof p === 'string')).toBe(true);
  });

  it('INCIDENT_TYPE_LABEL and FULL share keys', () => {
    expect(Object.keys(INCIDENT_TYPE_LABEL).sort()).toEqual(
      Object.keys(INCIDENT_TYPE_FULL_LABEL).sort(),
    );
    expect(INCIDENT_TYPE_FULL_LABEL.nearmiss).toContain('near miss');
  });

  it('ORDER_DOCUMENT_TYPE_LABEL covers all eight order types', () => {
    expect(ORDER_DOCUMENT_TYPE_LABEL.labor_safety_specialist).toBeTruthy();
    expect(ORDER_DOCUMENT_TYPE_LABEL.alcohol_control).toBeTruthy();
    expect(ORDER_DOCUMENT_TYPE_LABEL.fire_safety_order).toBeTruthy();
    expect(ORDER_DOCUMENT_TYPE_LABEL.fire_safety_order_enterprise).toBeTruthy();
    expect(ORDER_DOCUMENT_TYPE_LABEL.crane_operator_order).toBeTruthy();
    expect(ORDER_DOCUMENT_TYPE_LABEL.crane_technical_order).toBeTruthy();
    expect(ORDER_DOCUMENT_TYPE_LABEL.scaffold_supervision_order).toBeTruthy();
    expect(ORDER_DOCUMENT_TYPE_LABEL.training_schedule_order).toBeTruthy();
    expect(Object.keys(ORDER_DOCUMENT_TYPE_LABEL)).toHaveLength(8);
  });

  it('labels are Georgian strings (non-empty unicode)', () => {
    for (const v of Object.values(SIGNER_ROLE_LABEL)) {
      expect(v.length).toBeGreaterThan(0);
    }
    for (const v of Object.values(INCIDENT_TYPE_LABEL)) {
      expect(v.length).toBeGreaterThan(0);
    }
  });
});
