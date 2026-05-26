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

await import('../../lib/forkliftService');

function baseRow(over: Partial<any> = {}): any {
  return {
    id: 'f1',
    project_id: 'p1',
    template_id: 't1',
    user_id: 'u1',
    status: 'draft',
    company: 'Acme',
    address: '5 Foo St',
    inventory_number: 'INV-7',
    brand_model: 'Toyota 8FBE',
    engine_type: 'electric',
    inspection_date: '2026-05-20',
    inspector_name: 'Gio',
    items: [],
    verdict: null,
    notes: null,
    summary_photos: ['p1.jpg'],
    qual_doc_path: 'docs/q.pdf',
    signer_name: 'Mr. X',
    signer_position: 'Engineer',
    signer_phone: '+995555111222',
    signer_signature: null,
    completed_at: null,
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    ...over,
  };
}

describe('forkliftService config', () => {
  it('registered forklift_inspections table with pathPrefix=forklift', () => {
    expect(captured!.table).toBe('forklift_inspections');
    expect(captured!.pathPrefix).toBe('forklift');
  });

  it('createColumns seeds 39 default items and empty summary_photos', () => {
    const cols = captured!.createColumns({ inspectorName: 'Gio' });
    expect(cols.inspector_name).toBe('Gio');
    expect((cols.items as any[]).length).toBe(39);
    expect(cols.summary_photos).toEqual([]);
  });

  it('createColumns nulls inspector_name when omitted', () => {
    const cols = captured!.createColumns({});
    expect(cols.inspector_name).toBeNull();
  });
});

describe('forkliftService toModel', () => {
  it('maps DB snake_case to camelCase', () => {
    const model = captured!.toModel(baseRow());
    expect(model.inventoryNumber).toBe('INV-7');
    expect(model.brandModel).toBe('Toyota 8FBE');
    expect(model.engineType).toBe('electric');
    expect(model.summaryPhotos).toEqual(['p1.jpg']);
    expect(model.qualDocPath).toBe('docs/q.pdf');
    expect(model.signerName).toBe('Mr. X');
    expect(model.signerPosition).toBe('Engineer');
    expect(model.signerPhone).toBe('+995555111222');
  });

  it('substitutes default items when row.items length != 39', () => {
    const model = captured!.toModel(baseRow({ items: [] }));
    expect(model.items.length).toBe(39);
  });

  it('keeps row.items when length is 39', () => {
    const items = Array.from({ length: 39 }, (_, i) => ({ id: i, status: 'pending' }));
    const model = captured!.toModel(baseRow({ items }));
    expect(model.items).toBe(items);
  });

  it('defaults summary_photos to [] when not an array', () => {
    const model = captured!.toModel(baseRow({ summary_photos: null as any }));
    expect(model.summaryPhotos).toEqual([]);
  });

  it('passes through null engine_type as null', () => {
    const model = captured!.toModel(baseRow({ engine_type: null }));
    expect(model.engineType).toBeNull();
  });
});

describe('forkliftService toDb', () => {
  it('returns {} for empty patch', () => {
    expect(captured!.toDb({})).toEqual({});
  });

  it('maps engineType, summaryPhotos, qualDocPath', () => {
    expect(captured!.toDb({ engineType: 'electric' as any })).toEqual({ engine_type: 'electric' });
    expect(captured!.toDb({ summaryPhotos: ['a.jpg'] })).toEqual({ summary_photos: ['a.jpg'] });
    expect(captured!.toDb({ qualDocPath: 'q.pdf' })).toEqual({ qual_doc_path: 'q.pdf' });
  });

  it('preserves null values in patch', () => {
    expect(captured!.toDb({ qualDocPath: null })).toEqual({ qual_doc_path: null });
  });

  it('drops signer* fields (ephemeral, never persisted)', () => {
    const out = captured!.toDb({
      signerName: 'X',
      signerPosition: 'Y',
      signerPhone: '+1',
      signerSignature: 'data:...',
    } as any);
    expect(out).toEqual({});
  });

  it('omits keys not present in the patch', () => {
    const out = captured!.toDb({ inventoryNumber: 'INV-1' });
    expect(out).toEqual({ inventory_number: 'INV-1' });
    expect('brand_model' in out).toBe(false);
  });

  it('maps every supported writable field', () => {
    const out = captured!.toDb({
      company: 'C',
      address: 'A',
      inventoryNumber: 'I',
      brandModel: 'B',
      engineType: 'diesel' as any,
      inspectionDate: '2026-05-20',
      inspectorName: 'N',
      items: [] as any,
      verdict: 'pass' as any,
      notes: 'X',
      summaryPhotos: ['a.jpg'],
      qualDocPath: 'q.pdf',
    });
    expect(out).toEqual({
      company: 'C',
      address: 'A',
      inventory_number: 'I',
      brand_model: 'B',
      engine_type: 'diesel',
      inspection_date: '2026-05-20',
      inspector_name: 'N',
      items: [],
      verdict: 'pass',
      notes: 'X',
      summary_photos: ['a.jpg'],
      qual_doc_path: 'q.pdf',
    });
  });
});
