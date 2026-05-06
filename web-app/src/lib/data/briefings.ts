import { supabase } from '@/lib/supabase';

export type BriefingStatus = 'draft' | 'completed' | string;

export interface BriefingParticipant {
  fullName: string;
  position?: string | null;
  signature?: string | null;
}

export interface Briefing {
  id: string;
  projectId: string;
  dateTime: string;
  topics: string[];
  participants: BriefingParticipant[];
  inspectorName: string;
  status: BriefingStatus;
  createdAt: string;
}

interface DbRow {
  id: string;
  project_id: string;
  date_time: string;
  topics: string[] | null;
  participants: BriefingParticipant[] | null;
  inspector_name: string | null;
  status: string;
  created_at: string;
}

function toModel(r: DbRow): Briefing {
  return {
    id: r.id,
    projectId: r.project_id,
    dateTime: r.date_time,
    topics: r.topics ?? [],
    participants: r.participants ?? [],
    inspectorName: r.inspector_name ?? '',
    status: r.status,
    createdAt: r.created_at,
  };
}

export async function listBriefings(projectId?: string): Promise<Briefing[]> {
  let q = supabase
    .from('briefings')
    .select('id, project_id, date_time, topics, participants, inspector_name, status, created_at')
    .order('date_time', { ascending: false });
  if (projectId) q = q.eq('project_id', projectId);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(toModel);
}

export async function getBriefing(id: string): Promise<Briefing | null> {
  const { data, error } = await supabase
    .from('briefings')
    .select('id, project_id, date_time, topics, participants, inspector_name, status, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toModel(data as DbRow) : null;
}

const TOPIC_LABELS: Record<string, string> = {
  scaffold_safety: 'ხარაჩოს უსაფრთხოება',
  height_work: 'სიმაღლეზე მუშაობა',
  ppe: 'დამცავი აღჭურვილობა',
  evacuation: 'საევაკუაციო გეგმა',
  fire_safety: 'ხანძარსაწინააღმდეგო',
};

export function topicLabel(t: string): string {
  if (t.startsWith('custom:')) return t.slice(7);
  return TOPIC_LABELS[t] ?? t;
}
