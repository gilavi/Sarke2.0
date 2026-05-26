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

await import('../../lib/mobileLadderService');

function baseSig(over: Partial<any> = {}): any {
  return {
    name: 'Gio',
    position: 'Inspector',
    signature: null,
    date: null,
    ...over,
  };
}

function baseRow(over: Partial<any> = {}): any {
  return {
    id: 'ml1',
    project_id: 'p1',
    template_id: 't1',
    user_id: 'u1',
    status: 'draft',
    company: 'Acme',
    address: '5 Foo St',
    inspector_name: 'Gio',
    inspection_date: '2026-05-20',
    ladder_type: 'aluminum',
    ladder_type_unknown: false,
    model: 'M3',
    model_unknown: false,
    height_m: 6,
    height_unknown: false,
    max_load_kg: 150,
    max_load_unknown: false,
    next_inspection_date: '2026-08-20',
    items: [],
    verdict: null,
    verdict_comment: '',
    signature: baseSig(),
    completed_at: null,
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    ...over,
  };
}

describe('mobileLadderService config', () => {
  it('registered mobile_ladder_inspections table with pathPrefix=mobile-ladder', () => {
    expect(captured!.table).toBe('mobile_ladder_inspections');
    expect(captured!.pathPrefix).toBe('mobile-ladder');
  });

  it('createColumns seeds inspector_name, 8 default items, signature object', () => {
    const cols = captured!.createColumns({ inspectorName: 'Gio' });
    expect(cols.inspector_name).toBe('Gio');
    expect((cols.items as any[]).length).toBe(8);
    expect(cols.signature).toMatchObject({
      name: 'Gio',
      position: '',
      signature: null,
      date: null,
    });
  });

  it('createColumns uses empty string for signature.name when inspectorName not provided', () => {
    const cols = captured!.createColumns({});
    expect(cols.inspector_name).toBeNull();
    expect((cols.signature as any).name).toBe('');
  });
});

describe('mobileLadderService toModel', () => {
  it('maps DB row to camelCase model', () => {
    const model = captured!.toModel(baseRow());
    expect(model.ladderType).toBe('aluminum');
    expect(model.ladderTypeUnknown).toBe(false);
    expect(model.heightM).toBe(6);
    expect(model.maxLoadKg).toBe(150);
    expect(model.nextInspectionDate).toBe('2026-08-20');
    expect(model.verdictComment).toBe('');
  });

  it('defaults nullable string columns to empty strings', () => {
    const model = captured!.toModel(baseRow({
      company: null,
      address: null,
      inspector_name: null,
      verdict_comment: null as any,
    }));
    expect(model.company).toBe('');
    expect(model.address).toBe('');
    expect(model.inspectorName).toBe('');
    expect(model.verdictComment).toBe('');
  });

  it('substitutes default items when row.items length != 8', () => {
    const model = captured!.toModel(baseRow({ items: [] }));
    expect(model.items.length).toBe(8);
  });

  it('keeps row.items when length is 8', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ id: i, status: 'pending' }));
    const model = captured!.toModel(baseRow({ items }));
    expect(model.items).toBe(items);
  });

  it('uses default signatory when row.signature is not an object', () => {
    const model = captured!.toModel(baseRow({ signature: null as any }));
    expect(model.signature).toMatchObject({
      name: '',
      position: '',
      signature: null,
      date: null,
    });
  });

  it('normalizes signature fields with null/undefined fallbacks', () => {
    const model = captured!.toModel(baseRow({
      signature: { name: 'X', position: undefined as any, signature: undefined as any, date: undefined as any },
    }));
    expect(model.signature.name).toBe('X');
    expect(model.signature.position).toBe('');
    expect(model.signature.signature).toBeNull();
    expect(model.signature.date).toBeNull();
  });

  it('defaults *_unknown booleans to false when null', () => {
    const model = captured!.toModel(baseRow({
      ladder_type_unknown: null as any,
      model_unknown: null as any,
      height_unknown: null as any,
      max_load_unknown: null as any,
    }));
    expect(model.ladderTypeUnknown).toBe(false);
    expect(model.modelUnknown).toBe(false);
    expect(model.heightUnknown).toBe(false);
    expect(model.maxLoadUnknown).toBe(false);
  });
});

describe('mobileLadderService toDb', () => {
  it('returns {} for an empty patch', () => {
    expect(captured!.toDb({})).toEqual({});
  });

  it('maps every writable field to snake_case', () => {
    const out = captured!.toDb({
      company: 'C',
      address: 'A',
      inspectorName: 'N',
      inspectionDate: '2026-05-20',
      ladderType: 'aluminum',
      ladderTypeUnknown: true,
      model: 'M',
      modelUnknown: false,
      heightM: 6,
      heightUnknown: false,
      maxLoadKg: 150,
      maxLoadUnknown: false,
      nextInspectionDate: '2026-08-20',
      items: [] as any,
      verdict: 'pass' as any,
      verdictComment: 'OK',
    });
    expect(out).toEqual({
      company: 'C',
      address: 'A',
      inspector_name: 'N',
      inspection_date: '2026-05-20',
      ladder_type: 'aluminum',
      ladder_type_unknown: true,
      model: 'M',
      model_unknown: false,
      height_m: 6,
      height_unknown: false,
      max_load_kg: 150,
      max_load_unknown: false,
      next_inspection_date: '2026-08-20',
      items: [],
      verdict: 'pass',
      verdict_comment: 'OK',
    });
  });

  it('preserves null values in the patch', () => {
    expect(captured!.toDb({ ladderType: null })).toEqual({ ladder_type: null });
    expect(captured!.toDb({ heightM: null })).toEqual({ height_m: null });
  });

  it('drops signature (ephemeral, never persisted)', () => {
    const out = captured!.toDb({ signature: { name: 'X', position: 'Y', signature: 'data:', date: '2026-05-20' } });
    expect(out).toEqual({});
  });
});
