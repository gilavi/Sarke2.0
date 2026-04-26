import * as SQLite from 'expo-sqlite';

// Single ready-promise that all callers await. Resolves only after the schema
// is fully migrated, so a second caller can't start a transaction while
// initSchema's multi-statement execAsync (which wraps in an implicit BEGIN)
// is still running on the same connection — that race is what produced
// "Calling the 'execAsync' function has failed → cannot start a transaction
// within another transaction" on inspection completion.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('sarke_sync.db');
      await initSchema(db);
      return db;
    })().catch((e) => {
      // Don't cache a rejected promise — let the next call retry.
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

async function initSchema(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_type TEXT NOT NULL CHECK(operation_type IN ('answer_upsert','questionnaire_update','photo_upload','signature_capture','pdf_generation')),
      target_table TEXT NOT NULL,
      target_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','failed')),
      depends_on INTEGER REFERENCES sync_queue(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_status ON sync_queue(status);
    CREATE INDEX IF NOT EXISTS idx_created ON sync_queue(created_at);
  `);
}
