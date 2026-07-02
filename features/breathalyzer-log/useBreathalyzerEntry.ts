import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { qk, useBreathalyzerLog, useProject } from '../../lib/apiHooks';
import { makeBLEntry, peoplePoolApi } from '../../lib/breathalyzerLogService';
import { saveRecordThroughOutbox } from '../../lib/outbox';
import { haptic } from '../../lib/haptics';
import type { PoolPerson } from '../../types/breathalyzerLog';
import {
  type AddEntryStep,
  type EntryForm,
  INITIAL_ENTRY_FORM,
  parseResult,
} from './breathalyzerSchema';

interface Args {
  projectId: string;
  logId: string;
  repeatForId?: string;
}

/**
 * State + persistence for the add-entry wizard. Owns the form, step, people-pool
 * suggestions, and the save mutation (append entry through the write outbox →
 * upsert pool → refresh the log query keys; offline the save queues silently and
 * the caches are seeded optimistically). The form/signature state is
 * component-local and dies with the screen — entry signatures only persist once
 * they reach the entries JSONB.
 */
export function useBreathalyzerEntry({ projectId, logId, repeatForId }: Args) {
  const qc = useQueryClient();
  const projectQ = useProject(projectId);
  const logQ = useBreathalyzerLog(logId);
  const log = logQ.data ?? null;

  const [step, setStep] = useState<AddEntryStep>(1);
  const [form, setForm] = useState<EntryForm>(INITIAL_ENTRY_FORM);
  const [pool, setPool] = useState<PoolPerson[]>([]);
  const [saving, setSaving] = useState(false);

  const update = useCallback(
    (patch: Partial<EntryForm>) => setForm(f => ({ ...f, ...patch })),
    [],
  );

  // People pool (AsyncStorage autocomplete), loaded once per project.
  useEffect(() => {
    peoplePoolApi.load(projectId).then(setPool);
  }, [projectId]);

  // Prefill from the source entry when this is a repeat test (once log loads).
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current || !repeatForId || !log) return;
    const src = log.entries.find(e => e.id === repeatForId);
    if (!src) return;
    prefilledRef.current = true;
    setForm(f => ({ ...f, name: src.personName, position: src.position, testType: 'repeat' }));
    setStep(2);
  }, [repeatForId, log]);

  // Suggestions: recently-tested pool first, then project crew not already pooled.
  const suggestions = useMemo<PoolPerson[]>(() => {
    const crew = projectQ.data?.crew ?? [];
    const extra: PoolPerson[] = crew
      .filter(c => c.name && !pool.some(p => p.name.toLowerCase() === c.name?.toLowerCase()))
      .map(c => ({ name: c.name ?? '', position: c.role ?? '', lastTestedAt: '', testCount: 0 }));
    const all = [...pool, ...extra];
    const q = form.name.toLowerCase().trim();
    if (!q) return all.slice(0, 8);
    return all
      .filter(p => p.name.toLowerCase().includes(q) || p.position.toLowerCase().includes(q))
      .slice(0, 6);
  }, [pool, projectQ.data?.crew, form.name]);

  const selectSuggestion = useCallback(
    (p: PoolPerson) => update({ name: p.name, position: p.position }),
    [update],
  );

  const saveEntry = useCallback(async (): Promise<boolean> => {
    if (!log) return false;
    setSaving(true);
    try {
      const result = parseResult(form.resultRaw);
      const entry = makeBLEntry({
        order: log.entries.length + 1,
        personName: form.name.trim(),
        position: form.position.trim(),
        testType: form.testType,
        result,
        signature: form.signature,
        refusedSignature: form.refusedSignature,
        time: new Date().toISOString(),
        relatedEntryId: repeatForId ?? null,
      });
      const entries = [...log.entries, entry];
      const optimistic = { ...log, entries, updatedAt: new Date().toISOString() };
      // Always the FULL entries array — the outbox update dialect maps
      // `{ entries }` to patchEntries verbatim.
      const res = await saveRecordThroughOutbox({
        entity: 'breathalyzer_log',
        mode: 'update',
        recordId: log.id,
        payload: { entries },
        displayTitle: 'ალკოტესტის ჟურნალი',
        projectId,
        detailKey: qk.breathalyzerLog.byId(log.id),
        optimistic,
      });
      await peoplePoolApi.upsert(projectId, {
        name: form.name.trim(),
        position: form.position.trim(),
      });
      qc.invalidateQueries({ queryKey: qk.breathalyzerLog.byProject(projectId) });
      if (res.queued) {
        // Silent per-entry save. The log screen reads today's log via byDate —
        // mirror the seeded byId model there so the new entry shows offline.
        qc.setQueryData(qk.breathalyzerLog.byDate(projectId, log.date), optimistic);
      } else {
        qc.invalidateQueries({ queryKey: qk.breathalyzerLog.byId(log.id) });
        qc.invalidateQueries({ queryKey: qk.breathalyzerLog.byDate(projectId, log.date) });
      }
      haptic.success();
      return true;
    } catch {
      haptic.networkError();
      return false;
    } finally {
      setSaving(false);
    }
  }, [log, form, repeatForId, projectId, qc]);

  return {
    log,
    // Paused-uncached (offline, nothing cached) counts as settled so the
    // wizard shows its not-found/offline state instead of hanging.
    ready: logQ.isFetched || logQ.fetchStatus === 'paused',
    project: projectQ.data ?? null,
    step,
    setStep,
    form,
    update,
    suggestions,
    selectSuggestion,
    saving,
    saveEntry,
  };
}
