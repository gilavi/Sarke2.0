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
  created_at: string;
  completed_at: string | null;
}

export async function listInspections(projectId?: string): Promise<Inspection[]> {
  let q = supabase
    .from('inspections')
    .select(
      'id, project_id, user_id, template_id, status, harness_name, conclusion_text, is_safe_for_use, created_at, completed_at',
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
      'id, project_id, user_id, template_id, status, harness_name, conclusion_text, is_safe_for_use, created_at, completed_at',
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
