import { supabase } from './supabase';
import { isMissingDbObjectError } from './services/real/_shared';
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

// ── Lean list reads ───────────────────────────────────────────────────────────
// List surfaces (Home widget, History, Drafts, project detail) render only
// document_type + created_at — never form_data, which embeds base64
// director/appointed/operator signatures for several order types (~30-80 KB per
// signed order vs ~0.3 KB rendered). The orders_list_lean view (migration
// 20260708120000_lean_list_feeds.sql) returns the same DbRow shape with just
// those signature keys removed from form_data; all other form fields survive.
// Edit/detail/PDF paths keep the full row via getById. When the view isn't
// deployed yet the first failed read flips `leanViewAvailable` and every list
// read falls back to the base table for the rest of the session.

let leanViewAvailable = true;

async function fetchList(opts: {
  projectId?: string;
  status?: string;
  limit?: number;
}): Promise<Order[]> {
  const run = (table: string) => {
    let q = supabase.from(table).select('*');
    if (opts.projectId) q = q.eq('project_id', opts.projectId);
    if (opts.status) q = q.eq('status', opts.status);
    let t = q.order('created_at', { ascending: false });
    if (opts.limit != null) t = t.limit(opts.limit);
    return t;
  };
  let res = leanViewAvailable ? await run('orders_list_lean') : null;
  if (res?.error && isMissingDbObjectError(res.error)) {
    leanViewAvailable = false;
    res = null;
  }
  if (!res) res = await run('orders');
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as DbRow[]).map(toModel);
}

// ── API ───────────────────────────────────────────────────────────────────────

export const ordersApi = {
  /** List feed — form_data signature blobs stripped (see fetchList). */
  recent: async (opts: RecentRecordsOpts = {}): Promise<Order[]> => {
    return fetchList({ status: opts.status, limit: opts.limit });
  },

  /** List feed — form_data signature blobs stripped (see fetchList). */
  listByProject: async (projectId: string): Promise<Order[]> => {
    return fetchList({ projectId });
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
    /** Client-generated id — required for offline (outbox) creates. */
    id?: string;
    /** From a pdf patch coalesced into a queued create (lib/outbox). */
    pdfUrl?: string | null;
    pdfHash?: string;
  }): Promise<Order> => {
    // getSession reads the locally cached session (getUser is a network
    // round-trip and would hang the offline create path).
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('Not signed in');

    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...(args.id ? { id: args.id } : {}),
        ...(args.pdfUrl !== undefined ? { pdf_url: args.pdfUrl } : {}),
        ...(args.pdfHash !== undefined ? { pdf_hash: args.pdfHash } : {}),
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
