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

await import('../../lib/liftingAccessoriesService');

function baseRow(over: Partial<any> = {}): any {
  return {
    id: 'la1',
    project_id: 'p1',
    template_id: 't1',
    user_id: 'u1',
    status: 'draft',
    company: 'Acme',
    address: 'A',
    inspector_name: 'Gio',
    inspection_date: '2026-05-20',
    equipment_types: ['hook'],
    equipment_type_other: null,
    serial_number: 'SN-1',
    manufacturer: 'Mfg',
    year_of_manufacture: '2020',
    marking_status: 'present',
    wll_kg: '100',
    unit_count: '5',
    next_inspection_date: '2026-08-20',
    items: [],
    removed_rows: [],
    verdict: null,
    verdict_comment: null,
    signatures: [],
    summary_photos: [],
    completed_at: null,
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    ...over,
  };
}

describe('liftingAccessoriesService config', () => {
  it('registers correct table + pathPrefix', () => {
    expect(captured!.table).toBe('lifting_accessories_inspections');
    expect(captured!.pathPrefix).toBe('lifting-accessories');
  });

  it('createColumns seeds inspector_name + 10 items + 2 default signatories', () => {
    const cols = captured!.createColumns({ inspectorName: 'Gio' });
    expect(cols.inspector_name).toBe('Gio');
    expect((cols.items as any[]).length).toBe(10);
    expect((cols.signatures as any[]).length).toBe(2);
    expect((cols.signatures as any[])[0].name).toBe('Gio');
    expect((cols.signatures as any[])[1].name).toBe('');
  });

  it('createColumns nulls inspector_name when omitted', () => {
    const cols = captured!.createColumns({});
    expect(cols.inspector_name).toBeNull();
  });
});

describe('liftingAccessoriesService toModel', () => {
  it('substitutes default items when length != 10', () => {
    const m = captured!.toModel(baseRow({ items: [] }));
    expect(m.items.length).toBe(10);
  });

  it('keeps items when length is 10', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    const m = captured!.toModel(baseRow({ items }));
    expect(m.items).toBe(items);
  });

  it('defaults nullable strings to empty', () => {
    const m = captured!.toModel(baseRow({
      company: null, address: null, inspector_name: null,
      equipment_type_other: null, serial_number: null, manufacturer: null,
      year_of_manufacture: null, wll_kg: null, unit_count: null, verdict_comment: null,
    }));
    expect(m.company).toBe('');
    expect(m.address).toBe('');
    expect(m.inspectorName).toBe('');
    expect(m.equipmentTypeOther).toBe('');
    expect(m.serialNumber).toBe('');
    expect(m.manufacturer).toBe('');
    expect(m.yearOfManufacture).toBe('');
    expect(m.wllKg).toBe('');
    expect(m.unitCount).toBe('');
    expect(m.verdictComment).toBe('');
  });

  it('coerces non-array equipment_types to []', () => {
    const m = captured!.toModel(baseRow({ equipment_types: null as any }));
    expect(m.equipmentTypes).toEqual([]);
  });

  it('coerces non-array removed_rows / summary_photos to []', () => {
    const m = captured!.toModel(baseRow({ removed_rows: null as any, summary_photos: null as any }));
    expect(m.removedRows).toEqual([]);
    expect(m.summaryPhotos).toEqual([]);
  });

  it('normalizes signatures to a 2-tuple with extra={} default', () => {
    const m = captured!.toModel(baseRow({ signatures: [] as any }));
    expect(m.signatures.length).toBe(2);
    expect(m.signatures[0].extra).toEqual({});
    expect(m.signatures[1].extra).toEqual({});
  });

  it('normalizes signature fields when partial / wrong types provided', () => {
    const m = captured!.toModel(baseRow({
      signatures: [
        { name: 'A', position: 123 as any, signature: null, date: '2026-05-20', extra: 'not obj' as any },
        { name: 'B', organization: 'O', extra: { foo: 'bar' } },
      ] as any,
    }));
    expect(m.signatures[0].name).toBe('A');
    expect(m.signatures[0].position).toBe('');
    expect(m.signatures[0].date).toBe('2026-05-20');
    expect(m.signatures[0].extra).toEqual({});
    expect(m.signatures[1].organization).toBe('O');
    expect(m.signatures[1].extra).toEqual({ foo: 'bar' });
  });
});

describe('liftingAccessoriesService toDb', () => {
  it('returns {} for empty patch', () => {
    expect(captured!.toDb({})).toEqual({});
  });

  it('maps every writable field to snake_case', () => {
    const out = captured!.toDb({
      company: 'C',
      address: 'A',
      inspectorName: 'N',
      inspectionDate: '2026-05-20',
      equipmentTypes: ['hook'],
      equipmentTypeOther: 'O',
      serialNumber: 'SN',
      manufacturer: 'M',
      yearOfManufacture: '2020',
      markingStatus: 'present',
      wllKg: '100',
      unitCount: '5',
      nextInspectionDate: '2026-08-20',
      items: [] as any,
      removedRows: [] as any,
      verdict: 'pass' as any,
      verdictComment: 'OK',
      summaryPhotos: ['a.jpg'],
    });
    expect(out).toEqual({
      company: 'C',
      address: 'A',
      inspector_name: 'N',
      inspection_date: '2026-05-20',
      equipment_types: ['hook'],
      equipment_type_other: 'O',
      serial_number: 'SN',
      manufacturer: 'M',
      year_of_manufacture: '2020',
      marking_status: 'present',
      wll_kg: '100',
      unit_count: '5',
      next_inspection_date: '2026-08-20',
      items: [],
      removed_rows: [],
      verdict: 'pass',
      verdict_comment: 'OK',
      summary_photos: ['a.jpg'],
    });
  });

  it('preserves null in markingStatus / nextInspectionDate', () => {
    expect(captured!.toDb({ markingStatus: null, nextInspectionDate: null })).toEqual({
      marking_status: null,
      next_inspection_date: null,
    });
  });

  it('drops signatures (ephemeral)', () => {
    expect(captured!.toDb({ signatures: [{}, {}] as any })).toEqual({});
  });
});
