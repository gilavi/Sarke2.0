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

// Force module evaluation so `captured` is populated.
await import('../../lib/bobcatService');
const { LARGE_LOADER_TEMPLATE_ID, LARGE_LOADER_ITEMS } = await import('../../types/bobcat');

function baseRow(over: Partial<any> = {}): any {
  return {
    id: 'i1',
    project_id: 'p1',
    template_id: 't1',
    user_id: 'u1',
    status: 'draft',
    company: 'Acme',
    address: '5 Foo St',
    equipment_model: 'Bobcat S650',
    registration_number: 'B-001',
    inspection_date: '2026-05-20',
    inspection_type: 'periodic',
    inspector_name: 'Gio',
    items: [],
    verdict: null,
    notes: null,
    inspector_signature: null,
    completed_at: null,
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    ...over,
  };
}

describe('bobcatService config registration', () => {
  it('registered the bobcat_inspections table with pathPrefix=bobcat', () => {
    expect(captured!.table).toBe('bobcat_inspections');
    expect(captured!.pathPrefix).toBe('bobcat');
  });

  it('createColumns seeds inspector_name and default items', () => {
    const cols = captured!.createColumns({ inspectorName: 'Gio', templateId: 't1' });
    expect(cols.inspector_name).toBe('Gio');
    expect(Array.isArray(cols.items)).toBe(true);
    expect((cols.items as any[]).length).toBe(30);
  });

  it('createColumns nulls inspector_name when not provided', () => {
    const cols = captured!.createColumns({ templateId: 't1' });
    expect(cols.inspector_name).toBeNull();
  });

  it('createColumns uses large-loader catalog when templateId matches', () => {
    const cols = captured!.createColumns({ inspectorName: 'Gio', templateId: LARGE_LOADER_TEMPLATE_ID });
    expect((cols.items as any[]).length).toBe(LARGE_LOADER_ITEMS.length);
  });
});

describe('bobcatService toModel', () => {
  it('maps snake_case DB columns to camelCase model fields', () => {
    const model = captured!.toModel(baseRow());
    expect(model.id).toBe('i1');
    expect(model.projectId).toBe('p1');
    expect(model.templateId).toBe('t1');
    expect(model.equipmentModel).toBe('Bobcat S650');
    expect(model.registrationNumber).toBe('B-001');
    expect(model.inspectionDate).toBe('2026-05-20');
    expect(model.inspectionType).toBe('periodic');
    expect(model.inspectorName).toBe('Gio');
    expect(model.createdAt).toBe('2026-05-20T10:00:00Z');
  });

  it('substitutes default items when row.items length != expected (30 for standard)', () => {
    const model = captured!.toModel(baseRow({ items: [] }));
    expect(model.items.length).toBe(30);
  });

  it('keeps row.items when length matches expected', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: i, status: 'pending' }));
    const model = captured!.toModel(baseRow({ items }));
    expect(model.items).toBe(items);
  });

  it('uses the large-loader expected length when template matches', () => {
    const model = captured!.toModel(baseRow({ template_id: LARGE_LOADER_TEMPLATE_ID, items: [] }));
    expect(model.items.length).toBe(LARGE_LOADER_ITEMS.length);
  });

  it('passes through null verdict / inspection_type', () => {
    const model = captured!.toModel(baseRow({ verdict: null, inspection_type: null }));
    expect(model.verdict).toBeNull();
    expect(model.inspectionType).toBeNull();
  });
});

describe('bobcatService toDb', () => {
  it('returns {} for an empty patch', () => {
    expect(captured!.toDb({})).toEqual({});
  });

  it('maps single fields to snake_case', () => {
    expect(captured!.toDb({ equipmentModel: 'Bobcat S650' })).toEqual({
      equipment_model: 'Bobcat S650',
    });
    expect(captured!.toDb({ registrationNumber: 'B-9' })).toEqual({
      registration_number: 'B-9',
    });
    expect(captured!.toDb({ inspectionDate: '2026-05-20' })).toEqual({
      inspection_date: '2026-05-20',
    });
  });

  it('preserves null values in the mapping', () => {
    expect(captured!.toDb({ registrationNumber: null })).toEqual({ registration_number: null });
  });

  it('omits keys not present in the patch (partial update semantics)', () => {
    const out = captured!.toDb({ company: 'X' });
    expect(out).toEqual({ company: 'X' });
    expect('address' in out).toBe(false);
  });

  it('drops inspectorSignature (ephemeral, never persisted)', () => {
    const out = captured!.toDb({ inspectorSignature: 'data:image/png;base64,X' } as any);
    expect('inspector_signature' in out).toBe(false);
    expect(out).toEqual({});
  });

  it('maps all writable fields together', () => {
    const items = [{ id: 1, status: 'ok' }];
    const out = captured!.toDb({
      company: 'C',
      address: 'A',
      equipmentModel: 'M',
      registrationNumber: 'R',
      inspectionDate: '2026-05-20',
      inspectionType: 'periodic' as any,
      inspectorName: 'I',
      items: items as any,
      verdict: 'pass' as any,
      notes: 'N',
    });
    expect(out).toEqual({
      company: 'C',
      address: 'A',
      equipment_model: 'M',
      registration_number: 'R',
      inspection_date: '2026-05-20',
      inspection_type: 'periodic',
      inspector_name: 'I',
      items,
      verdict: 'pass',
      notes: 'N',
    });
  });
});
