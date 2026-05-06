import { supabase } from '@/lib/supabase';

export type IncidentType = 'minor' | 'severe' | 'fatal' | 'mass' | 'nearmiss';
export type IncidentStatus = 'draft' | 'completed';

export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  minor: 'მსუბუქი',
  severe: 'მძიმე',
  fatal: 'ფატალური',
  mass: 'მასობრივი',
  nearmiss: 'საშიში შემთხვევა',
};

export interface Incident {
  id: string;
  project_id: string;
  type: IncidentType;
  injured_name: string | null;
  injured_role: string | null;
  date_time: string;
  location: string;
  description: string;
  cause: string;
  actions_taken: string;
  witnesses: string[];
  photos: string[];
  status: IncidentStatus;
  pdf_url: string | null;
  created_at: string;
}

const COLS =
  'id, project_id, type, injured_name, injured_role, date_time, location, description, cause, actions_taken, witnesses, photos, status, pdf_url, created_at';

export async function listIncidents(projectId?: string): Promise<Incident[]> {
  let q = supabase.from('incidents').select(COLS).order('date_time', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown[]) as Incident[];
}

export async function getIncident(id: string): Promise<Incident | null> {
  const { data, error } = await supabase
    .from('incidents')
    .select(COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Incident | null) ?? null;
}

export async function signedIncidentPdfUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('pdfs').createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function signedIncidentPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('incident-photos')
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
