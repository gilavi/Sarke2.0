/**
 * Declarative camelCase → snake_case field mapping for the equipment
 * inspection services.
 *
 * Every `lib/<type>Service.ts` used to hand-write its `toDb(patch)` as a long
 *   `if ('camelKey' in patch) db.snake_col = patch.camelKey`
 * chain — pure mechanical boilerplate, replicated across nine files, and the
 * one place a typo silently dropped a column from saves (the mapping is
 * stringly-typed against the DB). `makeToDb` centralizes that loop once and
 * constrains the map's KEYS to `keyof P`, so a mistyped camel key is now a
 * compile error instead of a lost write.
 *
 * Only the fully-mechanical `toDb` direction lives here. `toModel` stays
 * hand-written per type on purpose: its per-field transforms (null-coalescing
 * to `''`, enum casts, array-length guards, signatory normalization) are the
 * genuinely custom parts, and folding them into a generic reader would require
 * casting whole rows to the model type — reintroducing exactly the untyped
 * drift this refactor removes. See docs/primitives.md → "Equipment patch → DB
 * field map".
 */

/**
 * Maps each **writable** camelCase patch key to its snake_case DB column.
 * `Partial` because ephemeral / never-persisted keys (signatures,
 * inspectorSignature, signer* …) are deliberately omitted — sending them would
 * either write memory-only state or hit a dropped column. Keys are constrained
 * to `keyof P & string`, so a typo won't typecheck.
 */
export type PatchFieldMap<P> = Partial<Record<keyof P & string, string>>;

/**
 * Build a `toDb(patch)` that copies each present writable field to its DB
 * column. A key is emitted only when it is physically present in the patch
 * (`in`), preserving the hand-written partial-update semantics: absent keys are
 * skipped, while an explicit `null` value is written through (so a field can be
 * cleared). Returns a fresh object each call; never mutates the patch.
 *
 * @param fieldMap camelKey → snake_column for every persisted field.
 * @returns `(patch) => Record<snakeColumn, value>` with only present keys.
 */
export function makeToDb<P extends object>(
  fieldMap: PatchFieldMap<P>,
): (patch: P) => Record<string, unknown> {
  const entries = Object.entries(fieldMap) as [string, string][];
  return (patch: P): Record<string, unknown> => {
    const src = patch as Record<string, unknown>;
    const db: Record<string, unknown> = {};
    for (const [camel, snake] of entries) {
      if (camel in src) db[snake] = src[camel];
    }
    return db;
  };
}
