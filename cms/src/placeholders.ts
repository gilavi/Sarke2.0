// Auto-fill placeholders like {{count}}, {{name}}, {{date}} are replaced by the
// app at runtime. If an editor deletes or alters one, that screen breaks — so the
// CMS detects when a value's placeholder set differs from the original and blocks
// the save until it's restored.

export function tokens(s: string | null): string[] {
  if (!s) return [];
  return (s.match(/\{\{[^}]+\}\}/g) ?? []).slice().sort();
}

/** True if `current` keeps exactly the same {{...}} tokens as `original`. */
export function sameTokens(original: string | null, current: string | null): boolean {
  const a = tokens(original);
  const b = tokens(current);
  return a.length === b.length && a.every((t, i) => t === b[i]);
}
