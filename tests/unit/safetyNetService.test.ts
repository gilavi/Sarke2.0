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

await import('../../lib/safetyNetService');

function baseRow(over: Partial<any> = {}): any {
  return {
    id: 's1',
    project_id: 'p1',
    template_id: 't1',
    user_id: 'u1',
    status: 'draft',
    company: 'Acme',
    address: 'A',
    inspector_name: 'Gio',
    inspection_date: '2026-05-20',
    manufacturer: 'Mfg',
    net_size: '4x4',
    post_size: '2m',
    post_count: 4,
    post_anchor_count: 8,
    anchor_point_count: 8,
    edge_rope_count: 2,
    cell_side: '10',
    working_distance: '3',
    certificate: 'yes',
    items: [],
    load_test_rows: [],
    post_test_items: [],
    verdict: null,
    verdict_comment: null,
    signatures: [],
    qual_doc_path: null,
    summary_photos: [],
    completed_at: null,
    created_at: '2026-05-20T10:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    ...over,
  };
}

describe('safetyNetService config', () => {
  it('registers correct table + pathPrefix', () => {
    expect(captured!.table).toBe('safety_net_inspections');
    expect(captured!.pathPrefix).toBe('safety-net');
  });

  it('createColumns seeds items, load test rows (3), post test items, 2 signatories', () => {
    const cols = captured!.createColumns({ inspectorName: 'Gio' });
    expect(cols.inspector_name).toBe('Gio');
    expect((cols.items as any[]).length).toBe(10);
    expect((cols.load_test_rows as any[]).length).toBe(3);
    expect((cols.post_test_items as any[]).length).toBe(5);
    expect((cols.signatures as any[]).length).toBe(2);
    expect((cols.signatures as any[])[0].name).toBe('Gio');
    expect((cols.signatures as any[])[1].name).toBe('');
  });

  it('createColumns nulls inspector_name when omitted', () => {
    const cols = captured!.createColumns({});
    expect(cols.inspector_name).toBeNull();
  });
});

describe('safetyNetService toModel', () => {
  it('substitutes default items when length mismatched', () => {
    const m = captured!.toModel(baseRow({ items: [], post_test_items: [], load_test_rows: [] }));
    expect(m.items.length).toBe(10);
    expect(m.postTestItems.length).toBe(5);
    expect(m.loadTestRows.length).toBe(3);
  });

  it('keeps items when length matches expected', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    const postTest = Array.from({ length: 5 }, (_, i) => ({ id: i }));
    const m = captured!.toModel(baseRow({ items, post_test_items: postTest }));
    expect(m.items).toBe(items);
    expect(m.postTestItems).toBe(postTest);
  });

  it('defaults nullable strings to empty', () => {
    const m = captured!.toModel(baseRow({
      company: null, address: null, inspector_name: null,
      manufacturer: null, net_size: null, post_size: null,
      cell_side: null, working_distance: null, verdict_comment: null,
    }));
    expect(m.company).toBe('');
    expect(m.address).toBe('');
    expect(m.inspectorName).toBe('');
    expect(m.manufacturer).toBe('');
    expect(m.netSize).toBe('');
    expect(m.postSize).toBe('');
    expect(m.cellSide).toBe('');
    expect(m.workingDistance).toBe('');
    expect(m.verdictComment).toBe('');
  });

  it('normalizes the signatures tuple to length 2', () => {
    const m = captured!.toModel(baseRow({ signatures: [{ name: 'A' }] as any }));
    expect(m.signatures.length).toBe(2);
    expect(m.signatures[0].name).toBe('A');
    expect(m.signatures[1].name).toBe('');
  });

  it('defaults summaryPhotos to [] when not an array', () => {
    const m = captured!.toModel(baseRow({ summary_photos: null as any }));
    expect(m.summaryPhotos).toEqual([]);
  });

  it('passes through numeric nullable fields', () => {
    const m = captured!.toModel(baseRow({ post_count: null, edge_rope_count: 7 }));
    expect(m.postCount).toBeNull();
    expect(m.edgeRopeCount).toBe(7);
  });
});

describe('safetyNetService toDb', () => {
  it('returns {} for empty patch', () => {
    expect(captured!.toDb({})).toEqual({});
  });

  it('maps every writable field to snake_case', () => {
    const out = captured!.toDb({
      company: 'C',
      address: 'A',
      inspectorName: 'N',
      inspectionDate: '2026-05-20',
      manufacturer: 'M',
      netSize: '4x4',
      postSize: '2m',
      postCount: 4,
      postAnchorCount: 8,
      anchorPointCount: 8,
      edgeRopeCount: 2,
      cellSide: '10',
      workingDistance: '3',
      certificate: 'yes' as any,
      items: [] as any,
      loadTestRows: [] as any,
      postTestItems: [] as any,
      verdict: 'pass' as any,
      verdictComment: 'OK',
      qualDocPath: 'p.pdf',
      summaryPhotos: ['a.jpg'],
    });
    expect(out).toEqual({
      company: 'C',
      address: 'A',
      inspector_name: 'N',
      inspection_date: '2026-05-20',
      manufacturer: 'M',
      net_size: '4x4',
      post_size: '2m',
      post_count: 4,
      post_anchor_count: 8,
      anchor_point_count: 8,
      edge_rope_count: 2,
      cell_side: '10',
      working_distance: '3',
      certificate: 'yes',
      items: [],
      load_test_rows: [],
      post_test_items: [],
      verdict: 'pass',
      verdict_comment: 'OK',
      qual_doc_path: 'p.pdf',
      summary_photos: ['a.jpg'],
    });
  });

  it('drops signatures (ephemeral)', () => {
    expect(captured!.toDb({ signatures: [{}, {}] as any })).toEqual({});
  });
});
