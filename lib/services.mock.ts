// In-memory mock services backed by AsyncStorage.
//
// Purpose: let gio-experiment test the new UX (inspections/certificates
// decoupling, fork screen, new detail screen, etc.) without requiring the
// 0006-0008 migrations to be applied to the live Supabase DB. See
// `lib/services.ts` for the dispatcher.
//
// Behavior:
//   - Seeds ~2 projects, 2 system templates, a few inspections, certs,
//     quals on first launch. Idempotent (checks a seeded marker).
//   - Mutations persist to AsyncStorage so state survives app restarts.
//   - PDF/photo uploads are stubbed — `storageApi.upload` returns the path
//     unchanged; `signedUrl`/`publicUrl` synthesize a `mock://` URL.
//   - No auth; helpers that call `supabase.auth.getUser()` just use a
//     fake user id.
//
// Not covered: anything that requires network-only behavior (real signed
// URLs resolving via FileSystem.downloadAsync, PDF printing). PDF render
// paths should gracefully degrade if asked to fetch a `mock://` URL.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Answer,
  AnswerPhoto,
  Certificate,
  Inspection,
  Project,
  ProjectItem,
  ProjectSigner,
  Qualification,
  Question,
  Schedule,
  ScheduleWithItem,
  SignatureRecord,
  Template,
} from '../types/models';

// -------- Store shape --------

type MockDB = {
  seeded_version: number;
  user_id: string;
  projects: Project[];
  project_signers: ProjectSigner[];
  project_items: ProjectItem[];
  schedules: Schedule[];
  templates: Template[];
  questions: Question[];
  inspections: Inspection[];
  answers: Answer[];
  answer_photos: AnswerPhoto[];
  signatures: SignatureRecord[];
  qualifications: Qualification[];
  certificates: Certificate[];
};

const STORE_KEY = '@mock:db:v1';
const SEED_VERSION = 1;
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

let cache: MockDB | null = null;
let initPromise: Promise<MockDB> | null = null;

function uuid(): string {
  // Cheap UUID-ish; RN environments have `crypto.randomUUID` but it's
  // not polyfilled on older targets. This is fine for fake rows.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function now(): string {
  return new Date().toISOString();
}

async function load(): Promise<MockDB> {
  if (cache) return cache;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    let db: MockDB | null = null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as MockDB;
        if (parsed.seeded_version === SEED_VERSION) db = parsed;
      } catch { /* fallthrough to reseed */ }
    }
    if (!db) {
      db = seed();
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(db));
    }
    cache = db;
    return db;
  })();
  return initPromise;
}

async function save(): Promise<void> {
  if (!cache) return;
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(cache));
}

// -------- Seed data --------
//
// Kept deliberately small — two system templates matching the real seeded
// ones, two projects, a handful of inspections with answers + certs + quals.

