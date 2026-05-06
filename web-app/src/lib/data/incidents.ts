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

/**
 * Add a photo to an existing incident by uploading to `incident-photos` bucket
 * and appending the storage path to the incident's photos array.
 */
export async function addIncidentPhoto(
  incident: Incident,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${incident.project_id}/${incident.id}_${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('incident-photos').upload(path, file, {
    contentType: file.type || 'image/jpeg',
  });
  if (upErr) throw upErr;

  const next = [...incident.photos, path];
  const { error } = await supabase.from('incidents').update({ photos: next }).eq('id', incident.id);
  if (error) throw error;
  return path;
}

/**
 * Remove a single photo from an incident (storage + row).
 */
export async function removeIncidentPhoto(
  incident: Incident,
  path: string,
): Promise<void> {
  const next = incident.photos.filter((p) => p !== path);
  const { error } = await supabase.from('incidents').update({ photos: next }).eq('id', incident.id);
  if (error) throw error;
  // best-effort blob removal
  await supabase.storage.from('incident-photos').remove([path]);
}

export async function updateIncident(
  id: string,
  patch: Partial<{
    description: string;
    cause: string;
    actions_taken: string;
    location: string | null;
    injured_name: string | null;
    injured_role: string | null;
  }>,
): Promise<void> {
  const { error } = await supabase.from('incidents').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteIncident(item: Incident): Promise<void> {
  if (item.photos.length > 0) {
    await supabase.storage.from('incident-photos').remove(item.photos);
  }
  const { error } = await supabase.from('incidents').delete().eq('id', item.id);
  if (error) throw error;
}

export interface CreateIncidentInput {
  projectId: string;
  type: IncidentType;
  dateTime: string;
  description: string;
  cause: string;
  actionsTaken: string;
  witnesses: string[];
  injuredName?: string;
  injuredRole?: string;
  location?: string;
  attachments?: File[];
}

export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  const photos: string[] = [];

  if (input.attachments && input.attachments.length > 0) {
    for (const file of input.attachments) {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${input.projectId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('incident-photos')
        .upload(path, file);
      if (upErr) throw upErr;
      photos.push(path);
    }
  }

  const { data, error } = await supabase
    .from('incidents')
    .insert({
      project_id: input.projectId,
      type: input.type,
      date_time: input.dateTime,
      description: input.description,
      cause: input.cause,
      actions_taken: input.actionsTaken,
      witnesses: input.witnesses,
      injured_name: input.injuredName ?? null,
      injured_role: input.injuredRole ?? null,
      location: input.location ?? null,
      photos,
      status: 'draft',
    })
    .select(COLS)
    .single();
  if (error) throw error;
  return data as Incident;
}
