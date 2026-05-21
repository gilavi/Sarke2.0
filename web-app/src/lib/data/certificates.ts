import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKETS, signedUrl, upload } from '@/lib/db/storage';
import type { User } from '@supabase/supabase-js';

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
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listCertificates(): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select('id, inspection_id, user_id, template_id, pdf_url, is_safe_for_use, conclusion_text, generated_at')
    .order('generated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Certificate[];
}

export function signedCertificatePdfUrl(path: string): Promise<string> {
  return signedUrl(STORAGE_BUCKETS.pdfs, path);
}

/** Upload a PDF file and insert a certificate record. */
export async function uploadCertificate(file: File, user: User): Promise<Certificate> {
  const ext = file.name.split('.').pop() ?? 'pdf';
  const path = `certificates/${user.id}/${Date.now()}.${ext}`;
  await upload(STORAGE_BUCKETS.pdfs, path, file, { contentType: file.type || 'application/pdf' });

  const { data, error } = await supabase
    .from('certificates')
    .insert({
      user_id: user.id,
      pdf_url: path,
      conclusion_text: file.name.replace(/\.pdf$/i, ''),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Certificate;
}
