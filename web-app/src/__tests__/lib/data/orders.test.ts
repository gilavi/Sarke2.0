import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));

import { supabase } from '@/lib/supabase';
import {
  ORDER_DOCUMENT_TYPE_LABEL,
  listOrders,
  listOrdersByProject,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  type OrderDocumentType,
} from '@/lib/data/orders';
import { makeBuilder, authedUser, anonUser } from '../../helpers/supabaseChain';

const from = supabase.from as unknown as Mock;
const getUser = supabase.auth.getUser as unknown as Mock;

const dbRow = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  project_id: 'p1',
  user_id: 'u1',
  document_type: 'fire_safety_order',
  form_data: { orderNumber: '5' },
  status: 'draft',
  pdf_url: null,
  pdf_hash: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-02-02T00:00:00Z',
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('ORDER_DOCUMENT_TYPE_LABEL', () => {
  it('has a Georgian label for every order document type', () => {
    const types: OrderDocumentType[] = [
      'labor_safety_specialist',
      'alcohol_control',
      'fire_safety_order',
      'fire_safety_order_enterprise',
    ];
    for (const t of types) {
      expect(ORDER_DOCUMENT_TYPE_LABEL[t]).toBeTruthy();
    }
  });
});

describe('listOrders', () => {
  it('maps DB rows to camelCase models ordered by created_at desc', async () => {
    const b = makeBuilder({ data: [dbRow()], error: null });
    from.mockReturnValue(b);
    const [order] = await listOrders();
    expect(order).toEqual({
      id: 'o1',
      projectId: 'p1',
      userId: 'u1',
      documentType: 'fire_safety_order',
      formData: { orderNumber: '5' },
      status: 'draft',
      pdfUrl: null,
      pdfHash: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-02-02T00:00:00Z',
    });
    expect(from).toHaveBeenCalledWith('orders');
    expect(b.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('falls back updatedAt to createdAt when updated_at is null', async () => {
    from.mockReturnValue(makeBuilder({ data: [dbRow({ updated_at: null })], error: null }));
    const [order] = await listOrders();
    expect(order.updatedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('throws the error message', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    await expect(listOrders()).rejects.toThrow('boom');
  });
});

describe('listOrdersByProject', () => {
  it('filters by project_id', async () => {
    const b = makeBuilder({ data: [], error: null });
    from.mockReturnValue(b);
    await listOrdersByProject('p7');
    expect(b.eq).toHaveBeenCalledWith('project_id', 'p7');
  });
});

describe('getOrder', () => {
  it('returns the mapped model', async () => {
    from.mockReturnValue(makeBuilder({ data: dbRow(), error: null }));
    expect((await getOrder('o1'))?.id).toBe('o1');
  });

  it('returns null when no row', async () => {
    from.mockReturnValue(makeBuilder({ data: null, error: null }));
    expect(await getOrder('nope')).toBeNull();
  });
});

describe('createOrder', () => {
  it('inserts the order for the authenticated user', async () => {
    getUser.mockResolvedValue(authedUser('u9'));
    const b = makeBuilder({ data: dbRow({ id: 'new', user_id: 'u9' }), error: null });
    from.mockReturnValue(b);

    const result = await createOrder({
      projectId: 'p1',
      documentType: 'alcohol_control',
      formData: {} as never,
      status: 'draft',
    });

    expect(b.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'p1',
        user_id: 'u9',
        document_type: 'alcohol_control',
        status: 'draft',
      }),
    );
    expect(result.id).toBe('new');
  });

  it('throws when not signed in', async () => {
    getUser.mockResolvedValue(anonUser());
    await expect(
      createOrder({ projectId: 'p1', documentType: 'fire_safety_order', formData: {} as never, status: 'draft' }),
    ).rejects.toThrow('Not signed in');
  });
});

describe('updateOrder', () => {
  it('only includes the provided patch keys', async () => {
    const b = makeBuilder({ data: dbRow({ status: 'completed' }), error: null });
    from.mockReturnValue(b);
    await updateOrder('o1', { status: 'completed' });
    expect(b.update).toHaveBeenCalledWith({ status: 'completed' });
    expect(b.eq).toHaveBeenCalledWith('id', 'o1');
  });

  it('maps pdfUrl/pdfHash and coerces a null hash', async () => {
    const b = makeBuilder({ data: dbRow(), error: null });
    from.mockReturnValue(b);
    await updateOrder('o1', { pdfUrl: 'https://x/p.pdf', pdfHash: null });
    expect(b.update).toHaveBeenCalledWith({ pdf_url: 'https://x/p.pdf', pdf_hash: null });
  });
});

describe('deleteOrder', () => {
  it('deletes by id', async () => {
    const b = makeBuilder({ error: null });
    from.mockReturnValue(b);
    await deleteOrder('o1');
    expect(b.delete).toHaveBeenCalled();
    expect(b.eq).toHaveBeenCalledWith('id', 'o1');
  });
});
