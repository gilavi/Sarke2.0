import type { Question, Template } from '../../../types/models';
import { load } from './_store';

export const templatesApi = {
  list: async (): Promise<Template[]> => {
    const db = await load();
    return [...db.templates];
  },
  getById: async (id: string): Promise<Template | null> => {
    const db = await load();
    return db.templates.find(t => t.id === id) ?? null;
  },
  questions: async (templateId: string): Promise<Question[]> => {
    const db = await load();
    return db.questions
      .filter(q => q.template_id === templateId)
      .sort((a, b) =>
        a.section === b.section ? a.order - b.order : a.section - b.section,
      );
  },
};
