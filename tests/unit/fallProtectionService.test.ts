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

await import('../../lib/fallProtectionService');

function baseRow(over: Partial<any> = {}): any {
  return {
    id: 'fp1',
    project_id: 'p1',
    template_id: 't1',
    user_id: 'u1',
    status: 'draft',
    company: 'Acme',
    address: 'A',
    inspection_date: '2026-05-20',
    safety_leader_name: 'Gio',
    safety_leader_phone: '+995111',
    inspection_type: 'periodic',
    next_inspection_date: '2026-08-20',
    devices: undefined,
    device_data: [],
    completed_at: null,
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    ...over,
  };
}

describe('fallProtectionService config', () => {
  it('registers correct table + pathPrefix', () => {
    expect(captured!.table).toBe('fall_protection_inspections');
    expect(captured!.pathPrefix).toBe('fall-protection');
  });

  it('createColumns seeds 3 default devices + matching device_data, no inspector_name', () => {
    const cols = captured!.createColumns({});
    expect((cols.devices as any[]).length).toBe(3);
    expect((cols.device_data as any[]).length).toBe(3);
    expect('inspector_name' in cols).toBe(false);
  });
});

describe('fallProtectionService toModel', () => {
  it('defaults devices to 3 entries when row.devices is missing', () => {
    const m = captured!.toModel(baseRow({ devices: undefined }));
    expect(m.devices.length).toBe(3);
  });

  it('keeps existing devices array', () => {
    const devices = [{ id: 'd1' }, { id: 'd2' }];
    const m = captured!.toModel(baseRow({ devices }));
    expect(m.devices.length).toBe(2);
  });

  it('defaults nullable string fields to empty strings', () => {
    const m = captured!.toModel(baseRow({
      company: null, address: null,
      safety_leader_name: null, safety_leader_phone: null,
    }));
    expect(m.company).toBe('');
    expect(m.address).toBe('');
    expect(m.safetyLeaderName).toBe('');
    expect(m.safetyLeaderPhone).toBe('');
  });

  it('passes through inspectionType as null when missing', () => {
    const m = captured!.toModel(baseRow({ inspection_type: null }));
    expect(m.inspectionType).toBeNull();
  });

  it('coerces device_data items with valid items array preserved', () => {
    const devices = [{ id: 'd1' }];
    const m = captured!.toModel(baseRow({
      devices,
      device_data: [{
        deviceId: 'd1',
        items: Array.from({ length: 12 }, (_, i) => ({ id: i, result: 'ok' })),
        customItem: { label: 'X', result: 'ok', comment: null, photo_paths: [] },
        verdict: 'pass',
        verdictComment: 'OK',
        photoPaths: ['p1.jpg'],
      }],
    }));
    expect(m.deviceData.length).toBe(1);
    expect(m.deviceData[0].items.length).toBe(12);
  });

  it('replaces device_data items with defaults when length != 12', () => {
    const devices = [{ id: 'd1' }];
    const m = captured!.toModel(baseRow({
      devices,
      device_data: [{ deviceId: 'd1', items: [] }],
    }));
    expect(m.deviceData[0].items.length).toBe(12);
  });

  it('defaults customItem fields when missing', () => {
    const devices = [{ id: 'd1' }];
    const m = captured!.toModel(baseRow({
      devices,
      device_data: [{ deviceId: 'd1' }],
    }));
    expect(m.deviceData[0].customItem.label).toBe('სხვა');
  });

  it('coerces non-array device_data to []', () => {
    const m = captured!.toModel(baseRow({ device_data: null as any }));
    expect(Array.isArray(m.deviceData)).toBe(true);
  });

  it('always attaches a default signature object', () => {
    const m = captured!.toModel(baseRow());
    expect(m.signature).toBeDefined();
    expect(typeof m.signature).toBe('object');
  });
});

describe('fallProtectionService toDb', () => {
  it('returns {} for empty patch', () => {
    expect(captured!.toDb({})).toEqual({});
  });

  it('maps every writable field to snake_case', () => {
    const out = captured!.toDb({
      company: 'C',
      address: 'A',
      inspectionDate: '2026-05-20',
      safetyLeaderName: 'L',
      safetyLeaderPhone: '+1',
      inspectionType: 'periodic' as any,
      nextInspectionDate: '2026-08-20',
      devices: [] as any,
      deviceData: [] as any,
    });
    expect(out).toEqual({
      company: 'C',
      address: 'A',
      inspection_date: '2026-05-20',
      safety_leader_name: 'L',
      safety_leader_phone: '+1',
      inspection_type: 'periodic',
      next_inspection_date: '2026-08-20',
      devices: [],
      device_data: [],
    });
  });

  it('preserves null in nextInspectionDate', () => {
    expect(captured!.toDb({ nextInspectionDate: null })).toEqual({ next_inspection_date: null });
  });
});
