// In-memory mock DB backed by AsyncStorage. Shared across all mock domain
// modules. See `lib/services/AGENTS.md` for the mock-mode rationale.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Answer,
  AnswerPhoto,
  Certificate,
  Inspection,
  InspectionAttachment,
  Project,
  ProjectItem,
  ProjectSigner,
  Qualification,
  Question,
  Schedule,
  SignatureRecord,
  Template,
} from '../../../types/models';

export type MockDB = {
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
  inspection_attachments: InspectionAttachment[];
};

const STORE_KEY = '@mock:db:v1';
const SEED_VERSION = 2;
export const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

// Transparent 1×1 PNG — safe to use as an <Image> source in mock mode.
export const MOCK_IMAGE_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let cache: MockDB | null = null;
let initPromise: Promise<MockDB> | null = null;

export function uuid(): string {
  // Cheap UUID-ish; RN environments have `crypto.randomUUID` but it's
  // not polyfilled on older targets. This is fine for fake rows.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function now(): string {
  return new Date().toISOString();
}

export async function load(): Promise<MockDB> {
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

export async function save(): Promise<void> {
  if (!cache) return;
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(cache));
}

// Seed data — kept deliberately small. Two system templates matching the
// real seeded ones, two projects, a handful of inspections with answers +
// certs + quals.
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
    latitude: 41.7151, longitude: 44.8271,
    crew: null,
    logo: null,
    contact_phone: null,
    created_at: new Date(Date.now() - 30 * 864e5).toISOString(),
  };
  const proj2: Project = {
    id: 'proj-2', user_id: MOCK_USER_ID,
    name: 'ისანის ობიექტი',
    company_name: 'BuildCo', address: 'თბილისი, ისანი',
    latitude: null, longitude: null,
    crew: null,
    logo: null,
    contact_phone: null,
    created_at: new Date(Date.now() - 10 * 864e5).toISOString(),
  };

  const insp1: Inspection = {
    id: 'insp-1', project_id: proj1.id, project_item_id: null,
    template_id: tplA.id, user_id: MOCK_USER_ID, status: 'completed',
    harness_name: null, conclusion_text: 'ყველა სისტემა გამართულია.',
    is_safe_for_use: true,
    conclusion_photo_paths: [],
    created_at: new Date(Date.now() - 5 * 864e5).toISOString(),
    completed_at: new Date(Date.now() - 5 * 864e5 + 3600e3).toISOString(),
  };
  const insp2: Inspection = {
    id: 'insp-2', project_id: proj1.id, project_item_id: null,
    template_id: tplB.id, user_id: MOCK_USER_ID, status: 'completed',
    harness_name: 'Petzl NEWTON', conclusion_text: 'ორი ქამრის გამოცვლა საჭიროა.',
    is_safe_for_use: false,
    conclusion_photo_paths: [],
    created_at: new Date(Date.now() - 2 * 864e5).toISOString(),
    completed_at: new Date(Date.now() - 2 * 864e5 + 3600e3).toISOString(),
  };
  const insp3: Inspection = {
    id: 'insp-3', project_id: proj2.id, project_item_id: null,
    template_id: tplA.id, user_id: MOCK_USER_ID, status: 'draft',
    harness_name: null, conclusion_text: null, is_safe_for_use: null,
    conclusion_photo_paths: [],
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
    created_at: new Date(Date.now() - 365 * 864e5).toISOString(),
  };
  const qual2: Qualification = {
    id: 'qual-2', user_id: MOCK_USER_ID, type: 'harness_inspector',
    number: 'HI-67890', issued_at: '2023-06-01', expires_at: '2026-06-01',
    file_url: 'mock/qual-2.jpg',
    created_at: new Date(Date.now() - 180 * 864e5).toISOString(),
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
    inspection_attachments: [],
  };
}

/** Nuke local state — useful for testing. Not wired to UI. */
export async function resetMockDb(): Promise<void> {
  cache = null;
  initPromise = null;
  await AsyncStorage.removeItem(STORE_KEY);
}
