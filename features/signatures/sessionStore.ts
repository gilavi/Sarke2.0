// features/signatures/sessionStore.ts
//
// In-memory bridge from the inspection wizard (which captures signatures)
// to the post-completion result screen (which generates the PDF).
//
// REGULATORY: this store is RAM-only. No AsyncStorage / MMKV / SecureStore
// / file-system / DB writes from this file. Data lives until either:
//   1) The result screen calls `clearSignaturesSession(id)` after PDF
//      generation, OR
//   2) The process dies.
// Both endings are acceptable under the no-persistence rule. Do not add
// disk persistence to this store — it would be a regulatory violation.

import type { SignaturesState } from './useSignaturesState';

/** What the PDF generator needs to render the new signatures section. */
export interface SignaturesSessionData {
  creatorSignature: { pngBase64: string; capturedAtIso: string } | null;
  /** Number of empty hand-sign slots to render in the PDF. The rows hold no
   *  user data — only the count matters for rendering. */
  additionalRowsCount: number;
}

const sessions = new Map<string, SignaturesSessionData>();

/** Snapshot the wizard's signatures state and store it under the inspection id. */
export function setSignaturesSession(inspectionId: string, state: SignaturesState): void {
  sessions.set(inspectionId, {
    creatorSignature: state.creatorSignature
      ? {
          pngBase64: state.creatorSignature.pngBase64,
          capturedAtIso: state.creatorSignature.capturedAt.toISOString(),
        }
      : null,
    additionalRowsCount: state.additionalRows.length,
  });
}

/** Read the session for an inspection id. Returns null if nothing was stashed
 *  (which is the common case — e.g. user opened an old completed inspection
 *  with no live signature data). */
export function getSignaturesSession(inspectionId: string): SignaturesSessionData | null {
  return sessions.get(inspectionId) ?? null;
}

/** Drop the session — called after PDF generation completes. */
export function clearSignaturesSession(inspectionId: string): void {
  sessions.delete(inspectionId);
}
