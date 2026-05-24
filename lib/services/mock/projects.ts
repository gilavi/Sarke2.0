import type { Project, ProjectSigner } from '../../../types/models';
import { load, now, save, uuid } from './_store';

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const db = await load();
    return [...db.projects].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  },
  getById: async (id: string): Promise<Project | null> => {
    const db = await load();
    return db.projects.find(p => p.id === id) ?? null;
  },
  create: async (args: {
    name: string;
    companyName: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    logo?: string | null;
  }): Promise<Project> => {
    const db = await load();
    const p: Project = {
      id: uuid(),
      user_id: db.user_id,
      name: args.name,
      company_name: args.companyName,
      address: args.address ?? null,
      latitude: args.latitude ?? null,
      longitude: args.longitude ?? null,
      crew: null,
      logo: args.logo ?? null,
      contact_phone: null,
      created_at: now(),
    };
    db.projects.push(p);
    await save();
    return p;
  },
  update: async (
    id: string,
    patch: Partial<Pick<Project, 'name' | 'company_name' | 'address' | 'latitude' | 'longitude' | 'crew' | 'logo'>>,
  ): Promise<Project> => {
    const db = await load();
    const p = db.projects.find(x => x.id === id);
    if (!p) throw new Error('not found');
    Object.assign(p, patch);
    await save();
    return p;
  },
  remove: async (id: string) => {
    const db = await load();
    db.projects = db.projects.filter(p => p.id !== id);
    db.project_signers = db.project_signers.filter(s => s.project_id !== id);
    db.project_items = db.project_items.filter(i => i.project_id !== id);
    db.inspections = db.inspections.filter(i => i.project_id !== id);
    await save();
  },
  signers: async (projectId: string): Promise<ProjectSigner[]> => {
    const db = await load();
    return db.project_signers.filter(s => s.project_id === projectId);
  },
  upsertSigner: async (
    s: Partial<ProjectSigner> & {
      project_id: string;
      role: ProjectSigner['role'];
      full_name: string;
    },
  ): Promise<ProjectSigner> => {
    const db = await load();
    const existing = db.project_signers.find(
      x =>
        x.project_id === s.project_id &&
        x.role === s.role &&
        x.full_name.toLowerCase() === s.full_name.toLowerCase(),
    );
    if (existing) {
      Object.assign(existing, s);
      await save();
      return existing;
    }
    const created: ProjectSigner = {
      id: uuid(),
      project_id: s.project_id,
      role: s.role,
      full_name: s.full_name,
      phone: s.phone ?? null,
      position: s.position ?? null,
      signature_png_url: s.signature_png_url ?? null,
    };
    db.project_signers.push(created);
    await save();
    return created;
  },
  saveRosterSignature: async (args: {
    project_id: string;
    role: ProjectSigner['role'];
    full_name: string;
    phone?: string | null;
    position?: string | null;
    signature_png_url: string;
  }): Promise<ProjectSigner> => {
    return projectsApi.upsertSigner(args);
  },
  deleteSigner: async (id: string) => {
    const db = await load();
    db.project_signers = db.project_signers.filter(s => s.id !== id);
    await save();
  },
  stats: async (): Promise<
    Record<string, { drafts: number; completed: number }>
  > => {
    const db = await load();
    const map: Record<string, { drafts: number; completed: number }> = {};
    for (const i of db.inspections) {
      const s = (map[i.project_id] ??= { drafts: 0, completed: 0 });
      if (i.status === 'completed') s.completed += 1;
      else s.drafts += 1;
    }
    return map;
  },
};

export const projectFilesApi = {
  list: async (_projectId: string) => [] as never[],
  upload: async (_args: {
    projectId: string;
    fileUri: string;
    name: string;
    mimeType: string | null;
    sizeBytes: number | null;
  }) => {
    throw new Error('projectFilesApi.upload is not supported in mock mode');
  },
  remove: async (_file: { id: string; storage_path: string }) => {
    throw new Error('projectFilesApi.remove is not supported in mock mode');
  },
  signedUrl: async (_file: { storage_path: string }) => {
    throw new Error('projectFilesApi.signedUrl is not supported in mock mode');
  },
};
