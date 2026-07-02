import { supabase } from './supabase';
import type {
  RiskAssessment,
  RADocType,
  RAEntry,
  RASignatory,
} from '../types/riskAssessment';

// ── DB ↔ model ─────────────────────────────────────────────────────────────────

type DbRow = {
  id: string;
  project_id: string;
  user_id: string;
  doc_type: RADocType;
  header: Record<string, string>;
  entries: RAEntry[];
  signatories: Record<string, RASignatory>;
  status: string;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
};

function toModel(row: DbRow): RiskAssessment {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    docType: row.doc_type,
    header: row.header ?? {},
    entries: Array.isArray(row.entries) ? row.entries : [],
    signatories: row.signatories ?? {},
    status: row.status as RiskAssessment['status'],
    pdfUrl: row.pdf_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface RAPatch {
  header?: Record<string, string>;
  entries?: RAEntry[];
  signatories?: Record<string, RASignatory>;
  status?: 'draft' | 'completed';
  pdfUrl?: string | null;
}

// ── Risk-assessment API ────────────────────────────────────────────────────────

export const riskAssessmentApi = {
  create: async (args: {
    projectId: string;
    docType: RADocType;
    header?: Record<string, string>;
    /** Optional fields let an offline UPDATE coalesce into a still-queued
     *  CREATE (lib/outbox) without losing edits. */
    id?: string;
    entries?: RAEntry[];
    signatories?: Record<string, RASignatory>;
    status?: 'draft' | 'completed';
  }): Promise<RiskAssessment> => {
    // getSession reads the locally cached session (getUser hits the network).
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('Not signed in');
    const { data, error } = await supabase
      .from('risk_assessments')
      .insert({
        ...(args.id ? { id: args.id } : {}),
        project_id: args.projectId,
        user_id: user.id,
        doc_type: args.docType,
        header: args.header ?? {},
        entries: args.entries ?? [],
        signatories: args.signatories ?? {},
        status: args.status ?? 'draft',
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toModel(data as DbRow);
  },

  getById: async (id: string): Promise<RiskAssessment | null> => {
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toModel(data as DbRow);
  },

  listByProject: async (projectId: string): Promise<RiskAssessment[]> => {
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as DbRow[]).map(toModel);
  },

  patch: async (id: string, patch: RAPatch): Promise<void> => {
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.header !== undefined) row.header = patch.header;
    if (patch.entries !== undefined) row.entries = patch.entries;
    if (patch.signatories !== undefined) row.signatories = patch.signatories;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.pdfUrl !== undefined) row.pdf_url = patch.pdfUrl;
    const { error } = await supabase.from('risk_assessments').update(row).eq('id', id);
    if (error) throw new Error(error.message);
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('risk_assessments').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
