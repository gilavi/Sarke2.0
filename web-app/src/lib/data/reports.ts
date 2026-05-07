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

export async function createReport(args: {
  projectId: string;
  title: string;
}): Promise<Report> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) throw userErr ?? new Error('არაავტორიზებული');

  const { data, error } = await supabase
    .from('reports')
    .insert({
      project_id: args.projectId,
      user_id: userData.user.id,
      title: args.title,
      status: 'draft',
      slides: [],
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as Report;
}

function randomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function addReportSlide(args: {
  report: Report;
  title: string;
  description: string;
  photo?: File | null;
}): Promise<Report> {
  let imagePath: string | null = null;
  if (args.photo) {
    const ext = args.photo.name.split('.').pop() ?? 'bin';
    imagePath = `${args.report.project_id}/${args.report.id}/${Date.now()}_${randomId()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('report-photos')
      .upload(imagePath, args.photo);
    if (upErr) throw upErr;
  }

  const existing = args.report.slides ?? [];
  const nextSlide: ReportSlide = {
    id: randomId(),
    order: existing.length,
    title: args.title,
    description: args.description,
    image_path: imagePath,
    annotated_image_path: null,
  };

  const updated = [...existing, nextSlide];
  const { data, error } = await supabase
    .from('reports')
    .update({ slides: updated })
    .eq('id', args.report.id)
    .select(COLS)
    .single();
  if (error) throw error;
  return data as Report;
}

export async function updateReportSlide(
  report: Report,
  slideId: string,
  patch: Partial<Pick<ReportSlide, 'title' | 'description'>>,
): Promise<Report> {
  const updated = (report.slides ?? []).map((s) =>
    s.id === slideId ? { ...s, ...patch } : s,
  );
  const { data, error } = await supabase
    .from('reports')
    .update({ slides: updated })
    .eq('id', report.id)
    .select(COLS)
    .single();
  if (error) throw error;
  return data as Report;
}

export async function removeReportSlide(report: Report, slideId: string): Promise<Report> {
  const existing = report.slides ?? [];
  const target = existing.find((s) => s.id === slideId);
  if (target) {
    const paths = [target.image_path, target.annotated_image_path].filter(
      (p): p is string => !!p,
    );
    if (paths.length) {
      await supabase.storage.from('report-photos').remove(paths);
    }
  }
  const updated = existing
    .filter((s) => s.id !== slideId)
    .map((s, i) => ({ ...s, order: i }));
  const { data, error } = await supabase
    .from('reports')
    .update({ slides: updated })
    .eq('id', report.id)
    .select(COLS)
    .single();
  if (error) throw error;
  return data as Report;
}

export async function deleteReport(report: Report): Promise<void> {
  const paths = (report.slides ?? [])
    .flatMap((s) => [s.image_path, s.annotated_image_path])
    .filter((p): p is string => !!p);
  if (paths.length) {
    await supabase.storage.from('report-photos').remove(paths);
  }
  const { error } = await supabase.from('reports').delete().eq('id', report.id);
  if (error) throw error;
}