function seed(): MockDB {
  const tplA: Template = {
    id: 'tpl-xaracho',
    owner_id: null,
    name: 'ფასადის ხარაჩოს შემოწმების აქტი',
    category: 'xaracho',
    is_system: true,
    required_qualifications: ['xaracho_inspector'],
    required_signer_roles: ['expert', 'xaracho_supervisor', 'xaracho_assembler'],
  };
  const tplB: Template = {
    id: 'tpl-harness',
    owner_id: null,
    name: 'დამცავი ქამრების შემოწმების აქტი',
    category: 'harness',
    is_system: true,
    required_qualifications: ['harness_inspector'],
    required_signer_roles: ['expert'],
  };

  const questionsA: Question[] = [
    {
      id: 'q-a-1', template_id: tplA.id, section: 1, order: 1,
      type: 'yesno', title: 'ხარაჩოს პასპორტი ქართულად ნათარგმნი?',
      min_val: null, max_val: null, unit: null, grid_rows: null, grid_cols: null,
    },
    {
      id: 'q-a-2', template_id: tplA.id, section: 1, order: 2,
      type: 'yesno', title: 'ხარაჩო აწყობილია სწორ და მყარ ზედაპირზე?',
      min_val: null, max_val: null, unit: null, grid_rows: null, grid_cols: null,
    },
  ];
  const questionsB: Question[] = [
    {
      id: 'q-b-1', template_id: tplB.id, section: 1, order: 1,
      type: 'component_grid', title: 'უსაფრთხოების ღვედის კომპონენტები',
      min_val: null, max_val: null, unit: null,
      grid_rows: Array.from({ length: 15 }, (_, i) => `N${i + 1}`),
      grid_cols: ['Shoulder Straps', 'Chest Strap', 'Waist Belt', 'Leg Straps', 'Locking Carabiner'],
    },
  ];

  const proj1: Project = {
    id: 'proj-1', user_id: MOCK_USER_ID,
    name: 'ვაკე-საბურთალოს ობიექტი',
    company_name: 'Demo Construction', address: 'თბილისი',
    created_at: new Date(Date.now() - 30 * 864e5).toISOString(),
  };
  const proj2: Project = {
    id: 'proj-2', user_id: MOCK_USER_ID,
    name: 'ისანის ობიექტი',
    company_name: 'BuildCo', address: 'თბილისი, ისანი',
    created_at: new Date(Date.now() - 10 * 864e5).toISOString(),
  };

  const insp1: Inspection = {
    id: 'insp-1', project_id: proj1.id, project_item_id: null,
    template_id: tplA.id, user_id: MOCK_USER_ID, status: 'completed',
    harness_name: null, conclusion_text: 'ყველა სისტემა გამართულია.',
    is_safe_for_use: true,
    created_at: new Date(Date.now() - 5 * 864e5).toISOString(),
    completed_at: new Date(Date.now() - 5 * 864e5 + 3600e3).toISOString(),
  };
  const insp2: Inspection = {
    id: 'insp-2', project_id: proj1.id, project_item_id: null,
    template_id: tplB.id, user_id: MOCK_USER_ID, status: 'completed',
    harness_name: 'Petzl NEWTON', conclusion_text: 'ორი ქამრის გამოცვლა საჭიროა.',
    is_safe_for_use: false,
    created_at: new Date(Date.now() - 2 * 864e5).toISOString(),
    completed_at: new Date(Date.now() - 2 * 864e5 + 3600e3).toISOString(),
  };
  const insp3: Inspection = {
    id: 'insp-3', project_id: proj2.id, project_item_id: null,
    template_id: tplA.id, user_id: MOCK_USER_ID, status: 'draft',
    harness_name: null, conclusion_text: null, is_safe_for_use: null,
    created_at: new Date(Date.now() - 1 * 864e5).toISOString(),
    completed_at: null,
  };

  const cert1: Certificate = {
    id: 'cert-1', inspection_id: insp1.id, user_id: MOCK_USER_ID,
    template_id: tplA.id, pdf_url: 'mock/insp-1.pdf',
    is_safe_for_use: true, conclusion_text: insp1.conclusion_text,
    params: {}, generated_at: insp1.completed_at!,
  };
  const cert2: Certificate = {
    id: 'cert-2', inspection_id: insp2.id, user_id: MOCK_USER_ID,
    template_id: tplB.id, pdf_url: 'mock/insp-2.pdf',
    is_safe_for_use: false, conclusion_text: insp2.conclusion_text,
    params: {}, generated_at: insp2.completed_at!,
  };
  // insp-2 has a second cert (proves the 1:N)
  const cert2b: Certificate = {
    id: 'cert-2b', inspection_id: insp2.id, user_id: MOCK_USER_ID,
    template_id: tplB.id, pdf_url: 'mock/insp-2-v2.pdf',
    is_safe_for_use: false, conclusion_text: insp2.conclusion_text,
    params: {}, generated_at: new Date(Date.now() - 1 * 864e5).toISOString(),
  };

  const qual1: Qualification = {
    id: 'qual-1', user_id: MOCK_USER_ID, type: 'xaracho_inspector',
    number: 'XI-12345', issued_at: '2024-01-15', expires_at: '2027-01-15',
    file_url: 'mock/qual-1.jpg',
  };
  const qual2: Qualification = {
    id: 'qual-2', user_id: MOCK_USER_ID, type: 'harness_inspector',
    number: 'HI-67890', issued_at: '2023-06-01', expires_at: '2026-06-01',
    file_url: 'mock/qual-2.jpg',
  };

  return {
    seeded_version: SEED_VERSION,
    user_id: MOCK_USER_ID,
    projects: [proj1, proj2],
    project_signers: [],
    project_items: [],
    schedules: [],
    templates: [tplA, tplB],
    questions: [...questionsA, ...questionsB],
    inspections: [insp1, insp2, insp3],
    answers: [],
    answer_photos: [],
    signatures: [],
    qualifications: [qual1, qual2],
    certificates: [cert1, cert2, cert2b],
  };
}

