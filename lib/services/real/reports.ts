import { supabase } from '../../supabase';
import type { Report } from '../../../types/models';
import { throwIfError } from './_shared';

export const reportsApi = {
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

  create: async (args: { projectId: string; title: string }): Promise<Report> => {
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('Not signed in');
    return throwIfError<Report>(
      await supabase
        .from('reports')
        .insert({
          project_id: args.projectId,
          user_id: user.id,
          title: args.title,
          status: 'draft',
          slides: [],
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
