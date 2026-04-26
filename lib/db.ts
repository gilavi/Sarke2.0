import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = SQLite.openDatabaseAsync('sarke_sync.db');
  const db = await dbPromise;
  await initSchema(db);
  return db;
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
