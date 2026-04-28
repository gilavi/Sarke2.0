import { supabase } from './supabase';
import type { Briefing, BriefingParticipant } from '../types/models';

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

// ── API ───────────────────────────────────────────────────────────────────────

export const briefingsApi = {
  listByProject: async (projectId: string): Promise<Briefing[]> => {
    const { data, error } = await supabase
      .from('briefings')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbRow[]).map(toModel);
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
  }): Promise<Briefing> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const { data, error } = await supabase
      .from('briefings')
      .insert({
        project_id: args.projectId,
        user_id: user.id,
        date_time: args.dateTime,
        topics: args.topics,
        participants: args.participants,
        inspector_signature: null,
        inspector_name: args.inspectorName,
        status: 'draft',
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
};
