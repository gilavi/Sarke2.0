import { supabase } from '@/lib/supabase';

export const CARGO_PLATFORM_TEMPLATE_ID = '77777777-7777-7777-7777-777777777777';

export type CPResult = 'good' | 'fix' | 'na';
export type CPVerdict = 'approved' | 'conditional' | 'rejected';

export interface CPItemState {
  id: number;
  result: CPResult | null;
  comment: string | null;
  photo_paths: string[];
}

export interface CPCargoRow {
  id: string;
  name: string;
  unit_weight_kg: number | null;
  total_weight_kg: number | null;
  note: string;
}

export interface CPSignatory {
  name: string;
  position: string;
  organization: string;
  /** Base64 PNG without the data: prefix. */
  signature: string | null;
  date: string | null;
}

export interface CargoPlatformInspection {
  id: string;
  projectId: string;
  templateId: string | null;
  userId: string;
  status: 'draft' | 'completed';
  company: string;
  address: string;
  inspectorName: string;
  floorZone: string;
  inspectionDate: string;
  platformTypeModel: string;
  platformLength: number | null;
  platformWidth: number | null;
  platformColorDesc: string;
  sideGuardrail: 'none' | 'complete' | null;
  frontGuardrail: 'none' | 'complete' | null;
  guardrailHeight: 'non_standard' | 'standard' | null;
  cargo: CPCargoRow[];
  items: CPItemState[];
  verdict: CPVerdict | null;
  verdictComment: string;
  summaryPhotos: string[];
  signatures: [CPSignatory, CPSignatory];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CPChecklistEntry {
  id: number;
  section: 'A' | 'B';
  label: string;
  description: string;
}

export const CP_ITEMS: CPChecklistEntry[] = [
  { id: 1, section: 'A', label: 'ძირის ფილები',       description: 'პლატფორმის ძირის (ფილების) მდგომარეობა — ბზარები, დეფორმაცია, კოროზია' },
  { id: 2, section: 'A', label: 'მზიდი ჩარჩო',        description: 'მზიდი ჩარჩოს (ლითონის) მდგომარეობა — ბზარი, გახსნილი, დეფორმირებული' },
  { id: 3, section: 'A', label: 'სვეტები',             description: 'სვეტების (ვერტიკალური დგარების) მდგომარეობა — დეფორმირებული, გამოძრავდა, მოშვებული' },
  { id: 4, section: 'A', label: 'ანკერული გამაგრება', description: 'ანკერული გამაგრებების მდგომარეობა — სიმჭიდროვე დარღვეულია, კოროზიულია' },
  { id: 5, section: 'B', label: 'გვ. მოაჯირის სიმ.',  description: 'გვერდითი მოაჯირების სიმაღლე (მინ. 90–120 სმ)' },
  { id: 6, section: 'B', label: 'მოაჯირის სიმტკ.',    description: 'მოაჯირების სტრუქტურული სიმტკიცე — აკლია, ბზარი' },
  { id: 7, section: 'B', label: 'წინა მოაჯირი',       description: 'წინა მოძრავი (დასაკეცი) მოაჯირების ფუნქციონირება — გახსნა/დაკეტვა' },
  { id: 8, section: 'B', label: 'ჩამკეტი მოწყ.',      description: 'მოძრავი მოაჯირის ჩამკეტი მოწყობილობა — არ გააჩნია, არ იკეტება' },
  { id: 9, section: 'B', label: 'კავშირები',           description: 'მოაჯირის ყველა კავშირი (სახსრები) — ბზარი, დაზიანებული' },
];

export const CP_SECTION_LABELS: Record<string, string> = {
  A: 'A — სტრუქტურული მთლიანობა',
  B: 'B — მოაჯირები',
};

export const CP_VERDICT_LABEL: Record<CPVerdict, string> = {
  approved:    'შეესაბამება — ექსპლუატაციაში დაშვება',
  conditional: 'პირობით დაშვება — საჭიროა გამოსწორება',
  rejected:    'არ შეესაბამება — ექსპლუატაცია შეჩერებულია',
};

export const CP_RESULT_LABEL: Record<CPResult, string> = {
  good: 'ნორმაში',
  fix:  'გამოსასწ.',
  na:   'N/A',
};

export function cpTotalWeight(cargo: CPCargoRow[]): number {
  return cargo.reduce((sum, r) => sum + (r.total_weight_kg ?? 0), 0);
}

export function newCargoRow(): CPCargoRow {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    name: '',
    unit_weight_kg: null,
    total_weight_kg: null,
    note: '',
  };
}

// ── DB layer ──────────────────────────────────────────────────────────────────

