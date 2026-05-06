import { supabase } from '@/lib/supabase';

export interface Qualification {
  id: string;
  user_id: string;
  type: string;
  number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  file_url: string | null;
  created_at: string;
}

export const QUALIFICATION_TYPE_LABEL: Record<string, string> = {
  xaracho_inspector: 'ხარაჩოს ინსპექტორი',
  harness_inspector: 'სამშენებლო ღვედის ინსპექტორი',
};

export function qualificationLabel(type: string): string {
  return QUALIFICATION_TYPE_LABEL[type] ?? type;
}

export async function listQualifications(): Promise<Qualification[]> {
  const { data, error } = await supabase
    .from('qualifications')
    .select('id, user_id, type, number, issued_at, expires_at, file_url, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Qualification[];
}

export async function signedQualificationFileUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('certificates')
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return false;
  const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 30;
}

export function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}
