import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKETS, signedUrl, removeObjects } from '@/lib/db/storage';
import type { Tables, TablesUpdate } from '@/types/database';

type InspectionRow = Tables<'inspections'>;

export type InspectionStatus = 'draft' | 'in_progress' | 'completed' | string;

/** One entry in the inspection's `signatories` JSONB array. */
export interface SignatoryEntry {
  name: string;
  role: string;
  /** Full base64 PNG data-URL, e.g. "data:image/png;base64,..." */
  signature: string;
  signed_at: string; // ISO 8601
}

export interface Inspection {
  id: string;
  project_id: string;
  user_id: string;
  template_id: string;
  status: InspectionStatus;
  harness_name: string | null;
  department: string | null;
  inspector_name: string | null;
  conclusion_text: string | null;
  is_safe_for_use: boolean | null;
  inspector_signature: string | null;
  conclusion_photo_paths: string[];
  signatories: SignatoryEntry[];
  created_at: string;
  completed_at: string | null;
  template?: { category: string | null }[] | null;
}

export async function listInspections(projectId?: string): Promise<Inspection[]> {
  let q = supabase
    .from('inspections')
    .select(
      'id, project_id, user_id, template_id, status, harness_name, department, inspector_name, conclusion_text, is_safe_for_use, inspector_signature, conclusion_photo_paths, signatories, created_at, completed_at, template:templates(category)',
    )
    .order('created_at', { ascending: false })
    .limit(50);
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Inspection[];
}

