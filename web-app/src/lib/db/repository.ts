/**
 * Generic CRUD repository factory.
 *
 * The five equipment-inspection data modules (bobcat, excavator,
 * generalEquipment, cargoPlatform) — and most other domain modules — share an
 * identical shape: `list(projectId?)` ordered by created_at with a limit,
 * `get(id)` via maybeSingle, an auth-guarded `create`, an `update` that maps a
 * partial patch to snake_case columns, and a `remove`. Only the table name,
 * column set, and field mapping differ.
 *
 * `makeRepository` owns the plumbing (the Supabase calls, error wrapping, auth
 * guard, ordering, limit). Per-entity code supplies three small pure mappers:
 * `toModel`, `toInsert`, `toUpdate`. `mapDefined` removes the copy-pasted
 * `if (patch.x !== undefined) row.col = patch.x` ladders from those mappers.
 */
import { supabase } from '@/lib/supabase';

/** Message shown by auth-guarded creates. Matches the existing literal. */
export const NOT_AUTHENTICATED = 'არაავტორიზებული';

export interface Repository<TModel, TCreate, TPatch> {
  list(projectId?: string | null): Promise<TModel[]>;
  get(id: string): Promise<TModel | null>;
  create(input: TCreate): Promise<TModel>;
  update(id: string, patch: TPatch): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface RepositoryConfig<TModel, TRow, TCreate, TPatch> {
  /** Postgres table name, e.g. 'bobcat_inspections'. */
  table: string;
  /** Explicit column select list (a Postgrest select string). */
  columns: string;
  /** Map a DB row to the camelCase domain model. */
  toModel: (row: TRow) => TModel;
  /** Build the insert payload from create input + the authenticated user id. */
  toInsert: (input: TCreate, userId: string) => Record<string, unknown>;
  /** Build the (snake_case) update payload from a partial patch. */
  toUpdate: (patch: TPatch) => Record<string, unknown>;
  /** Column used to scope `list(projectId)`. Default 'project_id'. */
  projectColumn?: string;
  /** Column used to order `list`. Default 'created_at'. */
  orderColumn?: string;
  /** Order direction for `list`. Default false (descending / newest first). */
  orderAscending?: boolean;
  /** Max rows returned by `list`. Default 50; pass `null` for no limit. */
  listLimit?: number | null;
}

export function makeRepository<TModel, TRow, TCreate, TPatch>(
  cfg: RepositoryConfig<TModel, TRow, TCreate, TPatch>,
): Repository<TModel, TCreate, TPatch> {
  const projectColumn = cfg.projectColumn ?? 'project_id';
  const orderColumn = cfg.orderColumn ?? 'created_at';
  const orderAscending = cfg.orderAscending ?? false;
  const listLimit = cfg.listLimit === undefined ? 50 : cfg.listLimit;

  return {
    async list(projectId) {
      let q = supabase
        .from(cfg.table)
        .select(cfg.columns)
        .order(orderColumn, { ascending: orderAscending });
      if (listLimit != null) q = q.limit(listLimit);
      if (projectId) q = q.eq(projectColumn, projectId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return ((data ?? []) as TRow[]).map(cfg.toModel);
    },

    async get(id) {
      const { data, error } = await supabase
        .from(cfg.table)
        .select(cfg.columns)
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? cfg.toModel(data as TRow) : null;
    },

    async create(input) {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr ?? new Error(NOT_AUTHENTICATED);
      const { data, error } = await supabase
        .from(cfg.table)
        .insert(cfg.toInsert(input, userData.user.id))
        .select(cfg.columns)
        .single();
      if (error) throw new Error(error.message);
      return cfg.toModel(data as TRow);
    },

    async update(id, patch) {
      const updates = cfg.toUpdate(patch);
      if (Object.keys(updates).length === 0) return;
      const { error } = await supabase.from(cfg.table).update(updates).eq('id', id);
      if (error) throw new Error(error.message);
    },

    async remove(id) {
      const { error } = await supabase.from(cfg.table).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
  };
}

/**
 * Copy each defined (`!== undefined`) value from `patch` into a snake_case row
 * object, using `map` to translate camelCase model keys to DB columns.
 * Replaces the long `if (patch.x !== undefined) row.col = patch.x` ladders.
 *
 *   toUpdate: (p) => mapDefined(p, { equipmentModel: 'equipment_model', notes: 'notes' })
 */
export function mapDefined<TPatch extends object>(
  patch: TPatch,
  map: Partial<Record<keyof TPatch, string>>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const key of Object.keys(map) as (keyof TPatch)[]) {
    const value = patch[key];
    if (value !== undefined) {
      row[map[key] as string] = value;
    }
  }
  return row;
}
