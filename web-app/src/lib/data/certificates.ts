import { supabase } from '@/lib/supabase';

export interface Certificate {
  id: string;
  inspection_id: string;
  user_id: string;
  template_id: string;
  pdf_url: string;
  is_safe_for_use: boolean | null;
  conclusion_text: string | null;
  generated_at: string;
}

export async function countCertificates(): Promise<number> {
  const { count, error } = await supabase
    .from('certificates')
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function listCertificates(): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select('id, inspection_id, user_id, template_id, pdf_url, is_safe_for_use, conclusion_text, generated_at')
    .order('generated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Certificate[];
}

export async function signedCertificatePdfUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('pdfs').createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