interface DbRow {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  status: 'draft' | 'completed';
  company: string | null;
  address: string | null;
  inspector_name: string | null;
  floor_zone: string | null;
  inspection_date: string;
  platform_type_model: string | null;
  platform_length_m: number | null;
  platform_width_m: number | null;
  platform_color_desc: string | null;
  side_guardrail: 'none' | 'complete' | null;
  front_guardrail: 'none' | 'complete' | null;
  guardrail_height: 'non_standard' | 'standard' | null;
  cargo: CPCargoRow[] | null;
  items: CPItemState[] | null;
  verdict: CPVerdict | null;
  verdict_comment: string | null;
  summary_photos: string[] | null;
  signatures: [CPSignatory, CPSignatory] | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, project_id, template_id, user_id, status, company, address, inspector_name, floor_zone, inspection_date, platform_type_model, platform_length_m, platform_width_m, platform_color_desc, side_guardrail, front_guardrail, guardrail_height, cargo, items, verdict, verdict_comment, summary_photos, signatures, completed_at, created_at, updated_at';

function emptySignatory(): CPSignatory {
  return { name: '', position: '', organization: '', signature: null, date: null };
}

function defaultItems(): CPItemState[] {
  return CP_ITEMS.map((e) => ({ id: e.id, result: null, comment: null, photo_paths: [] }));
}

function toModel(r: DbRow): CargoPlatformInspection {
  return {
    id: r.id,
    projectId: r.project_id,
    templateId: r.template_id,
    userId: r.user_id,
    status: r.status,
    company: r.company ?? '',
    address: r.address ?? '',
    inspectorName: r.inspector_name ?? '',
    floorZone: r.floor_zone ?? '',
    inspectionDate: r.inspection_date,
    platformTypeModel: r.platform_type_model ?? '',
    platformLength: r.platform_length_m,
    platformWidth: r.platform_width_m,
    platformColorDesc: r.platform_color_desc ?? '',
    sideGuardrail: r.side_guardrail,
    frontGuardrail: r.front_guardrail,
    guardrailHeight: r.guardrail_height,
    cargo: r.cargo ?? [],
    items: r.items ?? defaultItems(),
    verdict: r.verdict,
    verdictComment: r.verdict_comment ?? '',
    summaryPhotos: r.summary_photos ?? [],
    signatures: r.signatures ?? [emptySignatory(), emptySignatory()],
    completedAt: r.completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listCargoPlatformInspections(
  projectId?: string,
): Promise<CargoPlatformInspection[]> {
  let q = supabase
    .from('cargo_platform_inspections')
    .select(COLS)
    .order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(toModel);
}

export async function getCargoPlatformInspection(
  id: string,
): Promise<CargoPlatformInspection | null> {
  const { data, error } = await supabase
    .from('cargo_platform_inspections')
    .select(COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toModel(data as DbRow) : null;
}

export async function createCargoPlatformInspection(args: {
  projectId: string;
}): Promise<CargoPlatformInspection> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw userErr ?? new Error('არაავტორიზებული');
  const { data, error } = await supabase
    .from('cargo_platform_inspections')
    .insert({
      project_id: args.projectId,
      template_id: CARGO_PLATFORM_TEMPLATE_ID,
      user_id: userData.user.id,
      status: 'draft',
      cargo: [],
      items: defaultItems(),
      signatures: [emptySignatory(), emptySignatory()],
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return toModel(data as DbRow);
}

export async function updateCargoPlatformInspection(
  id: string,
  patch: Partial<{
    company: string | null;
    address: string | null;
    inspectorName: string | null;
    floorZone: string | null;
    inspectionDate: string | null;
    platformTypeModel: string | null;
    platformLength: number | null;
    platformWidth: number | null;
    platformColorDesc: string | null;
    sideGuardrail: 'none' | 'complete' | null;
    frontGuardrail: 'none' | 'complete' | null;
    guardrailHeight: 'non_standard' | 'standard' | null;
    cargo: CPCargoRow[];
    items: CPItemState[];
    verdict: CPVerdict | null;
    verdictComment: string | null;
    summaryPhotos: string[];
    signatures: [CPSignatory, CPSignatory];
    status: 'draft' | 'completed';
  }>,
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (patch.company !== undefined) updates.company = patch.company;
  if (patch.address !== undefined) updates.address = patch.address;
  if (patch.inspectorName !== undefined) updates.inspector_name = patch.inspectorName;
  if (patch.floorZone !== undefined) updates.floor_zone = patch.floorZone;
  if (patch.inspectionDate !== undefined) updates.inspection_date = patch.inspectionDate;
  if (patch.platformTypeModel !== undefined) updates.platform_type_model = patch.platformTypeModel;
  if (patch.platformLength !== undefined) updates.platform_length_m = patch.platformLength;
  if (patch.platformWidth !== undefined) updates.platform_width_m = patch.platformWidth;
  if (patch.platformColorDesc !== undefined) updates.platform_color_desc = patch.platformColorDesc;
  if (patch.sideGuardrail !== undefined) updates.side_guardrail = patch.sideGuardrail;
  if (patch.frontGuardrail !== undefined) updates.front_guardrail = patch.frontGuardrail;
  if (patch.guardrailHeight !== undefined) updates.guardrail_height = patch.guardrailHeight;
  if (patch.cargo !== undefined) updates.cargo = patch.cargo;
  if (patch.items !== undefined) updates.items = patch.items;
  if (patch.verdict !== undefined) updates.verdict = patch.verdict;
  if (patch.verdictComment !== undefined) updates.verdict_comment = patch.verdictComment;
  if (patch.summaryPhotos !== undefined) updates.summary_photos = patch.summaryPhotos;
  if (patch.signatures !== undefined) updates.signatures = patch.signatures;
  if (patch.status !== undefined) {
    updates.status = patch.status;
    if (patch.status === 'completed') updates.completed_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from('cargo_platform_inspections')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCargoPlatformInspection(id: string): Promise<void> {
  const { error } = await supabase
    .from('cargo_platform_inspections')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
