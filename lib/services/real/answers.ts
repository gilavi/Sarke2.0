import { supabase } from '../../supabase';
import { logError } from '../../logError';
import { isAnswer } from '../../guards';
import type { Answer, AnswerPhoto } from '../../../types/models';
import { listOrThrow, throwIfError } from './_shared';

export const answersApi = {
  list: async (inspectionId: string): Promise<Answer[]> => {
    return listOrThrow<Answer>(
      await supabase.from('answers').select('*').eq('inspection_id', inspectionId),
      { guard: isAnswer, context: 'answersApi.list' },
    );
  },
  upsert: async (a: Partial<Answer> & { inspection_id: string; question_id: string }): Promise<Answer> => {
    return throwIfError<Answer>(
      await supabase
        .from('answers')
        .upsert(a, { onConflict: 'inspection_id,question_id' })
        .select()
        .single(),
    );
  },
  photos: async (answerId: string): Promise<AnswerPhoto[]> => {
    const { data, error } = await supabase
      .from('answer_photos')
      .select('*')
      .eq('answer_id', answerId);
    if (error) throw error;
    return data ?? [];
  },
  photosByAnswerIds: async (
    answerIds: string[],
  ): Promise<Record<string, AnswerPhoto[]>> => {
    if (answerIds.length === 0) return {};
    const { data, error } = await supabase
      .from('answer_photos')
      .select('*')
      .in('answer_id', answerIds);
    if (error) throw error;
    const out: Record<string, AnswerPhoto[]> = {};
    for (const p of (data ?? []) as AnswerPhoto[]) {
      (out[p.answer_id] ??= []).push(p);
    }
    return out;
  },
  addPhoto: async (
    answerId: string,
    storagePath: string,
    opts?: {
      caption?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      address?: string | null;
    },
  ): Promise<AnswerPhoto> => {
    return throwIfError<AnswerPhoto>(
      await supabase
        .from('answer_photos')
        .insert({
          answer_id: answerId,
          storage_path: storagePath,
          caption: opts?.caption ?? null,
          latitude: opts?.latitude ?? null,
          longitude: opts?.longitude ?? null,
          address: opts?.address ?? null,
        })
        .select()
        .single(),
    );
  },
  removePhoto: async (photoId: string) => {
    // Read the storage path first so we can also delete the blob in the
    // `answer-photos` bucket - otherwise deleting the row leaks the file.
    const { data: existing } = await supabase
      .from('answer_photos')
      .select('storage_path')
      .eq('id', photoId)
      .maybeSingle();
    const { error } = await supabase.from('answer_photos').delete().eq('id', photoId);
    if (error) throw error;
    const path = (existing as { storage_path?: string } | null)?.storage_path;
    if (path) {
      // Best-effort: don't fail the operation if the blob is already gone.
      await supabase.storage
        .from('answer-photos')
        .remove([path])
        .catch((e) => logError(e, 'answerPhotos.removeBlob'));
    }
  },
};
