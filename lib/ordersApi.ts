import { supabase } from './supabase';
import type { Order, OrderFormData, OrderDocumentType, RecentRecordsOpts } from '../types/models';

// ── DB ↔ model mapping ────────────────────────────────────────────────────────

type DbRow = {
  id: string;
  project_id: string;
  user_id: string;
  document_type: string;
  form_data: Record<string, unknown>;
  status: string;
  pdf_url: string | null;
  pdf_hash: string | null;
  created_at: string;
  updated_at: string;
};

function toModel(row: DbRow): Order {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    documentType: row.document_type as OrderDocumentType,
    formData: row.form_data as unknown as OrderFormData,
    status: row.status as Order['status'],
    pdfUrl: row.pdf_url,
    pdfHash: row.pdf_hash ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function patchToDb(patch: Partial<Order>): Partial<DbRow> {
  const db: Partial<DbRow> = {};
  if (patch.documentType !== undefined) db.document_type = patch.documentType;
  if (patch.formData !== undefined) db.form_data = patch.formData as unknown as Record<string, unknown>;
  if (patch.status   !== undefined) db.status    = patch.status;
  if (patch.pdfUrl   !== undefined) db.pdf_url   = patch.pdfUrl;
  if (patch.pdfHash  !== undefined) db.pdf_hash  = patch.pdfHash ?? null;
  return db;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const ordersApi = {
  recent: async (opts: RecentRecordsOpts = {}): Promise<Order[]> => {
    let q = supabase.from('orders').select('*');
    if (opts.status) q = q.eq('status', opts.status);
    let t = q.order('created_at', { ascending: false });
    if (opts.limit != null) t = t.limit(opts.limit);
    const { data, error } = await t;
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbRow[]).map(toModel);
  },

  listByProject: async (projectId: string): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbRow[]).map(toModel);
  },

  getById: async (id: string): Promise<Order | null> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toModel(data as DbRow);
  },

  create: async (args: {
    projectId: string;
    documentType: OrderDocumentType;
    formData: OrderFormData;
    status: 'draft' | 'completed';
  }): Promise<Order> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const { data, error } = await supabase
      .from('orders')
      .insert({
        project_id:    args.projectId,
        user_id:       user.id,
        document_type: args.documentType,
        form_data:     args.formData,
        status:        args.status,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  update: async (id: string, patch: Partial<Order>): Promise<Order> => {
    const dbPatch = patchToDb(patch);
    const { data, error } = await supabase
      .from('orders')
      .update(dbPatch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
