import { supabase } from './supabase';
import { isMissingDbObjectError } from './services/real/_shared';
import type { Briefing, BriefingParticipant, RecentRecordsOpts } from '../types/models';

// ── DB ↔ model mapping ────────────────────────────────────────────────────────

type DbRow = {
  id: string;
  project_id: string;
  user_id: string;
  date_time: string;
  topics: string[];
  participants: BriefingParticipant[];
  inspector_signature: string | null;
  inspector_name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function toModel(row: DbRow): Briefing {
  return {
    id: row.id,
    projectId: row.project_id,
    dateTime: row.date_time,
    topics: row.topics ?? [],
    participants: (row.participants ?? []) as BriefingParticipant[],
    inspectorSignature: row.inspector_signature,
    inspectorName: row.inspector_name ?? '',
    status: row.status as Briefing['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function patchToDb(patch: Partial<Briefing>): Partial<DbRow> {
  const db: Partial<DbRow> = {};
  if (patch.dateTime !== undefined)          db.date_time           = patch.dateTime;
  if (patch.topics !== undefined)            db.topics              = patch.topics;
  if (patch.participants !== undefined)      db.participants        = patch.participants;
  if (patch.inspectorSignature !== undefined) db.inspector_signature = patch.inspectorSignature;
  if (patch.inspectorName !== undefined)     db.inspector_name      = patch.inspectorName;
  if (patch.status !== undefined)            db.status              = patch.status;
  return db;
}

// ── Lean list reads ───────────────────────────────────────────────────────────
// List surfaces (Home widget, History, Drafts, project detail, calendar) render
// only topics / participant count / date — never the signature payloads that
// live INSIDE the row (participants[].signature + inspector_signature are base64
// PNGs, hundreds of KB per multi-participant briefing). The briefings_list_lean
// view (migration 20260708120000_lean_list_feeds.sql) returns the same DbRow
// shape with those payloads nulled, shrinking the 50-row feed by orders of
// magnitude on every warm-up fetch and AsyncStorage cache persist. Detail/PDF
// paths keep the full row via getById. When the view isn't deployed yet the
// first failed read flips `leanViewAvailable` and every list read falls back to
// the base table for the rest of the session.

let leanViewAvailable = true;

async function fetchList(opts: {
  projectId?: string;
  status?: string;
  limit?: number;
  /** Only applied alongside `limit` (see RecentRecordsOpts). */
  offset?: number;
  orderBy: 'created_at' | 'date_time';
}): Promise<Briefing[]> {
  const run = (table: string) => {
    let q = supabase.from(table).select('*');
    if (opts.projectId) q = q.eq('project_id', opts.projectId);
    if (opts.status) q = q.eq('status', opts.status);
    let t = q.order(opts.orderBy, { ascending: false });
    if (opts.limit != null) {
      t = opts.offset ? t.range(opts.offset, opts.offset + opts.limit - 1) : t.limit(opts.limit);
    }
    return t;
  };
  let res = leanViewAvailable ? await run('briefings_list_lean') : null;
  if (res?.error && isMissingDbObjectError(res.error)) {
    leanViewAvailable = false;
    res = null;
  }
  if (!res) res = await run('briefings');
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as DbRow[]).map(toModel);
}

// ── API ───────────────────────────────────────────────────────────────────────

export const briefingsApi = {
  /** List feed — signature payloads stripped (see fetchList). */
  recent: async (opts: RecentRecordsOpts = {}): Promise<Briefing[]> => {
    return fetchList({ status: opts.status, limit: opts.limit, offset: opts.offset, orderBy: 'created_at' });
  },

  /** List feed — signature payloads stripped (see fetchList). */
  listByProject: async (projectId: string): Promise<Briefing[]> => {
    return fetchList({ projectId, orderBy: 'created_at' });
  },

  getById: async (id: string): Promise<Briefing | null> => {
    const { data, error } = await supabase
      .from('briefings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toModel(data as DbRow);
  },

  create: async (args: {
    projectId: string;
    dateTime: string;
    topics: string[];
    participants: BriefingParticipant[];
    inspectorName: string;
    /** Optional fields let an offline UPDATE coalesce into a still-queued
     *  CREATE (lib/outbox) without losing signatures/completion. */
    id?: string;
    status?: 'draft' | 'completed';
    inspectorSignature?: string | null;
  }): Promise<Briefing> => {
    // getSession reads the locally cached session (getUser hits the network).
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('Not signed in');

    const { data, error } = await supabase
      .from('briefings')
      .insert({
        ...(args.id ? { id: args.id } : {}),
        project_id: args.projectId,
        user_id: user.id,
        date_time: args.dateTime,
        topics: args.topics,
        participants: args.participants,
        inspector_signature: args.inspectorSignature ?? null,
        inspector_name: args.inspectorName,
        status: args.status ?? 'draft',
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  update: async (id: string, patch: Partial<Briefing>): Promise<Briefing> => {
    const dbPatch = patchToDb(patch);
    const { data, error } = await supabase
      .from('briefings')
      .update(dbPatch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('briefings').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  /** Every completed briefing (calendar feed) — signature payloads stripped. */
  listAll: async (): Promise<Briefing[]> => {
    return fetchList({ status: 'completed', orderBy: 'date_time' });
  },
};
