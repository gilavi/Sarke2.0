import { supabase } from '../../supabase';
import { isQuestion, isTemplate } from '../../guards';
import type { Question, Template } from '../../../types/models';
import { listOrThrow, throwIfErrorMaybe } from './_shared';

export const templatesApi = {
  list: async (): Promise<Template[]> => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('is_system', { ascending: false })
      .order('created_at');
    if (error) throw error;
    return data ?? [];
  },
  getById: async (id: string): Promise<Template | null> => {
    return throwIfErrorMaybe<Template>(
      await supabase.from('templates').select('*').eq('id', id).maybeSingle(),
      { guard: isTemplate, context: 'templatesApi.getById' },
    );
  },
  questions: async (templateId: string): Promise<Question[]> => {
    return listOrThrow<Question>(
      await supabase
        .from('questions')
        .select('*')
        .eq('template_id', templateId)
        .order('section')
        .order('order'),
      { guard: isQuestion, context: 'templatesApi.questions' },
    );
  },
};
