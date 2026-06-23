import type { Report, RecentRecordsOpts } from '../../../types/models';

export const reportsApi = {
  recent: async (_opts: RecentRecordsOpts = {}): Promise<Report[]> => [],
  listByProject: async (_projectId: string): Promise<Report[]> => [],
  getById: async (_id: string): Promise<Report | null> => null,
  create: async (_args: { projectId: string; title: string }): Promise<Report> => {
    throw new Error('mock reportsApi.create not implemented');
  },
  update: async (
    _id: string,
    _patch: Partial<Pick<Report, 'title' | 'status' | 'slides' | 'pdf_url'>>,
  ): Promise<Report> => {
    throw new Error('mock reportsApi.update not implemented');
  },
  remove: async (_id: string): Promise<void> => {
    throw new Error('mock reportsApi.remove not implemented');
  },
};
