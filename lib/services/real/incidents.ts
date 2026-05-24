import { supabase } from '../../supabase';
import type { Incident } from '../../../types/models';
import { throwIfError } from './_shared';

export const incidentsApi = {
  listByProject: async (projectId: string): Promise<Incident[]> => {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Incident[];
  },

  getById: async (id: string): Promise<Incident | null> => {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as Incident | null) ?? null;
  },

  create: async (args: Omit<Incident, 'user_id' | 'created_at'>): Promise<Incident> => {
    const user = (await supabase.auth.getSession()).data.session?.user ?? null;
    if (!user) throw new Error('Not signed in');
    return throwIfError<Incident>(
      await supabase
        .from('incidents')
        .insert({ ...args, user_id: user.id })
        .select()
        .single(),
    );
  },

  update: async (
    id: string,
    patch: Partial<Omit<Incident, 'id' | 'user_id' | 'project_id' | 'created_at'>>,
  ): Promise<Incident> => {
    return throwIfError<Incident>(
      await supabase.from('incidents').update(patch).eq('id', id).select().single(),
    );
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('incidents').delete().eq('id', id);
    if (error) throw error;
  },
};
