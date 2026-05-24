import type { Incident } from '../../../types/models';

export const incidentsApi = {
  listByProject: async (_projectId: string): Promise<Incident[]> => [],
  getById: async (_id: string): Promise<Incident | null> => null,
  create: async (_args: Omit<Incident, 'user_id' | 'created_at'>): Promise<Incident> => {
    throw new Error('mock incidentsApi.create not implemented');
  },
  update: async (
    _id: string,
    _patch: Partial<Omit<Incident, 'id' | 'user_id' | 'project_id' | 'created_at'>>,
  ): Promise<Incident> => {
    throw new Error('mock incidentsApi.update not implemented');
  },
  remove: async (_id: string): Promise<void> => {
    throw new Error('mock incidentsApi.remove not implemented');
  },
};
