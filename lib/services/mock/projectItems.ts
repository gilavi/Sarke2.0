import type { ProjectItem } from '../../../types/models';
import { load, now, save, uuid } from './_store';

export const projectItemsApi = {
  listByProject: async (projectId: string): Promise<ProjectItem[]> => {
    const db = await load();
    return db.project_items
      .filter(p => p.project_id === projectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  create: async (args: {
    projectId: string;
    name: string;
    category?: string | null;
  }): Promise<ProjectItem> => {
    const db = await load();
    const item: ProjectItem = {
      id: uuid(),
      project_id: args.projectId,
      name: args.name,
      category: args.category ?? null,
      created_at: now(),
    };
    db.project_items.push(item);
    await save();
    return item;
  },
  remove: async (id: string) => {
    const db = await load();
    db.project_items = db.project_items.filter(p => p.id !== id);
    await save();
  },
};
