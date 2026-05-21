import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { storageApi, certificatesApi, incidentsApi } from './services';
import { logError } from './logError';
import type { IncidentStatus } from '../types/models';

const PENDING_KEY = 'pending-pdf-uploads';
const STAGE_DIR_NAME = 'pdf-upload-staging';

async function ensureStageDir(): Promise<string | null> {
  const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!base) return null;
  const dir = `${base}${STAGE_DIR_NAME}/`;
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
  } catch {
    return null;
  }
}

/**
 * Copy a temporary PDF file to a persistent staging directory so it survives
 * app restarts while waiting in the deferred upload queue.
 *
 * Returns the staged URI, or the original URI if staging fails.
 */
export async function stagePdfForQueue(tempUri: string, nameHint: string): Promise<string> {
  const dir = await ensureStageDir();
  if (!dir) return tempUri;
  const safeName = nameHint.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const staged = `${dir}${Date.now()}-${safeName}`;
  try {
    await FileSystem.copyAsync({ from: tempUri, to: staged });
    return staged;
  } catch {
    return tempUri;
  }
}

export interface CertificateDbPayload {
  inspectionId: string;
  templateId: string;
  pdfUrl: string;
  isSafeForUse: boolean | null;
  conclusionText: string | null;
  params?: Record<string, unknown>;
  pdf_hash?: string;
}

export interface IncidentUpdateDbPayload {
  incidentId: string;
  pdf_url: string;
  status?: string;
  pdf_hash?: string;
}

export interface PendingPdfUpload {
  id: string;
  localUri: string;
  bucket: string;
  path: string;
  contentType: string;
  dbOp:
    | { kind: 'certificate_create'; payload: CertificateDbPayload }
    | { kind: 'incident_update'; payload: IncidentUpdateDbPayload }
    | { kind: 'none' };
  attempts?: number;
}

async function readPending(): Promise<PendingPdfUpload[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PendingPdfUpload[];
  } catch {
    return [];
  }
}

async function writePending(list: PendingPdfUpload[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

/**
 * Queue a PDF for deferred upload to Supabase Storage (+ optional DB update).
 * The caller should already have shared the PDF locally; this just handles
 * cloud persistence in the background.
 *
 * Returns the queue item id so callers can track it if needed.
 */
export async function queuePdfUpload(
  item: Omit<PendingPdfUpload, 'id' | 'attempts'>,
): Promise<string> {
  const id = Crypto.randomUUID();
  const list = await readPending();
  list.push({ ...item, id, attempts: 0 });
  await writePending(list);
  return id;
}

/**
 * Remove a specific pending upload by id (e.g. if the caller decides to
 * abandon it).
 */
export async function removePendingPdfUpload(id: string): Promise<void> {
  const list = await readPending();
  const filtered = list.filter(p => p.id !== id);
  await writePending(filtered);
}

// Single-flight guard. All callers (app-open in _layout, plus NetInfo fetch +
// reconnect in OfflineProvider) run on the same JS thread, so a module-level
// boolean is enough to serialize them. Without it, two concurrent flushes both
// pass the check-then-create dedup below before either inserts, producing
// duplicate certificate rows (there is no DB unique constraint on certificates).
let isFlushingPdfUploads = false;

/**
 * Retry all queued PDF uploads. Call on app open, network reconnect, etc.
 * Idempotent and single-flight: concurrent calls are no-ops while one runs.
 */
export async function flushPendingPdfUploads(): Promise<void> {
  if (isFlushingPdfUploads) return;
  isFlushingPdfUploads = true;
  try {
    await flushPendingPdfUploadsInner();
  } finally {
    isFlushingPdfUploads = false;
  }
}

async function flushPendingPdfUploadsInner(): Promise<void> {
  let list = await readPending();
  if (list.length === 0) return;

  const still: PendingPdfUpload[] = [];
  const MAX_RETRIES = 3;

  for (const item of list) {
    try {
      // 1. Upload the PDF file to storage
      await storageApi.uploadFromUri(
        item.bucket,
        item.path,
        item.localUri,
        item.contentType,
      );

      // 2. Perform the DB operation
      if (item.dbOp.kind === 'certificate_create') {
        const p = item.dbOp.payload;
        // Guard against duplicate rows on retry: if a certificate with the
        // same inspection + pdfUrl already exists, skip creation.
        const existing = await certificatesApi.listByInspection(p.inspectionId);
        const already = existing.some(c => c.pdf_url === p.pdfUrl);
        if (!already) {
          await certificatesApi.create({
            inspectionId: p.inspectionId,
            templateId: p.templateId,
            pdfUrl: p.pdfUrl,
            isSafeForUse: p.isSafeForUse,
            conclusionText: p.conclusionText,
            params: p.params,
            pdf_hash: p.pdf_hash,
          });
        }
      } else if (item.dbOp.kind === 'incident_update') {
        const p = item.dbOp.payload;
        await incidentsApi.update(p.incidentId, {
          pdf_url: p.pdf_url,
          status: p.status as IncidentStatus | undefined,
          ...(p.pdf_hash ? { pdf_hash: p.pdf_hash } : {}),
        });
      }

      // 3. Clean up the local temp file if it still exists
      FileSystem.deleteAsync(item.localUri, { idempotent: true }).catch(() => undefined);
    } catch (e) {
      const attempts = (item.attempts ?? 0) + 1;
      if (attempts >= MAX_RETRIES) {
        logError(e, `pdfUploadQueue.drop.${item.dbOp.kind}`);
        // Clean up the local file on max retries to avoid leaking temp files
        FileSystem.deleteAsync(item.localUri, { idempotent: true }).catch(() => undefined);
      } else {
        still.push({ ...item, attempts });
      }
    }
  }

  await writePending(still);
}

/**
 * Return the number of pending PDF uploads.
 */
export async function pendingPdfUploadCount(): Promise<number> {
  const list = await readPending();
  return list.length;
}
