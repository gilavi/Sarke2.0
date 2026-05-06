import { supabase } from '@/lib/supabase';

export type SignerRole =
  | 'safety_engineer'
  | 'project_manager'
  | 'client'
  | 'contractor'
  | 'other';

export const SIGNER_ROLE_LABEL: Record<string, string> = {
  safety_engineer: 'უსაფრთხოების ინჟინერი',
  project_manager: 'პროექტის მენეჯერი',
  client: 'დამკვეთი',
  contractor: 'კონტრაქტორი',
  other: 'სხვა',
};

export interface Template {
  id: string;
  owner_id: string | null;
  name: string;
  category: string | null;
  is_system: boolean;
  required_signer_roles: string[];
  created_at: string;
}

export async function listTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('id, owner_id, name, category, is_system, required_signer_roles, created_at')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Template[];
}
