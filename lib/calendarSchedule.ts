import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_KEY = '@calendar:schedules';
const MIGRATION_KEY = 'calendar_migration_v1_done';

// Public type — the shape callers work with.
export type ScheduleEntry = {
  completedAt: string;
  nextDueDate: string;
  nextDueDateOverride?: string;
};

// Internal stored shape — includes groupKey for early-detection across restarts.
type StoredEntry = ScheduleEntry & { groupKey: string };

export type ScheduleStore = {
  inspections: Record<string, ScheduleEntry>;
  briefings: Record<string, ScheduleEntry>;
};

type StoredStore = {
  inspections: Record<string, StoredEntry>;
  briefings: Record<string, StoredEntry>;
};

type EntityType = 'inspections' | 'briefings';

// ── Private helpers ──────────────────────────────────────────────────────────

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Returns true if the ISO date is today or in the future (start-of-day comparison). */
function isFuture(iso: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(iso) >= today;
}

async function readRawStore(): Promise<StoredStore> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return { inspections: {}, briefings: {} };
    return JSON.parse(raw) as StoredStore;
  } catch {
    return { inspections: {}, briefings: {} };
  }
}

async function writeRawStore(store: StoredStore): Promise<void> {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the full schedule store (public shape — groupKey stripped).
 */
export async function getStore(): Promise<ScheduleStore> {
  const raw = await readRawStore();
  // Strip groupKey from the public surface
  const strip = (bucket: Record<string, StoredEntry>): Record<string, ScheduleEntry> => {
    const out: Record<string, ScheduleEntry> = {};
    for (const [id, entry] of Object.entries(bucket)) {
      const { groupKey: _gk, ...rest } = entry;
      out[id] = rest;
    }
    return out;
  };
  return {
    inspections: strip(raw.inspections),
    briefings: strip(raw.briefings),
  };
}

/**
 * Called whenever an inspection or briefing is completed.
 *
 * @param entityType  'inspections' | 'briefings'
 * @param entityId    the row id used as the store key
 * @param completedAt ISO string of the completion timestamp
 * @param groupKey    "projectId:templateId" for inspections, "projectId" for briefings —
 *                    used to detect whether this completion is early (before the
 *                    previous cycle's effective due date)
 */
export async function recordCompletion(
  entityType: EntityType,
  entityId: string,
  completedAt: string,
  groupKey: string,
): Promise<void> {
  const store = await readRawStore();
  const bucket = store[entityType];

  // Detect early completion: is the most recent entry for the same group
  // still in the future?
  let nextDueDateOverride: string | undefined;
  const priorEntry = findMostRecentForGroup(bucket, groupKey);
  if (priorEntry) {
    const effective = priorEntry.nextDueDateOverride ?? priorEntry.nextDueDate;
    if (isFuture(effective)) {
      nextDueDateOverride = addDays(completedAt, 10);
    }
  }

  const entry: StoredEntry = {
    completedAt,
    nextDueDate: addDays(completedAt, 10),
    groupKey,
    ...(nextDueDateOverride !== undefined ? { nextDueDateOverride } : {}),
  };

  store[entityType] = { ...bucket, [entityId]: entry };
  await writeRawStore(store);
}

function findMostRecentForGroup(
  bucket: Record<string, StoredEntry>,
  groupKey: string,
): StoredEntry | undefined {
  const matches = Object.values(bucket).filter(e => e.groupKey === groupKey);
  if (matches.length === 0) return undefined;
  return matches.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  )[0];
}

/**
 * One-time migration: seeds schedule entries for all previously completed
 * inspections and briefings that have no entry yet.
 * Safe to call multiple times — skips if migration flag is already set.
 */
export async function runMigrationIfNeeded(
  completedInspections: Array<{
    id: string;
    completed_at: string;
    project_id: string;
    template_id: string;
  }>,
  completedBriefings: Array<{
    id: string;
    dateTime: string;
    projectId: string;
  }>,
): Promise<void> {
  const done = await AsyncStorage.getItem(MIGRATION_KEY);
  if (done === '1') return;

  const store = await readRawStore();

  for (const insp of completedInspections) {
    if (!insp.completed_at) continue;
    if (store.inspections[insp.id]) continue; // already seeded
    const groupKey = `${insp.project_id}:${insp.template_id}`;
    store.inspections[insp.id] = {
      completedAt: insp.completed_at,
      nextDueDate: addDays(insp.completed_at, 10),
      groupKey,
    };
  }

  for (const brief of completedBriefings) {
    if (!brief.dateTime) continue;
    if (store.briefings[brief.id]) continue;
    store.briefings[brief.id] = {
      completedAt: brief.dateTime,
      nextDueDate: addDays(brief.dateTime, 10),
      groupKey: brief.projectId,
    };
  }

  await writeRawStore(store);
  await AsyncStorage.setItem(MIGRATION_KEY, '1');
}
