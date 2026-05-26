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

await import('../../lib/cargoPlatformService');

function baseRow(over: Partial<any> = {}): any {
  return {
    id: 'c1',
    project_id: 'p1',
    template_id: 't1',
    user_id: 'u1',
    status: 'draft',
    company: 'Acme',
    address: 'A',
    inspector_name: 'Gio',
    floor_zone: '1F',
    inspection_date: '2026-05-20',
    platform_type_model: 'PT-1',
    platform_length_m: 3,
    platform_width_m: 2,
    platform_color_desc: 'red',
    side_guardrail: 'present',
    front_guardrail: 'present',
    guardrail_height: '1m',
    cargo: [],
    items: [],
    verdict: null,
    verdict_comment: null,
    summary_photos: [],
    signatures: [],
    completed_at: null,
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    ...over,
  };
}

describe('cargoPlatformService config', () => {
  it('registers correct table + pathPrefix', () => {
    expect(captured!.table).toBe('cargo_platform_inspections');
    expect(captured!.pathPrefix).toBe('cargo-platform');
  });

  it('createColumns seeds items, cargo (3 rows), one signatory', () => {
    const cols = captured!.createColumns({ inspectorName: 'Gio' });
    expect(cols.inspector_name).toBe('Gio');
    expect((cols.items as any[]).length).toBe(9);
    expect((cols.cargo as any[]).length).toBe(3);
    expect((cols.signatures as any[]).length).toBe(1);
    expect((cols.signatures as any[])[0].name).toBe('Gio');
  });

  it('createColumns nulls inspector_name when omitted', () => {
    const cols = captured!.createColumns({});
    expect(cols.inspector_name).toBeNull();
    expect((cols.signatures as any[])[0].name).toBe('');
  });
});

describe('cargoPlatformService toModel', () => {
  it('substitutes default items when row.items length != 9', () => {
    const m = captured!.toModel(baseRow({ items: [] }));
    expect(m.items.length).toBe(9);
  });

  it('keeps row.items when length is 9', () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ id: i, status: 'pending' }));
    const m = captured!.toModel(baseRow({ items }));
    expect(m.items).toBe(items);
  });

  it('uses 3 default cargo rows when row.cargo is empty', () => {
    const m = captured!.toModel(baseRow({ cargo: [] }));
    expect(m.cargo.length).toBe(3);
  });

  it('preserves cargo rows when present', () => {
    const cargo = [{ name: 'x' }, { name: 'y' }];
    const m = captured!.toModel(baseRow({ cargo }));
    expect(m.cargo).toBe(cargo);
  });

  it('defaults nullable strings to empty strings', () => {
    const m = captured!.toModel(baseRow({
      company: null, address: null, inspector_name: null,
      floor_zone: null, platform_type_model: null, platform_color_desc: null,
      verdict_comment: null,
    }));
    expect(m.company).toBe('');
    expect(m.address).toBe('');
    expect(m.inspectorName).toBe('');
    expect(m.floorZone).toBe('');
    expect(m.platformTypeModel).toBe('');
    expect(m.platformColorDesc).toBe('');
    expect(m.verdictComment).toBe('');
  });

  it('normalizes signatures array entries with null fallbacks', () => {
    const m = captured!.toModel(baseRow({
      signatures: [
        { name: 'A' } as any,
        { name: 'B', position: 'p', organization: 'o', signature: 'sig', date: '2026-05-20' },
      ],
    }));
    expect(m.signatures.length).toBe(2);
    expect(m.signatures[0].name).toBe('A');
    expect(m.signatures[0].position).toBe('');
    expect(m.signatures[0].signature).toBeNull();
    expect(m.signatures[1].signature).toBe('sig');
  });

  it('provides one empty signatory when signatures is not an array', () => {
    const m = captured!.toModel(baseRow({ signatures: null as any }));
    expect(m.signatures.length).toBe(1);
    expect(m.signatures[0].name).toBe('');
  });

  it('defaults summaryPhotos to [] when not an array', () => {
    const m = captured!.toModel(baseRow({ summary_photos: null as any }));
    expect(m.summaryPhotos).toEqual([]);
  });
});

describe('cargoPlatformService toDb', () => {
  it('returns {} for empty patch', () => {
    expect(captured!.toDb({})).toEqual({});
  });

  it('maps every writable field', () => {
    const out = captured!.toDb({
      company: 'C',
      address: 'A',
      inspectorName: 'N',
      floorZone: 'Z',
      inspectionDate: '2026-05-20',
      platformTypeModel: 'M',
      platformLength: 3,
      platformWidth: 2,
      platformColorDesc: 'red',
      sideGuardrail: 'present' as any,
      frontGuardrail: 'present' as any,
      guardrailHeight: '1m' as any,
      cargo: [] as any,
      items: [] as any,
      verdict: 'pass' as any,
      verdictComment: 'OK',
      summaryPhotos: ['a.jpg'],
    });
    expect(out).toEqual({
      company: 'C',
      address: 'A',
      inspector_name: 'N',
      floor_zone: 'Z',
      inspection_date: '2026-05-20',
      platform_type_model: 'M',
      platform_length_m: 3,
      platform_width_m: 2,
      platform_color_desc: 'red',
      side_guardrail: 'present',
      front_guardrail: 'present',
      guardrail_height: '1m',
      cargo: [],
      items: [],
      verdict: 'pass',
      verdict_comment: 'OK',
      summary_photos: ['a.jpg'],
    });
  });

  it('preserves nulls in length/width', () => {
    expect(captured!.toDb({ platformLength: null, platformWidth: null })).toEqual({
      platform_length_m: null,
      platform_width_m: null,
    });
  });

  it('drops signatures (ephemeral)', () => {
    expect(captured!.toDb({ signatures: [] as any })).toEqual({});
  });
});
