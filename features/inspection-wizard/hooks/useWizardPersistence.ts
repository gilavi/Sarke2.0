// Write-only AsyncStorage mirror for wizard mid-flow state.
//
// Persists step index, harness row count, conclusion text, safety
// verdict, and harness name as the user edits them, keyed per
// inspection id. Cleared on successful finish (see
// `saveConclusionAndGo` in `useWizardState`).
//
// Gated on `!loading` so the initial `load()` doesn't overwrite cached
// values before it has finished reading them.
//
// Owns NO state — this is a side-effect hook called from
// `useWizardState`. Splitting load/answers similarly is intentionally
// not done; see `AGENTS.md` for why.

import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from '../../../lib/logError';
import {
  conclusionKey,
  harnessCountKey,
  harnessNameKey,
  safetyKey,
  stepKey,
} from '../wizardSchema';

export function useWizardPersistence(args: {
  id: string | undefined;
  loading: boolean;
  stepIndex: number;
  harnessRowCount: number;
  conclusion: string;
  safetyVerdict: 'safe' | 'caution' | 'unsafe' | null;
  harnessName: string;
}) {
  const { id, loading, stepIndex, harnessRowCount, conclusion, safetyVerdict, harnessName } = args;

  // Persist step index
  useEffect(() => {
    if (!id || loading) return;
    AsyncStorage.setItem(stepKey(id), String(stepIndex)).catch((e) =>
      logError(e, 'wizard.persistStep'),
    );
  }, [id, stepIndex, loading]);

  useEffect(() => {
    if (!id || loading) return;
    AsyncStorage.setItem(harnessCountKey(id), String(harnessRowCount)).catch((e) =>
      logError(e, 'wizard.persistHarnessCount'),
    );
  }, [id, harnessRowCount, loading]);

  useEffect(() => {
    if (!id || loading) return;
    AsyncStorage.setItem(conclusionKey(id), conclusion).catch((e) =>
      logError(e, 'wizard.persistConclusion'),
    );
  }, [id, conclusion, loading]);

  useEffect(() => {
    if (!id || loading) return;
    if (safetyVerdict === null) {
      AsyncStorage.removeItem(safetyKey(id)).catch(() => {});
    } else {
      AsyncStorage.setItem(safetyKey(id), safetyVerdict).catch((e) =>
        logError(e, 'wizard.persistSafety'),
      );
    }
  }, [id, safetyVerdict, loading]);

  useEffect(() => {
    if (!id || loading) return;
    AsyncStorage.setItem(harnessNameKey(id), harnessName).catch((e) =>
      logError(e, 'wizard.persistHarnessName'),
    );
  }, [id, harnessName, loading]);
}
