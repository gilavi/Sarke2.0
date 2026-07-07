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

await import('../../lib/excavatorService');
const { EXCAVATOR_MACHINE_SPECS } = await import('../../types/excavator');

function baseRow(over: Partial<any> = {}): any {
  return {
    id: 'e1',
    project_id: 'p1',
    template_id: 't1',
    user_id: 'u1',
    status: 'draft',
    machine_specs: EXCAVATOR_MACHINE_SPECS,
    serial_number: 'SN-1',
    registration_number: 'R-1',
    inventory_number: 'INV-1',
    project_name: 'Site A',
    department: 'Ops',
    inspection_date: '2026-05-20',
    moto_hours: 100,
    inspector_name: 'Gio',
    last_inspection_date: null,
    engine_items: [],
    undercarriage_items: [],
    cabin_items: [],
    safety_items: [],
    maintenance_items: [],
    verdict: null,
    notes: null,
    summary_photos: ['s1.jpg'],
    inspector_position: null,
    inspector_signature: null,
    completed_at: null,
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    ...over,
  };
}

describe('excavatorService config', () => {
  it('registers correct table + pathPrefix', () => {
    expect(captured!.table).toBe('excavator_inspections');
    expect(captured!.pathPrefix).toBe('excavator');
  });

  it('createColumns seeds all 5 item arrays + machine_specs + inspector_name', () => {
    const cols = captured!.createColumns({ inspectorName: 'Gio' });
    expect(cols.inspector_name).toBe('Gio');
    expect(cols.machine_specs).toBe(EXCAVATOR_MACHINE_SPECS);
    expect((cols.engine_items as any[]).length).toBe(8);
    expect((cols.undercarriage_items as any[]).length).toBe(11);
    expect((cols.cabin_items as any[]).length).toBe(8);
    expect((cols.safety_items as any[]).length).toBe(7);
    expect((cols.maintenance_items as any[]).length).toBe(3);
  });

  it('createColumns nulls inspector_name when omitted', () => {
    const cols = captured!.createColumns({});
    expect(cols.inspector_name).toBeNull();
  });

  it('createColumns seeds empty summary_photos', () => {
    const cols = captured!.createColumns({ inspectorName: 'Gio' });
    expect(cols.summary_photos).toEqual([]);
  });
});

describe('excavatorService toModel', () => {
  it('substitutes default items when lengths mismatch expected (8/11/8/7/3)', () => {
    const m = captured!.toModel(baseRow());
    expect(m.engineItems.length).toBe(8);
    expect(m.undercarriageItems.length).toBe(11);
    expect(m.cabinItems.length).toBe(8);
    expect(m.safetyItems.length).toBe(7);
    expect(m.maintenanceItems.length).toBe(3);
  });

  it('keeps row items when lengths match', () => {
    const engine = Array.from({ length: 8 }, (_, i) => ({ id: i }));
    const under = Array.from({ length: 11 }, (_, i) => ({ id: i }));
    const cabin = Array.from({ length: 8 }, (_, i) => ({ id: i }));
    const safety = Array.from({ length: 7 }, (_, i) => ({ id: i }));
    const maint = Array.from({ length: 3 }, (_, i) => ({ id: i }));
    const m = captured!.toModel(baseRow({
      engine_items: engine,
      undercarriage_items: under,
      cabin_items: cabin,
      safety_items: safety,
      maintenance_items: maint,
    }));
    expect(m.engineItems).toBe(engine);
    expect(m.undercarriageItems).toBe(under);
    expect(m.cabinItems).toBe(cabin);
    expect(m.safetyItems).toBe(safety);
    expect(m.maintenanceItems).toBe(maint);
  });

  it('falls back to EXCAVATOR_MACHINE_SPECS when row.machine_specs is missing', () => {
    const m = captured!.toModel(baseRow({ machine_specs: null as any }));
    expect(m.machineSpecs).toBe(EXCAVATOR_MACHINE_SPECS);
  });

  it('defaults templateId to empty string when null', () => {
    const m = captured!.toModel(baseRow({ template_id: null }));
    expect(m.templateId).toBe('');
  });

  it('preserves numeric and nullable fields', () => {
    const m = captured!.toModel(baseRow({ moto_hours: 42, serial_number: null }));
    expect(m.motoHours).toBe(42);
    expect(m.serialNumber).toBeNull();
  });

  it('maps summary_photos → summaryPhotos, defaulting to [] when not an array', () => {
    expect(captured!.toModel(baseRow({ summary_photos: ['a.jpg'] })).summaryPhotos).toEqual(['a.jpg']);
    expect(captured!.toModel(baseRow({ summary_photos: null as any })).summaryPhotos).toEqual([]);
  });
});

describe('excavatorService toDb', () => {
  it('returns {} for empty patch', () => {
    expect(captured!.toDb({})).toEqual({});
  });

  it('maps every writable field to snake_case', () => {
    const out = captured!.toDb({
      serialNumber: 'SN',
      registrationNumber: 'R',
      inventoryNumber: 'INV',
      projectName: 'PN',
      department: 'D',
      inspectionDate: '2026-05-20',
      motoHours: 100,
      inspectorName: 'I',
      lastInspectionDate: '2025-12-01',
      engineItems: [] as any,
      undercarriageItems: [] as any,
      cabinItems: [] as any,
      safetyItems: [] as any,
      maintenanceItems: [] as any,
      verdict: 'pass' as any,
      notes: 'N',
    });
    expect(out).toEqual({
      serial_number: 'SN',
      registration_number: 'R',
      inventory_number: 'INV',
      project_name: 'PN',
      department: 'D',
      inspection_date: '2026-05-20',
      moto_hours: 100,
      inspector_name: 'I',
      last_inspection_date: '2025-12-01',
      engine_items: [],
      undercarriage_items: [],
      cabin_items: [],
      safety_items: [],
      maintenance_items: [],
      verdict: 'pass',
      notes: 'N',
    });
  });

  it('drops inspectorPosition + inspectorSignature (ephemeral)', () => {
    const out = captured!.toDb({
      inspectorPosition: 'X',
      inspectorSignature: 'data:',
    } as any);
    expect(out).toEqual({});
  });

  it('maps summaryPhotos → summary_photos', () => {
    expect(captured!.toDb({ summaryPhotos: ['a.jpg'] })).toEqual({ summary_photos: ['a.jpg'] });
  });
});
