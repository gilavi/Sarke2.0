import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKETS, signedUrl, upload, removeObjects } from '@/lib/db/storage';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';

export type IncidentRow = Tables<'incidents'>;

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
  inspector_signature: string | null;
  created_at: string;
}

const COLS =
  'id, project_id, type, injured_name, injured_role, date_time, location, description, cause, actions_taken, witnesses, photos, status, pdf_url, inspector_signature, created_at';

export async function listIncidents(projectId?: string): Promise<Incident[]> {
  let q = supabase.from('incidents').select(COLS).order('date_time', { ascending: false }).limit(50);
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown[]) as Incident[];
}

export async function getIncident(id: string): Promise<Incident | null> {
  const { data, error } = await supabase
    .from('incidents')
    .select(COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Incident | null) ?? null;
}

export function signedIncidentPdfUrl(path: string): Promise<string> {
  return signedUrl(STORAGE_BUCKETS.pdfs, path);
}

export function signedIncidentPhotoUrl(path: string): Promise<string> {
  return signedUrl(STORAGE_BUCKETS.incidentPhotos, path);
}

/**
 * Add a photo to an existing incident by uploading to `incident-photos` bucket
 * and appending the storage path to the incident's photos array.
 */
export async function addIncidentPhoto(
  incident: Incident,
  file: File,
): Promise<string> {
  const dotIdx = file.name.lastIndexOf('.');
  const ext = dotIdx > 0 ? file.name.slice(dotIdx + 1) : 'jpg';
  const path = `${incident.project_id}/${incident.id}_${Date.now()}.${ext}`;
  await upload(STORAGE_BUCKETS.incidentPhotos, path, file, {
    contentType: file.type || 'image/jpeg',
  });

  const next = [...incident.photos, path];
  const { error } = await supabase.from('incidents').update({ photos: next }).eq('id', incident.id);
  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
  // best-effort blob removal
  await removeObjects(STORAGE_BUCKETS.incidentPhotos, [path]);
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
    inspector_signature: string | null;
  }>,
): Promise<void> {
  const { error } = await supabase
    .from('incidents')
    .update(patch as TablesUpdate<'incidents'>)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteIncident(item: Incident): Promise<void> {
  if (item.photos.length > 0) {
    await removeObjects(STORAGE_BUCKETS.incidentPhotos, item.photos);
  }
  const { error } = await supabase.from('incidents').delete().eq('id', item.id);
  if (error) throw new Error(error.message);
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
      const dotIdx = file.name.lastIndexOf('.');
      const ext = dotIdx > 0 ? file.name.slice(dotIdx + 1) : 'bin';
      const path = `${input.projectId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      await upload(STORAGE_BUCKETS.incidentPhotos, path, file);
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
    } as TablesInsert<'incidents'>)
    .select(COLS)
    .single();
  if (error) throw new Error(error.message);
  return data as Incident;
}
