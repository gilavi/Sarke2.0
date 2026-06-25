/**
 * duplicateDocument — clone a saved document as a NEW DRAFT.
 *
 * Like reopenDocument, this is an orchestrator over existing services, not a new
 * persistence primitive. It creates a fresh draft and copies the source's
 * content. Per the product decision, it copies *everything the schema persists*:
 *
 *   - incident   → all fields + photo path refs + the expert signature path.
 *   - report     → title + a deep copy of the slides (photo path refs shared).
 *   - briefing   → topics + participants (with their persisted base64 sigs) +
 *                  the expert's base64 signature.
 *   - act        → inspection + answers + attachments. Answer/cert photo BLOBS
 *                  are copied to new storage paths so the draft owns independent
 *                  files (the act copy is editable in the wizard, where deleting
 *                  a photo deletes its blob — sharing refs would corrupt the
 *                  original). Captured act signatures are never persisted, so
 *                  there is nothing to copy there (features/signatures/AGENTS.md).
 *
 * Photo refs are SHARED (not blob-copied) for incident/report because their
 * delete/edit paths never remove storage blobs, so sharing is safe there.
 *
 * Returns the new draft's id; the caller routes into the matching edit flow.
 */
import * as Crypto from 'expo-crypto';
import type { QueryClient } from '@tanstack/react-query';

import {
  inspectionsApi,
  inspectionAttachmentsApi,
  answersApi,
  incidentsApi,
  reportsApi,
  storageApi,
} from '../services';
import { briefingsApi } from '../briefingsApi';
import { STORAGE_BUCKETS } from '../supabase';
import { invalidateRecordLists } from '../apiHooks';
import { logError } from '../logError';
import type { AnswerPhoto } from '../../types/models';

/** Discriminated union of every duplicable document family (acts = generic only). */
export type DuplicateTarget =
  | { kind: 'genericInspection'; id: string }
  | { kind: 'report'; id: string }
  | { kind: 'incident'; id: string }
  | { kind: 'briefing'; id: string };

export interface DuplicateResult {
  /** id of the new draft. */
  id: string;
}

/** Local/data URIs can't be server-copied; share them as-is. */
function isStoredPath(path: string | null | undefined): path is string {
  return !!path && !path.startsWith('data:') && !path.startsWith('file:') && !path.startsWith('http');
}

/** Server-copy a stored photo blob into the new inspection's folder. */
async function copyPhotoBlob(bucket: string, srcPath: string, newInspectionId: string): Promise<string> {
  const prefix = srcPath.split('/')[0] || '';
  const ext = (srcPath.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
  const dest = `${prefix}/${newInspectionId}/${Crypto.randomUUID()}.${ext}`;
  return storageApi.copy(bucket, srcPath, dest);
}

async function duplicateIncident(id: string): Promise<DuplicateResult> {
  const src = await incidentsApi.getById(id);
  if (!src) throw new Error('duplicateDocument: incident not found');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, user_id: _u, created_at: _c, updated_at: _up, ...rest } = src;
  const newId = Crypto.randomUUID();
  await incidentsApi.create({
    ...rest,
    id: newId,
    status: 'draft',
    pdf_url: null,
    pdf_hash: null,
  });
  return { id: newId };
}

async function duplicateReport(id: string): Promise<DuplicateResult> {
  const src = await reportsApi.getById(id);
  if (!src) throw new Error('duplicateDocument: report not found');
  const created = await reportsApi.create({ projectId: src.project_id, title: src.title });
  // Deep-copy slides (photo path refs shared — report delete never removes blobs).
  const slides = src.slides.map((s) => ({ ...s }));
  await reportsApi.update(created.id, { slides, status: 'draft' });
  return { id: created.id };
}

async function duplicateBriefing(id: string): Promise<DuplicateResult> {
  const src = await briefingsApi.getById(id);
  if (!src) throw new Error('duplicateDocument: briefing not found');
  const created = await briefingsApi.create({
    projectId: src.projectId,
    dateTime: src.dateTime,
    topics: [...src.topics],
    participants: src.participants.map((p) => ({ ...p })),
    inspectorName: src.inspectorName,
  });
  // create() already forces status=draft + signature null; copy the persisted
  // expert signature onto the new draft.
  await briefingsApi.update(created.id, { inspectorSignature: src.inspectorSignature });
  return { id: created.id };
}

