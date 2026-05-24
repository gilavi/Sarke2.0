import { supabase } from '../../supabase';
import type { ProjectItem } from '../../../types/models';
import { throwIfError } from './_shared';

export const projectItemsApi = {
  listByProject: async (projectId: string): Promise<ProjectItem[]> => {
    const { data, error } = await supabase
      .from('project_items')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  create: async (args: { projectId: string; name: string; category?: string | null }): Promise<ProjectItem> => {
    return throwIfError<ProjectItem>(
      await supabase
        .from('project_items')
        .insert({
          project_id: args.projectId,
          name: args.name,
          category: args.category ?? null,
        })
        .select()
        .single(),
    );
  },
  remove: async (id: string) => {
    const { error } = await supabase.from('project_items').delete().eq('id', id);
    if (error) throw error;
  },
};