/** Nuke local state — useful for testing. Not wired to UI. */
export async function resetMockDb(): Promise<void> {
  cache = null;
  initPromise = null;
  await AsyncStorage.removeItem(STORE_KEY);
}

// ======================================================================
// APIs
// ======================================================================

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
    companyName?: string | null;
    address?: string | null;
  }): Promise<Project> => {
    const db = await load();
    const p: Project = {
      id: uuid(),
      user_id: db.user_id,
      name: args.name,
      company_name: args.companyName ?? null,
      address: args.address ?? null,
      created_at: now(),
    };
    db.projects.push(p);
    await save();
    return p;
  },
  update: async (
    id: string,
    patch: Partial<Pick<Project, 'name' | 'company_name' | 'address'>>,
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
    db.signatures = db.signatures.filter(s => s.inspection_id !== id);
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
};

export const questionnairesApi = inspectionsApi;

export const answersApi = {
  list: async (inspectionId: string): Promise<Answer[]> => {
    const db = await load();
    return db.answers.filter(a => a.inspection_id === inspectionId);
  },
  upsert: async (
    a: Partial<Answer> & { inspection_id: string; question_id: string },
  ): Promise<Answer> => {
    const db = await load();
    let row = db.answers.find(
      x => x.inspection_id === a.inspection_id && x.question_id === a.question_id,
    );
    if (row) {
      Object.assign(row, a);
    } else {
      row = {
        id: a.id ?? uuid(),
        inspection_id: a.inspection_id,
        question_id: a.question_id,
        value_bool: a.value_bool ?? null,
        value_num: a.value_num ?? null,
        value_text: a.value_text ?? null,
        grid_values: a.grid_values ?? null,
        comment: a.comment ?? null,
      };
      db.answers.push(row);
    }
    await save();
    return row;
  },
  photos: async (answerId: string): Promise<AnswerPhoto[]> => {
    const db = await load();
    return db.answer_photos.filter(p => p.answer_id === answerId);
  },
  addPhoto: async (
    answerId: string,
    storagePath: string,
    caption?: string,
  ): Promise<AnswerPhoto> => {
    const db = await load();
    const photo: AnswerPhoto = {
      id: uuid(),
      answer_id: answerId,
      storage_path: storagePath,
      caption: caption ?? null,
      created_at: now(),
    };
    db.answer_photos.push(photo);
    await save();
    return photo;
  },
};

export const signaturesApi = {
  list: async (inspectionId: string): Promise<SignatureRecord[]> => {
    const db = await load();
    return db.signatures.filter(s => s.inspection_id === inspectionId);
  },
  upsert: async (
    s: Omit<SignatureRecord, 'id' | 'signed_at'> & { id?: string },
  ): Promise<SignatureRecord> => {
    const db = await load();
    let row = db.signatures.find(
      x => x.inspection_id === s.inspection_id && x.signer_role === s.signer_role,
    );
    if (row) {
      Object.assign(row, s, { signed_at: now() });
    } else {
      row = { id: s.id ?? uuid(), signed_at: now(), ...s };
      db.signatures.push(row);
    }
    await save();
    return row;
  },
  remove: async (
    inspectionId: string,
    role: SignatureRecord['signer_role'],
  ) => {
    const db = await load();
    db.signatures = db.signatures.filter(
      s => !(s.inspection_id === inspectionId && s.signer_role === role),
    );
    await save();
  },
};

export const qualificationsApi = {
  list: async (): Promise<Qualification[]> => {
    const db = await load();
    return [...db.qualifications];
  },
  upsert: async (q: Qualification): Promise<Qualification> => {
    const db = await load();
    const existing = db.qualifications.find(x => x.id === q.id);
    if (existing) Object.assign(existing, q);
    else db.qualifications.push(q);
    await save();
    return existing ?? q;
  },
  remove: async (id: string) => {
    const db = await load();
    db.qualifications = db.qualifications.filter(q => q.id !== id);
    await save();
  },
};

