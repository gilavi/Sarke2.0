import { supabase } from '../../supabase';
import type { Report, RecentRecordsOpts } from '../../../types/models';
import { throwIfError } from './_shared';

export const reportsApi = {
  recent: async (opts: RecentRecordsOpts = {}): Promise<Report[]> => {
    let q = supabase.from('reports').select('*');
    if (opts.status) q = q.eq('status', opts.status);
    let t = q.order('created_at', { ascending: false });
    if (opts.limit != null) t = t.limit(opts.limit);
    const { data, error } = await t;
    if (error) throw error;
    return (data ?? []) as Report[];
  },

  listByProject: async (projectId: string): Promise<Report[]> => {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Report[];
  },

  getById: async (id: string): Promise<Report | null> => {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Report | null) ?? null;
  },

  create: async (args: {
    projectId: string;
    title: string;
    /** Optional fields let an offline UPDATE coalesce into a still-queued
     *  CREATE (lib/outbox) without losing slide edits. */
    id?: string;
    slides?: Report['slides'];
    status?: Report['status'];
  }): Promise<Report> => {
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('Not signed in');
    return throwIfError<Report>(
      await supabase
        .from('reports')
        .insert({
          ...(args.id ? { id: args.id } : {}),
          project_id: args.projectId,
          user_id: user.id,
          title: args.title,
          status: args.status ?? 'draft',
          slides: args.slides ?? [],
        })
        .select()
        .single(),
    );
  },

  update: async (
    id: string,
    patch: Partial<Pick<Report, 'title' | 'status' | 'slides' | 'pdf_url' | 'pdf_hash'>>,
  ): Promise<Report> => {
    return throwIfError<Report>(
      await supabase.from('reports').update(patch).eq('id', id).select().single(),
    );
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw error;
  },
};