async function duplicateAct(id: string): Promise<DuplicateResult> {
  const src = await inspectionsApi.getById(id);
  if (!src) throw new Error('duplicateDocument: inspection not found');

  const created = await inspectionsApi.create({
    projectId: src.project_id,
    templateId: src.template_id,
    harnessName: src.harness_name ?? undefined,
    projectItemId: src.project_item_id,
  });
  // Copy conclusion photo blobs too (they live in the answer-photos bucket and
  // are editable in the wizard) so the draft owns independent files. A photo we
  // can't copy is dropped from the copy rather than shared (which would let the
  // draft's wizard delete the original's blob).
  const conclusionPaths: string[] = [];
  for (const p of src.conclusion_photo_paths ?? []) {
    if (!isStoredPath(p)) { conclusionPaths.push(p); continue; }
    try {
      conclusionPaths.push(await copyPhotoBlob(STORAGE_BUCKETS.answerPhotos, p, created.id));
    } catch (e) {
      logError(e, 'duplicateAct.conclusionPhotoCopy');
    }
  }
  await inspectionsApi.update({
    id: created.id,
    conclusion_text: src.conclusion_text,
    is_safe_for_use: src.is_safe_for_use,
    safety_verdict: src.safety_verdict ?? null,
    conclusion_photo_paths: conclusionPaths,
    status: 'draft',
  });

  // Answers + their photos (blobs copied so the draft is independent).
  const answers = await answersApi.list(id);
  const photosByAnswer =
    answers.length > 0 ? await answersApi.photosByAnswerIds(answers.map((a) => a.id)) : {};
  for (const a of answers) {
    const newAnswer = await answersApi.upsert({
      inspection_id: created.id,
      question_id: a.question_id,
      value_bool: a.value_bool,
      value_num: a.value_num,
      value_text: a.value_text,
      grid_values: a.grid_values,
      comment: a.comment,
      notes: a.notes,
    });
    for (const p of (photosByAnswer[a.id] ?? []) as AnswerPhoto[]) {
      let path = p.storage_path;
      if (isStoredPath(path)) {
        try {
          path = await copyPhotoBlob(STORAGE_BUCKETS.answerPhotos, path, created.id);
        } catch (e) {
          logError(e, 'duplicateAct.answerPhotoCopy');
          continue; // skip a photo we couldn't copy rather than share its blob
        }
      }
      await answersApi.addPhoto(newAnswer.id, path, {
        caption: p.caption,
        latitude: p.latitude,
        longitude: p.longitude,
        address: p.address,
      });
    }
  }

  // Attachments (equipment certificates) — copy the 16:9 cert photo blob too.
  const attachments = await inspectionAttachmentsApi.listByInspection(id);
  for (const att of attachments) {
    let photoPath = att.photo_path;
    if (isStoredPath(photoPath)) {
      try {
        photoPath = await copyPhotoBlob(STORAGE_BUCKETS.certificates, photoPath, created.id);
      } catch (e) {
        logError(e, 'duplicateAct.certPhotoCopy');
        photoPath = null;
      }
    }
    await inspectionAttachmentsApi.create({
      inspectionId: created.id,
      certType: att.cert_type,
      certNumber: att.cert_number,
      photoPath,
    });
  }

  return { id: created.id };
}

/**
 * Duplicate a completed document into a new draft, then refresh the record
 * lists. Throws if the underlying service writes fail.
 */
export async function duplicateDocument(
  target: DuplicateTarget,
  qc: QueryClient,
): Promise<DuplicateResult> {
  let result: DuplicateResult;
  switch (target.kind) {
    case 'genericInspection':
      result = await duplicateAct(target.id);
      break;
    case 'report':
      result = await duplicateReport(target.id);
      break;
    case 'incident':
      result = await duplicateIncident(target.id);
      break;
    case 'briefing':
      result = await duplicateBriefing(target.id);
      break;
  }
  invalidateRecordLists(qc);
  return result;
}
