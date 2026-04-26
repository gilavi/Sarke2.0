import { getDb } from './db';

export type OperationType =
  | 'answer_upsert'
  | 'questionnaire_update'
  | 'photo_upload'
  | 'signature_capture'
  | 'pdf_generation';

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueueItem {
  id: number;
  operation_type: OperationType;
  target_table: string;
  target_id: string;
  payload_json: string;
  priority: number;
  created_at: string;
  retry_count: number;
  last_error: string | null;
  status: QueueStatus;
  depends_on: number | null;
}

export async function addToQueue(
  operationType: OperationType,
  targetTable: string,
  targetId: string,
  payload: Record<string, unknown>,
  priority = 0,
  dependsOn?: number | null,
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO sync_queue (operation_type, target_table, target_id, payload_json, priority, depends_on)
     VALUES (?, ?, ?, ?, ?, ?)`,
    operationType,
    targetTable,
    targetId,
    JSON.stringify(payload),
    priority,
    dependsOn ?? null,
  );
  return result.lastInsertRowId;
}

export async function getPendingItems(limit = 50): Promise<QueueItem[]> {
  const db = await getDb();
  return db.getAllAsync<QueueItem>(
    `SELECT * FROM sync_queue
     WHERE status = 'pending'
     ORDER BY priority DESC, created_at ASC
     LIMIT ?`,
    limit,
  );
}

export async function getProcessingItems(): Promise<QueueItem[]> {
  const db = await getDb();
  return db.getAllAsync<QueueItem>(
    `SELECT * FROM sync_queue WHERE status = 'processing' ORDER BY created_at ASC`,
  );
}

export async function markCompleted(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'completed', retry_count = 0, last_error = NULL WHERE id = ?`,
    id,
  );
}

export async function markFailed(id: number, error: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
    error,
    id,
  );
}

export async function resetProcessingToPending(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE sync_queue SET status = 'pending' WHERE status = 'processing'`);
}

export async function deleteCompletedBefore(date: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM sync_queue WHERE status = 'completed' AND created_at < ?`, date);
}

export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`,
  );
  return row?.count ?? 0;
}

export async function processQueue(
  handler: (item: QueueItem) => Promise<void>,
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const items = await db.getAllAsync<QueueItem>(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 50`,
    );
    for (const item of items) {
      await db.runAsync(`UPDATE sync_queue SET status = 'processing' WHERE id = ?`, item.id);
      try {
        await handler(item);
        await db.runAsync(
          `UPDATE sync_queue SET status = 'completed', retry_count = 0, last_error = NULL WHERE id = ?`,
          item.id,
        );
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        await db.runAsync(
          `UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
          err,
          item.id,
        );
      }
    }
  });
}
