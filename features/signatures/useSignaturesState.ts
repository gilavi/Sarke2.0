// features/signatures/useSignaturesState.ts
//
// Wizard-scope state for the unified signatures flow. Holds the captured
// creator signature (in memory only) and the array of empty additional
// signing slots. See features/signatures/AGENTS.md for the no-persistence
// rule that governs this state.

import { useCallback, useState } from 'react';
import type { AdditionalSignatureRow, SignatureData } from './types';

let rowSeq = 0;
function newRowId(): string {
  rowSeq += 1;
  return `row_${Date.now().toString(36)}_${rowSeq}`;
}

export interface SignaturesState {
  creatorSignature: SignatureData | null;
  additionalRows: AdditionalSignatureRow[];
  setCreatorSignature: (pngBase64: string) => void;
  clearCreatorSignature: () => void;
  addRow: () => void;
  removeRow: (id: string) => void;
  /** Wipe both the captured signature and any added rows. Call explicitly
   *  after PDF generation so nothing lingers in wizard state. */
  clear: () => void;
}

export function useSignaturesState(): SignaturesState {
  const [creatorSignature, setCreatorSignatureState] = useState<SignatureData | null>(null);
  const [additionalRows, setAdditionalRows] = useState<AdditionalSignatureRow[]>([]);

  const setCreatorSignature = useCallback((pngBase64: string) => {
    setCreatorSignatureState({ pngBase64, capturedAt: new Date() });
  }, []);

  const clearCreatorSignature = useCallback(() => {
    setCreatorSignatureState(null);
  }, []);

  const addRow = useCallback(() => {
    setAdditionalRows(rs => [...rs, { id: newRowId() }]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setAdditionalRows(rs => rs.filter(r => r.id !== id));
  }, []);

  const clear = useCallback(() => {
    setCreatorSignatureState(null);
    setAdditionalRows([]);
  }, []);

  return {
    creatorSignature,
    additionalRows,
    setCreatorSignature,
    clearCreatorSignature,
    addRow,
    removeRow,
    clear,
  };
}
