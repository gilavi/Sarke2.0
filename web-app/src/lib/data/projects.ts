import { supabase } from '@/lib/supabase';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  company_name: string;
  address: string | null;
  contact_phone: string | null;
  logo: string | null;
  created_at: string;
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, user_id, name, company_name, address, contact_phone, logo, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function countProjects(): Promise<number> {
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, user_id, name, company_name, address, contact_phone, logo, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Project | null) ?? null;
}
