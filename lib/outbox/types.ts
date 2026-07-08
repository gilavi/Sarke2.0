// Op shapes for the generic write outbox (see AGENTS.md). Everything here
// must round-trip JSON.stringify/parse — no Dates, no functions, no class
// instances. `groupId` chains the ops of one logical document: on flush, a
// failing op skips the REST of its group for that pass (ordering), and an
// op that exhausts its retries drags its whole group to the failed queue.

/** Entities the record_save op can write. Keys into lib/outbox/registry.ts. */
export type OutboxEntity =
  | 'order'
  | 'briefing'
  | 'incident'
  | 'report'
  | 'risk_assessment'
  | 'breathalyzer_log';

interface OutboxOpBase {
  /** Unique op id (uuid). */
  id: string;
  /** Record id this op belongs to — ops of one document share it. */
  groupId: string;
  /** Flush failures so far (auth-aborts don't count). */
  attempts: number;
  enqueuedAt: string;
  /** Georgian display title for the pending-sync UI. */
  displayTitle: string;
  /**
   * Raw message of the error that moved this op to the failed queue — the
   * pending-sync UI maps it through friendlyError. Set by the flush when a
   * group fails out; cleared when the group is retried/revived.
   */
  lastError?: string;
}

/** Create/update a record row through the entity registry. */
export interface RecordSaveOp extends OutboxOpBase {
  kind: 'record_save';
  entity: OutboxEntity;
  mode: 'create' | 'update';
  recordId: string;
  /** The exact args object for registry create / the patch for update. */
  payload: Record<string, unknown>;
  projectId: string | null;
}

/** Upload a staged local file to storage (photo etc.; path pre-computed). */
export interface FileUploadOp extends OutboxOpBase {
  kind: 'file_upload';
  bucket: string;
  path: string;
  localUri: string;
  contentType: string;
}

/** Upload a staged PDF, then (optionally) patch its record row. */
export interface PdfUploadOp extends OutboxOpBase {
  kind: 'pdf_upload';
  bucket: string;
  path: string;
  localUri: string;
  dbPatch: { entity: OutboxEntity; recordId: string; patch: Record<string, unknown> } | null;
}

/**
 * Create an inspection offline. Self-contained replay payload — for the
 * equipment variant the parent public.inspections row goes first via the
 * idempotent create_equipment_inspection RPC, then the equipment row is
 * UPSERTED (ignoreDuplicates) into `table`; the generic variant upserts the
 * inspections row directly. Preserves the parent-row-first rule from
 * CLAUDE.md / INSPECTION_ARCHITECTURE_NOTES.md.
 */
export interface InspectionCreateOp extends OutboxOpBase {
  kind: 'inspection_create';
  variant: 'equipment' | 'generic';
  inspectionId: string;
  projectId: string;
  /** Equipment only: args for the create_equipment_inspection RPC. */
  rpcArgs: Record<string, unknown> | null;
  /** Equipment: the `<type>_inspections` table; generic: 'inspections'. */
  table: string;
  /** The exact row to upsert (id included). */
  insertRow: Record<string, unknown>;
}

/**
 * UPDATE a `<type>_inspections` row for the typed equipment flows — the
 * offline path for makeInspectionService.patch/complete. Enqueue-side
 * coalescing (storage.ts) folds a patch into a still-queued
 * inspection_create's insertRow or into the previous equipment_patch of the
 * same row; a completion (syncParent set) always appends so the parent
 * public.inspections status mirror runs AFTER the row exists (group FIFO).
 */
export interface EquipmentPatchOp extends OutboxOpBase {
  kind: 'equipment_patch';
  inspectionId: string;
  /** The `<type>_inspections` table the patch applies to. */
  table: string;
  /** snake_case column patch (already mapped through the service's toDb). */
  patch: Record<string, unknown>;
  /**
   * complete()/reopen() only: mirror status + completed_at onto the parent
   * public.inspections row after the equipment-table update (the unified
   * feeds read the parent — see service.ts syncParent).
   */
  syncParent: { status: 'draft' | 'completed'; completedAt: string | null } | null;
}

export type OutboxOp = RecordSaveOp | FileUploadOp | PdfUploadOp | InspectionCreateOp | EquipmentPatchOp;

// Omit over a union must distribute per-member (plain Omit collapses the
// union to its common keys).
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An op as callers enqueue it — id/attempts/enqueuedAt are filled in by storage. */
export type NewOutboxOp = DistributiveOmit<OutboxOp, 'id' | 'attempts' | 'enqueuedAt'>;
