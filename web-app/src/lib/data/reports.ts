import { supabase } from '@/lib/supabase';

export type ReportStatus = 'draft' | 'completed';

export interface ReportSlide {
  id: string;
  order: number;
  title: string;
  description: string;
  image_path: string | null;
  annotated_image_path: string | null;
}

export interface Report {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  status: ReportStatus;
  slides: ReportSlide[] | null;
  pdf_url: string | null;
  created_at: string;
}

const COLS = 'id, project_id, user_id, title, status, slides, pdf_url, created_at';

export async function listReports(projectId?: string): Promise<Report[]> {
  let q = supabase.from('reports').select(COLS).order('created_at', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Report[];
}

export async function getReport(id: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select(COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Report | null) ?? null;
}

export async function signedReportPdfUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('pdfs').createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function signedReportPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('report-photos')
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
