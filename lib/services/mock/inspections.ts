import type { Inspection, InspectionAttachment } from '../../../types/models';
import { load, now, save, uuid } from './_store';

export const inspectionsApi = {
  recent: async (limit = 100): Promise<Inspection[]> => {
    const db = await load();
    return [...db.inspections]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  },
  getById: async (id: string): Promise<Inspection | null> => {
    const db = await load();
    return db.inspections.find(i => i.id === id) ?? null;
  },
  listByProject: async (projectId: string): Promise<Inspection[]> => {
    const db = await load();
    return db.inspections
      .filter(i => i.project_id === projectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  unifiedByProject: async (
    projectId: string,
  ): Promise<Array<{ id: string; source: string; template_id: string; status: 'draft' | 'completed'; created_at: string }>> => {
    const db = await load();
    return db.inspections
      .filter(i => i.project_id === projectId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(i => ({
        id: i.id,
        source: 'harness',
        template_id: i.template_id,
        status: i.status,
        created_at: i.created_at,
      }));
  },
  create: async (args: {
    projectId: string;
    templateId: string;
    harnessName?: string;
    projectItemId?: string | null;
  }): Promise<Inspection> => {
    const db = await load();
    const i: Inspection = {
      id: uuid(),
      project_id: args.projectId,
      project_item_id: args.projectItemId ?? null,
      template_id: args.templateId,
      user_id: db.user_id,
      status: 'draft',
      harness_name: args.harnessName ?? null,
      conclusion_text: null,
      is_safe_for_use: null,
      conclusion_photo_paths: [],
      created_at: now(),
      completed_at: null,
    };
    db.inspections.push(i);
    await save();
    return i;
  },
  update: async (
    q: Partial<Inspection> & { id: string },
  ): Promise<Inspection> => {
    const db = await load();
    const i = db.inspections.find(x => x.id === q.id);
    if (!i) throw new Error('not found');
    Object.assign(i, q);
    await save();
    return i;
  },
  finish: async (id: string): Promise<void> => {
    const db = await load();
    const i = db.inspections.find(x => x.id === id);
    if (!i) throw new Error('not found');
    i.status = 'completed';
    i.completed_at = now();
    await save();
  },
  remove: async (id: string) => {
    const db = await load();
    db.inspections = db.inspections.filter(i => i.id !== id);
    db.answers = db.answers.filter(a => a.inspection_id !== id);
    db.certificates = db.certificates.filter(c => c.inspection_id !== id);
    await save();
  },
  counts: async () => {
    const db = await load();
    const all = [...db.inspections].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
    let drafts = 0;
    let completed = 0;
    for (const i of all) {
      if (i.status === 'completed') completed += 1;
      else drafts += 1;
    }
    return {
      total: all.length,
      drafts,
      completed,
      latestCreatedAt: all[0]?.created_at ?? null,
    };
  },
  listByTemplateIds: async (templateIds: string[]): Promise<Inspection[]> => {
    const db = await load();
    const set = new Set(templateIds);
    return db.inspections
      .filter(i => set.has(i.template_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  listAll: async (): Promise<Inspection[]> => {
    const db = await load();
    return db.inspections
      .filter(i => i.status === 'completed')
      .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
  },
};

export const questionnairesApi = inspectionsApi;

export const inspectionAttachmentsApi = {
  listByInspection: async (inspectionId: string): Promise<InspectionAttachment[]> => {
    const db = await load();
    return db.inspection_attachments
      .filter(a => a.inspection_id === inspectionId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  create: async (args: {
    inspectionId: string;
    certType: string;
    certNumber?: string | null;
    photoPath?: string | null;
  }): Promise<InspectionAttachment> => {
    const db = await load();
    const row: InspectionAttachment = {
      id: uuid(),
      inspection_id: args.inspectionId,
      user_id: db.user_id,
      cert_type: args.certType,
      cert_number: args.certNumber ?? null,
      photo_path: args.photoPath ?? null,
      created_at: now(),
      updated_at: now(),
    };
    db.inspection_attachments.push(row);
    await save();
    return row;
  },
  update: async (
    id: string,
    patch: { certType?: string; certNumber?: string | null; photoPath?: string | null },
  ): Promise<InspectionAttachment> => {
    const db = await load();
    const idx = db.inspection_attachments.findIndex(a => a.id === id);
    if (idx < 0) throw new Error('attachment not found');
    const next = { ...db.inspection_attachments[idx] };
    if (patch.certType !== undefined) next.cert_type = patch.certType;
    if (patch.certNumber !== undefined) next.cert_number = patch.certNumber;
    if (patch.photoPath !== undefined) next.photo_path = patch.photoPath;
    next.updated_at = now();
    db.inspection_attachments[idx] = next;
    await save();
    return next;
  },
  remove: async (id: string) => {
    const db = await load();
    db.inspection_attachments = db.inspection_attachments.filter(a => a.id !== id);
    await save();
  },
  /** In mock mode the local file URI is returned unchanged. */
  uploadPhoto: async (args: { inspectionId: string; fileUri: string }): Promise<string> => {
    return args.fileUri;
  },
};
