import { describe, it, expect, vi } from 'vitest';

type ServiceConfig = {
  table: string;
  pathPrefix: string;
  toModel: (row: any) => any;
  toDb: (patch: any) => Record<string, unknown>;
  createColumns: (args: any) => Record<string, unknown>;
};

let captured: ServiceConfig | undefined;

vi.mock('../../lib/inspection/service', () => ({
  makeInspectionService: vi.fn((config: ServiceConfig) => {
    captured = config;
    return {
      create: vi.fn(),
      getById: vi.fn(),
      listByProject: vi.fn(),
      patch: vi.fn(),
      complete: vi.fn(),
      deletePhoto: vi.fn(),
      uploadPhotoAt: vi.fn(),
    };
  }),
}));

await import('../../lib/generalEquipmentService');

function baseRow(over: Partial<any> = {}): any {
  return {
    id: 'g1',
    project_id: 'p1',
    template_id: 't1',
    user_id: 'u1',
    status: 'draft',
    object_name: 'Object',
    address: 'A',
    activity_type: 'construction',
    inspection_date: '2026-05-20',
    act_number: 'GEI-2026-ABCD',
    inspection_type: 'periodic',
    inspector_name: 'Gio',
    equipment: [{ id: 'e1', name: 'Crane' }],
    conclusion: 'OK',
    summary_photos: ['s.jpg'],
    signer_name: 'X',
    signer_role: 'engineer',
    signer_role_custom: null,
    inspector_signature: null,
    completed_at: null,
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    ...over,
  };
}

describe('generalEquipmentService config', () => {
  it('registers correct table + pathPrefix', () => {
    expect(captured!.table).toBe('general_equipment_inspections');
    expect(captured!.pathPrefix).toBe('general_equipment');
  });

  it('createColumns seeds inspector_name, generates GEI act_number, default equipment, empty summary_photos', () => {
    const cols = captured!.createColumns({ inspectorName: 'Gio' });
    expect(cols.inspector_name).toBe('Gio');
    expect((cols.act_number as string).startsWith(`GEI-${new Date().getFullYear()}-`)).toBe(true);
    expect(Array.isArray(cols.equipment)).toBe(true);
    expect((cols.equipment as any[]).length).toBeGreaterThan(0);
    expect(cols.summary_photos).toEqual([]);
  });

  it('createColumns nulls inspector_name when omitted', () => {
    const cols = captured!.createColumns({});
    expect(cols.inspector_name).toBeNull();
  });
});

describe('generalEquipmentService toModel', () => {
  it('maps DB row to camelCase model and preserves equipment', () => {
    const m = captured!.toModel(baseRow());
    expect(m.objectName).toBe('Object');
    expect(m.activityType).toBe('construction');
    expect(m.actNumber).toBe('GEI-2026-ABCD');
    expect(m.inspectionType).toBe('periodic');
    expect(m.signerName).toBe('X');
    expect(m.signerRole).toBe('engineer');
    expect(m.equipment.length).toBe(1);
  });

  it('substitutes default equipment when row.equipment is empty', () => {
    const m = captured!.toModel(baseRow({ equipment: [] }));
    expect(m.equipment.length).toBeGreaterThan(0);
  });

  it('defaults templateId to empty string when null', () => {
    const m = captured!.toModel(baseRow({ template_id: null }));
    expect(m.templateId).toBe('');
  });

  it('defaults summaryPhotos to [] when not an array', () => {
    const m = captured!.toModel(baseRow({ summary_photos: null as any }));
    expect(m.summaryPhotos).toEqual([]);
  });

  it('passes through null signer/inspection-type fields as null', () => {
    const m = captured!.toModel(baseRow({ inspection_type: null, signer_role: null }));
    expect(m.inspectionType).toBeNull();
    expect(m.signerRole).toBeNull();
  });
});

describe('generalEquipmentService toDb', () => {
  it('returns {} for empty patch', () => {
    expect(captured!.toDb({})).toEqual({});
  });

  it('maps every writable field to snake_case', () => {
    const out = captured!.toDb({
      objectName: 'O',
      address: 'A',
      activityType: 'X',
      inspectionDate: '2026-05-20',
      actNumber: 'GEI-2026-Z',
      inspectionType: 'periodic' as any,
      inspectorName: 'I',
      equipment: [] as any,
      conclusion: 'C',
      summaryPhotos: ['s.jpg'],
    });
    expect(out).toEqual({
      object_name: 'O',
      address: 'A',
      activity_type: 'X',
      inspection_date: '2026-05-20',
      act_number: 'GEI-2026-Z',
      inspection_type: 'periodic',
      inspector_name: 'I',
      equipment: [],
      conclusion: 'C',
      summary_photos: ['s.jpg'],
    });
  });

  it('drops signer* + inspectorSignature (ephemeral)', () => {
    const out = captured!.toDb({
      signerName: 'X',
      signerRole: 'engineer' as any,
      signerRoleCustom: null,
      inspectorSignature: 'data:',
    } as any);
    expect(out).toEqual({});
  });
});
