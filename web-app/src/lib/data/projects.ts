import { supabase } from '@/lib/supabase';

export interface CrewMember {
  id: string;
  roleKey: string;
  name: string;
  role: string;
  signature: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  company_name: string;
  address: string | null;
  contact_phone: string | null;
  logo: string | null;
  crew: CrewMember[] | null;
  created_at: string;
}

export interface ProjectSigner {
  id: string;
  project_id: string;
  full_name: string;
  position: string | null;
  phone: string | null;
}

export async function listProjectSigners(projectId: string): Promise<ProjectSigner[]> {
  const { data, error } = await supabase
    .from('project_signers')
    .select('id, project_id, full_name, position, phone')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProjectSigner[];
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, user_id, name, company_name, address, contact_phone, logo, crew, created_at')
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
    .select('id, user_id, name, company_name, address, contact_phone, logo, crew, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Project | null) ?? null;
}

export async function updateProject(
  id: string,
  patch: { name?: string; address?: string | null; contact_phone?: string | null },
): Promise<void> {
  const { error } = await supabase.from('projects').update(patch).eq('id', id);
  if (error) throw error;
}

export async function createProject(args: {
  userId: string;
  name: string;
  companyName: string;
  address: string | null;
  contactPhone: string | null;
}): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: args.userId,
      name: args.name,
      company_name: args.companyName,
      address: args.address,
      contact_phone: args.contactPhone,
    })
    .select('id, user_id, name, company_name, address, contact_phone, logo, crew, created_at')
    .single();
  if (error) throw error;
  return data as Project;
}
