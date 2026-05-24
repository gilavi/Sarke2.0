import type { Answer, AnswerPhoto } from '../../../types/models';
import { load, now, save, uuid } from './_store';

export const answersApi = {
  list: async (inspectionId: string): Promise<Answer[]> => {
    const db = await load();
    return db.answers.filter(a => a.inspection_id === inspectionId);
  },
  upsert: async (
    a: Partial<Answer> & { inspection_id: string; question_id: string },
  ): Promise<Answer> => {
    const db = await load();
    let row = db.answers.find(
      x => x.inspection_id === a.inspection_id && x.question_id === a.question_id,
    );
    if (row) {
      Object.assign(row, a);
    } else {
      row = {
        id: a.id ?? uuid(),
        inspection_id: a.inspection_id,
        question_id: a.question_id,
        value_bool: a.value_bool ?? null,
        value_num: a.value_num ?? null,
        value_text: a.value_text ?? null,
        grid_values: a.grid_values ?? null,
        comment: a.comment ?? null,
        notes: a.notes ?? null,
      };
      db.answers.push(row);
    }
    await save();
    return row;
  },
  photos: async (answerId: string): Promise<AnswerPhoto[]> => {
    const db = await load();
    return db.answer_photos.filter(p => p.answer_id === answerId);
  },
  photosByAnswerIds: async (
    answerIds: string[],
  ): Promise<Record<string, AnswerPhoto[]>> => {
    const db = await load();
    const ids = new Set(answerIds);
    const out: Record<string, AnswerPhoto[]> = {};
    for (const p of db.answer_photos) {
      if (ids.has(p.answer_id)) (out[p.answer_id] ??= []).push(p);
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
    const db = await load();
    const photo: AnswerPhoto = {
      id: uuid(),
      answer_id: answerId,
      storage_path: storagePath,
      caption: opts?.caption ?? null,
      latitude: opts?.latitude ?? null,
      longitude: opts?.longitude ?? null,
      address: opts?.address ?? null,
      created_at: now(),
    };
    db.answer_photos.push(photo);
    await save();
    return photo;
  },
  removePhoto: async (photoId: string) => {
    const db = await load();
    db.answer_photos = db.answer_photos.filter(p => p.id !== photoId);
    await save();
  },
};