export const certificatesApi = {
  list: async (): Promise<Certificate[]> => {
    const db = await load();
    return [...db.certificates].sort((a, b) =>
      b.generated_at.localeCompare(a.generated_at),
    );
  },
  getById: async (id: string): Promise<Certificate | null> => {
    const db = await load();
    return db.certificates.find(c => c.id === id) ?? null;
  },
  listByInspection: async (inspectionId: string): Promise<Certificate[]> => {
    const db = await load();
    return db.certificates
      .filter(c => c.inspection_id === inspectionId)
      .sort((a, b) => b.generated_at.localeCompare(a.generated_at));
  },
  countsByInspection: async (
    inspectionIds: string[],
  ): Promise<Record<string, number>> => {
    const db = await load();
    const set = new Set(inspectionIds);
    const counts: Record<string, number> = {};
    for (const c of db.certificates) {
      if (!set.has(c.inspection_id)) continue;
      counts[c.inspection_id] = (counts[c.inspection_id] ?? 0) + 1;
    }
    return counts;
  },
  create: async (args: {
    inspectionId: string;
    templateId: string;
    pdfUrl: string;
    isSafeForUse: boolean | null;
    conclusionText: string | null;
    params?: Record<string, unknown>;
  }): Promise<Certificate> => {
    const db = await load();
    const cert: Certificate = {
      id: uuid(),
      inspection_id: args.inspectionId,
      user_id: db.user_id,
      template_id: args.templateId,
      pdf_url: args.pdfUrl,
      is_safe_for_use: args.isSafeForUse,
      conclusion_text: args.conclusionText,
      params: args.params ?? {},
      generated_at: now(),
    };
    db.certificates.push(cert);
    await save();
    return cert;
  },
  remove: async (id: string) => {
    const db = await load();
    db.certificates = db.certificates.filter(c => c.id !== id);
    await save();
  },
};

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

export const schedulesApi = {
  list: async (): Promise<ScheduleWithItem[]> => {
    const db = await load();
    return db.schedules.map(s => {
      const item = db.project_items.find(i => i.id === s.project_item_id) ?? null;
      const project = item
        ? db.projects.find(p => p.id === item.project_id) ?? null
        : null;
      return {
        ...s,
        project_items: item
          ? {
              id: item.id,
              name: item.name,
              project_id: item.project_id,
              projects: project
                ? { id: project.id, name: project.name, company_name: project.company_name }
                : null,
            }
          : null,
      };
    });
  },
  upcoming: async (fromIso: string, toIso: string): Promise<ScheduleWithItem[]> => {
    const all = await schedulesApi.list();
    return all.filter(s => {
      if (!s.next_due_at) return false;
      return s.next_due_at >= fromIso && s.next_due_at <= toIso;
    });
  },
  markInspected: async (
    scheduleId: string,
    completedAtIso: string,
  ): Promise<Schedule> => {
    const db = await load();
    const s = db.schedules.find(x => x.id === scheduleId);
    if (!s) throw new Error('not found');
    s.last_inspected_at = completedAtIso;
    s.next_due_at = new Date(
      new Date(completedAtIso).getTime() + s.interval_days * 864e5,
    ).toISOString();
    await save();
    return s;
  },
  upsertForItem: async (
    projectItemId: string,
    intervalDays = 10,
  ): Promise<Schedule> => {
    const db = await load();
    let s = db.schedules.find(x => x.project_item_id === projectItemId);
    if (s) return s;
    s = {
      id: uuid(),
      project_item_id: projectItemId,
      last_inspected_at: null,
      next_due_at: new Date(Date.now() + intervalDays * 864e5).toISOString(),
      interval_days: intervalDays,
      google_event_id: null,
      created_at: now(),
    };
    db.schedules.push(s);
    await save();
    return s;
  },
  setGoogleEventId: async (scheduleId: string, googleEventId: string | null) => {
    const db = await load();
    const s = db.schedules.find(x => x.id === scheduleId);
    if (!s) return;
    s.google_event_id = googleEventId;
    await save();
  },
};

// Storage is entirely stubbed. Uploads pretend to succeed and return the
// path; URL helpers produce a `mock://` scheme that screen code can render
// via Image (iOS ignores unknown schemes, typically shows a broken image —
// acceptable for UX testing).
export const storageApi = {
  upload: async (
    _bucket: string,
    path: string,
    _body: Blob | ArrayBuffer,
    _contentType: string,
  ) => path,
  download: async (_bucket: string, _path: string) => {
    // Return an empty Blob-ish object; not consumed in mock flows.
    return new Blob([], { type: 'application/octet-stream' });
  },
  signedUrl: async (bucket: string, path: string): Promise<string> =>
    `mock://${bucket}/${path}`,
  publicUrl: (bucket: string, path: string) =>
    `mock://${bucket}/${path}`,
};

export function isExpiringSoon(q: Qualification): boolean {
  if (!q.expires_at) return false;
  const exp = new Date(q.expires_at).getTime();
  return exp - Date.now() < 30 * 864e5;
}
