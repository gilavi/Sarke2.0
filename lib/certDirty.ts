// Tiny cross-screen signal: the certificates route (a real pushed screen now,
// no longer a modal callback) marks an inspection's attachments dirty after a
// save/delete; the inspection-result screen consumes the flag on focus and
// rebuilds its live PDF preview only when something actually changed.
//
// Why not React Query: inspection attachments are loaded into per-screen local
// state (not a query), so there's no cache to invalidate. This keeps the
// refresh narrow instead of rebuilding the preview on every refocus.

const dirty = new Set<string>();

/** Called by the certificates screen after a successful save/delete. */
export function markCertsDirty(inspectionId: string) {
  dirty.add(inspectionId);
}

/** Returns true (and clears the flag) if this inspection's certs changed. */
export function consumeCertsDirty(inspectionId: string): boolean {
  if (!dirty.has(inspectionId)) return false;
  dirty.delete(inspectionId);
  return true;
}
