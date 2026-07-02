// Hook surface for the pending-sync UI (components/PendingSyncSection.tsx).

import { useEffect, useMemo, useState } from 'react';
import { readOutboxQueue, readOutboxFailed, subscribeOutbox } from './storage';
import { flushOutbox, retryOutboxFailed, dismissOutboxFailed } from './flush';
import type { OutboxOp } from './types';

/** One pending/failed document (ops deduped by groupId). */
export interface OutboxGroup {
  groupId: string;
  displayTitle: string;
  /** Op count in the group (row + photos + pdf …). */
  opCount: number;
}

function toGroups(ops: OutboxOp[]): OutboxGroup[] {
  const byGroup = new Map<string, OutboxGroup>();
  for (const op of ops) {
    const g = byGroup.get(op.groupId);
    if (g) {
      g.opCount++;
      if (!g.displayTitle && op.displayTitle) g.displayTitle = op.displayTitle;
    } else {
      byGroup.set(op.groupId, {
        groupId: op.groupId,
        displayTitle: op.displayTitle,
        opCount: 1,
      });
    }
  }
  return [...byGroup.values()];
}

export function useOutbox() {
  const [pendingOps, setPendingOps] = useState<OutboxOp[]>([]);
  const [failedOps, setFailedOps] = useState<OutboxOp[]>([]);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void readOutboxQueue().then((q) => {
        if (alive) setPendingOps(q);
      });
      void readOutboxFailed().then((q) => {
        if (alive) setFailedOps(q);
      });
    };
    refresh();
    const unsub = subscribeOutbox(refresh);
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const pendingGroups = useMemo(() => toGroups(pendingOps), [pendingOps]);
  const failedGroups = useMemo(() => toGroups(failedOps), [failedOps]);

  return {
    pendingGroups,
    failedGroups,
    pendingCount: pendingGroups.length,
    failedCount: failedGroups.length,
    flush: flushOutbox,
    retryFailed: retryOutboxFailed,
    dismissFailed: dismissOutboxFailed,
  };
}
