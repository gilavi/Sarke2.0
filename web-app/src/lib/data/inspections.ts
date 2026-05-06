import { supabase } from '@/lib/supabase';

export type InspectionStatus = 'draft' | 'in_progress' | 'completed' | string;

export interface Inspection {
  id: string;
  project_id: string;
  user_id: string;
  template_id: string;
  status: InspectionStatus;
  harness_name: string | null;
  conclusion_text: string | null;
  is_safe_for_use: boolean | null;
  inspector_signature: string | null;
  created_at: string;
  completed_at: string | null;
}

export async function listInspections(projectId?: string): Promise<Inspection[]> {
  let q = supabase
    .from('inspections')
    .select(
      'id, project_id, user_id, template_id, status, harness_name, conclusion_text, is_safe_for_use, inspector_signature, created_at, completed_at',
    )
    .order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Inspection[];
}

export async function countInspections(): Promise<number> {
  const { count, error } = await supabase
    .from('inspections')
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getInspection(id: string): Promise<Inspection | null> {
  const { data, error } = await supabase
    .from('inspections')
    .select(
      'id, project_id, user_id, template_id, status, harness_name, conclusion_text, is_safe_for_use, inspector_signature, created_at, completed_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
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
  if (error) throw error;
  return (data ?? []) as CertRow[];
}

export async function signedPdfUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('pdfs').createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export interface CreateInspectionInput {
  projectId: string;
  templateId: string;
  harnessName?: string | null;
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
      status: 'draft',
    })
    .select(
      'id, project_id, user_id, template_id, status, harness_name, conclusion_text, is_safe_for_use, inspector_signature, created_at, completed_at',
    )
    .single();
  if (error) throw error;
  return data as Inspection;
}

export async function deleteInspection(id: string): Promise<void> {
  const { error } = await supabase.from('inspections').delete().eq('id', id);
  if (error) throw error;
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
}

export async function listQuestions(templateId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('id, template_id, section, "order", type, title, min_val, max_val, unit')
    .eq('template_id', templateId)
    .order('section', { ascending: true })
    .order('"order"', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Question[];
}

export interface Answer {
  id: string;
  questionnaire_id: string;
  question_id: string;
  value_bool: boolean | null;
  value_num: number | null;
  value_text: string | null;
  comment: string | null;
}

export async function listAnswers(inspectionId: string): Promise<Answer[]> {
  const { data, error } = await supabase
    .from('answers')
    .select('id, questionnaire_id, question_id, value_bool, value_num, value_text, comment')
    .eq('questionnaire_id', inspectionId);
  if (error) throw error;
  return (data ?? []) as Answer[];
}

export async function upsertAnswer(input: {
  inspectionId: string;
  questionId: string;
  valueBool?: boolean | null;
  valueNum?: number | null;
  valueText?: string | null;
  comment?: string | null;
}): Promise<Answer> {
  const { data, error } = await supabase
    .from('answers')
    .upsert(
      {
        questionnaire_id: input.inspectionId,
        question_id: input.questionId,
        value_bool: input.valueBool ?? null,
        value_num: input.valueNum ?? null,
        value_text: input.valueText ?? null,
        comment: input.comment ?? null,
      },
      { onConflict: 'questionnaire_id,question_id' },
    )
    .select('id, questionnaire_id, question_id, value_bool, value_num, value_text, comment')
    .single();
  if (error) throw error;
  return data as Answer;
}

// -------- Answer Photos --------

export interface AnswerPhoto {
  id: string;
  answer_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

export async function listAnswerPhotos(answerId: string): Promise<AnswerPhoto[]> {
  const { data, error } = await supabase
    .from('answer_photos')
    .select('id, answer_id, storage_path, caption, created_at')
    .eq('answer_id', answerId);
  if (error) throw error;
  return (data ?? []) as AnswerPhoto[];
}

export async function addAnswerPhoto(
  answerId: string,
  storagePath: string,
  caption?: string | null,
): Promise<AnswerPhoto> {
  const { data, error } = await supabase
    .from('answer_photos')
    .insert({ answer_id: answerId, storage_path: storagePath, caption: caption ?? null })
    .select('id, answer_id, storage_path, caption, created_at')
    .single();
  if (error) throw error;
  return data as AnswerPhoto;
}

export async function removeAnswerPhoto(photoId: string, storagePath: string): Promise<void> {
  const { error } = await supabase.from('answer_photos').delete().eq('id', photoId);
  if (error) throw error;
  // Best-effort blob removal
  await supabase.storage.from('answer-photos').remove([storagePath]);
}

export async function updateInspection(
  id: string,
  patch: {
    harness_name?: string | null;
    conclusion_text?: string | null;
    is_safe_for_use?: boolean | null;
    inspector_signature?: string | null;
    status?: 'draft' | 'completed';
  },
): Promise<void> {
  const updates: Record<string, unknown> = { ...patch };
  if (patch.status === 'completed') updates.completed_at = new Date().toISOString();
  const { error } = await supabase.from('inspections').update(updates).eq('id', id);
  if (error) throw error;
}