export async function countInspections(): Promise<number> {
  const { count, error } = await supabase
    .from('inspections')
    .select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getInspection(id: string): Promise<Inspection | null> {
  const { data, error } = await supabase
    .from('inspections')
    .select(
      'id, project_id, user_id, template_id, status, harness_name, department, inspector_name, conclusion_text, is_safe_for_use, inspector_signature, conclusion_photo_paths, signatories, created_at, completed_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Inspection | null) ?? null;
}

interface CertRow {
  id: string;
  pdf_url: string;
  generated_at: string;
}

export async function listInspectionPdfs(inspectionId: string): Promise<CertRow[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select('id, pdf_url, generated_at')
    .eq('inspection_id', inspectionId)
    .order('generated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CertRow[];
}

export function signedPdfUrl(path: string): Promise<string> {
  return signedUrl(STORAGE_BUCKETS.pdfs, path);
}

export interface CreateInspectionInput {
  projectId: string;
  templateId: string;
  harnessName?: string | null;
  department?: string | null;
  inspectorName?: string | null;
}

export async function createInspection(input: CreateInspectionInput): Promise<Inspection> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw userErr ?? new Error('არაავტორიზებული');

  const { data, error } = await supabase
    .from('inspections')
    .insert({
      project_id: input.projectId,
      template_id: input.templateId,
      user_id: userData.user.id,
      harness_name: input.harnessName ?? null,
      department: input.department ?? null,
      inspector_name: input.inspectorName ?? null,
      status: 'draft',
    })
    .select(
      'id, project_id, user_id, template_id, status, harness_name, department, inspector_name, conclusion_text, is_safe_for_use, inspector_signature, conclusion_photo_paths, signatories, created_at, completed_at',
    )
    .single();
  if (error) throw new Error(error.message);
  return data as InspectionRow as unknown as Inspection;
}

export async function deleteInspection(id: string): Promise<void> {
  const { error } = await supabase.from('inspections').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface Question {
  id: string;
  template_id: string;
  section: number;
  order: number;
  type: 'yesno' | 'measure' | 'component_grid' | 'freetext' | 'photo_upload';
  title: string;
  min_val: number | null;
  max_val: number | null;
  unit: string | null;
  grid_rows: string[] | null;
  grid_cols: string[] | null;
}

export async function listQuestions(templateId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('id, template_id, section, "order", type, title, min_val, max_val, unit, grid_rows, grid_cols')
    .eq('template_id', templateId)
    .order('section', { ascending: true })
    .order('"order"', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Question[];
}

export interface Answer {
  id: string;
  inspection_id: string;
  question_id: string;
  value_bool: boolean | null;
  value_num: number | null;
  value_text: string | null;
  grid_values: Record<string, Record<string, string>> | null;
  comment: string | null;
}

export async function listAnswers(inspectionId: string): Promise<Answer[]> {
  const { data, error } = await supabase
    .from('answers')
    .select('id, inspection_id, question_id, value_bool, value_num, value_text, grid_values, comment')
    .eq('inspection_id', inspectionId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Answer[];
}

export async function upsertAnswer(input: {
  inspectionId: string;
  questionId: string;
  valueBool?: boolean | null;
  valueNum?: number | null;
  valueText?: string | null;
  gridValues?: Record<string, Record<string, string>> | null;
  comment?: string | null;
}): Promise<Answer> {
  const { data, error } = await supabase
    .from('answers')
    .upsert(
      {
        inspection_id: input.inspectionId,
        question_id: input.questionId,
        value_bool: input.valueBool ?? null,
        value_num: input.valueNum ?? null,
        value_text: input.valueText ?? null,
        grid_values: input.gridValues ?? null,
        comment: input.comment ?? null,
      },
      { onConflict: 'inspection_id,question_id' },
    )
    .select('id, inspection_id, question_id, value_bool, value_num, value_text, grid_values, comment')
    .single();
  if (error) throw new Error(error.message);
  return data as Answer;
}

// -------- Answer Photos --------

export interface AnswerPhoto {
  id: string;
  answer_id: string;
  storage_path: string;
  caption: string | null;
  /** Geo-tagged address stored at upload time (mobile only; null on web uploads). */
  address: string | null;
  created_at: string;
}

export async function listAnswerPhotos(answerId: string): Promise<AnswerPhoto[]> {
  const { data, error } = await supabase
    .from('answer_photos')
    .select('id, answer_id, storage_path, caption, address, created_at')
    .eq('answer_id', answerId);
  if (error) throw new Error(error.message);
  return (data ?? []) as AnswerPhoto[];
}

/**
 * Batch-fetch photos for multiple answer IDs in a single query.
 * Returns a map of answerId → AnswerPhoto[].
 */
export async function listAllAnswerPhotos(
  answerIds: string[],
): Promise<Record<string, AnswerPhoto[]>> {
  if (!answerIds.length) return {};
  const { data, error } = await supabase
    .from('answer_photos')
    .select('id, answer_id, storage_path, caption, address, created_at')
    .in('answer_id', answerIds);
  if (error) throw new Error(error.message);
  const result: Record<string, AnswerPhoto[]> = {};
  for (const p of data ?? []) {
    const entry = p as AnswerPhoto;
    (result[entry.answer_id] ??= []).push(entry);
  }
  return result;
}

export async function addAnswerPhoto(
  answerId: string,
  storagePath: string,
  caption?: string | null,
  geo?: { latitude?: number | null; longitude?: number | null; address?: string | null },
): Promise<AnswerPhoto> {
  const { data, error } = await supabase
    .from('answer_photos')
    .insert({
      answer_id: answerId,
      storage_path: storagePath,
      caption: caption ?? null,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      address: geo?.address ?? null,
    })
    .select('id, answer_id, storage_path, caption, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data as AnswerPhoto;
}

export async function removeAnswerPhoto(photoId: string, storagePath: string): Promise<void> {
  const { error } = await supabase.from('answer_photos').delete().eq('id', photoId);
  if (error) throw new Error(error.message);
  // Best-effort blob removal
  await removeObjects(STORAGE_BUCKETS.answerPhotos, [storagePath]);
}

export async function updateInspection(
  id: string,
  patch: {
    harness_name?: string | null;
    department?: string | null;
    inspector_name?: string | null;
    conclusion_text?: string | null;
    is_safe_for_use?: boolean | null;
    inspector_signature?: string | null;
    conclusion_photo_paths?: string[];
    signatories?: SignatoryEntry[];
    status?: 'draft' | 'completed';
  },
): Promise<void> {
  const updates: Record<string, unknown> = { ...patch };
  if (patch.status === 'completed') updates.completed_at = new Date().toISOString();
  const { error } = await supabase
    .from('inspections')
    .update(updates as TablesUpdate<'inspections'>)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Fetch the current session user's saved_signature_url (storage path) from
 * the public.users table. Returns null if not set or not authenticated.
 */
export async function getSavedSignatureUrl(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users')
    .select('saved_signature_url')
    .eq('id', user.id)
    .maybeSingle();
  return (data?.saved_signature_url as string | null) ?? null;
}
