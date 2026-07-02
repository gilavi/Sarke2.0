/**
 * State + handlers for the briefing (ინსტრუქტაჟი) signing step. Keeps the route
 * file (`app/briefings/[id]/sign.tsx`) to rendering only.
 *
 * The flow has three phases driven by where `currentIdx` points:
 *   - `worker`       - currentIdx < participants.length (a worker is signing).
 *   - `interstitial` - past the last worker, skipped workers remain unreviewed.
 *   - `inspector`    - past the last worker, ready for the inspector signature.
 * Pointing `currentIdx` back at a worker (via the chip strip) re-enters the
 * worker phase so any signer can be re-done.
 *
 * Side effects: loads the briefing + its project from Supabase, persists each
 * signature via `briefingsApi.update` (briefing signatures ARE persisted - the
 * no-persist rule is inspection-only), records a schedule entry + invalidates
 * calendar queries on completion, and routes to `/briefings/[id]/done`.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { type SignatureViewRef } from 'react-native-signature-canvas';
import { briefingsApi } from '../../lib/briefingsApi';
import { projectsApi } from '../../lib/services';
import { recordCompletion } from '../../lib/calendarSchedule';
import { qk, invalidateRecordLists } from '../../lib/apiHooks';
import { cachedRead } from '../../lib/cachedRead';
import { type ChipNavItem, type ChipNavState } from '../inspection-parts/ChipNavStrip';
import type { Briefing, BriefingParticipant, Project } from '../../types/models';

export type BriefingSigningPhase = 'loading' | 'interstitial' | 'inspector' | 'worker';

type ParticipantStatus = 'signed' | 'skipped' | 'pending' | 'current';

function statusOf(p: BriefingParticipant, idx: number, currentIdx: number): ParticipantStatus {
  if (p.signature) return 'signed';
  if (idx === currentIdx) return 'current';
  if (p.skipped) return 'skipped';
  return 'pending';
}

function chipStateOf(status: ParticipantStatus): ChipNavState {
  switch (status) {
    case 'signed':  return 'done';
    case 'current': return 'active';
    case 'skipped': return 'skipped';
    default:        return 'pending';
  }
}

export interface BriefingSigning {
  briefing: Briefing | null;
  project: Project | null;
  phase: BriefingSigningPhase;
  currentIdx: number;
  totalWorkers: number;
  skippedCount: number;
  workerName: string;
  alreadySigned: boolean;
  hasStroke: boolean;
  saving: boolean;
  canvasRef: RefObject<SignatureViewRef | null>;
  signerChips: ChipNavItem[];
  activeChipIndex: number;
  backDisabled: boolean;
  onStroke: () => void;
  onCancel: () => void;
  handleOK: (signature: string) => void;
  handleConfirm: () => void;
  handleClear: () => void;
  handleBack: () => void;
  handleSkip: () => void;
  handleChipSelect: (idx: number) => void;
  goToFirstSkipped: () => void;
  continueFromInterstitial: () => void;
}

export function useBriefingSigning(id: string | undefined): BriefingSigning {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hasStroke, setHasStroke] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skipReviewed, setSkipReviewed] = useState(false);
  const canvasRef = useRef<SignatureViewRef>(null);

  // Load briefing and find first pending participant (not signed and not skipped).
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    cachedRead(qk.briefings.byId(id), () => briefingsApi.getById(id))
      .then(b => {
        if (cancelled) return;
        if (!b) {
          router.back();
          return;
        }
        setBriefing(b);
        const firstPending = b.participants.findIndex(p => !p.signature && !p.skipped);
        setCurrentIdx(firstPending === -1 ? b.participants.length : firstPending);
      })
      .catch(err => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        Alert.alert(t('common.error'), `${t('briefings.loadFailed')}\n\n${msg}`, [
          { text: t('common.back'), onPress: () => router.back() },
        ]);
      });
    return () => { cancelled = true; };
  }, [id]);

  // Load the project name for the shared header (cosmetic, non-fatal).
  useEffect(() => {
    const pid = briefing?.projectId;
    if (!pid) return;
    let mounted = true;
    cachedRead(qk.projects.byId(pid), () => projectsApi.getById(pid))
      .then(p => { if (mounted) setProject(p); })
      .catch(() => null);
    return () => { mounted = false; };
  }, [briefing?.projectId]);

  // Reset canvas when moving to a new signer.
  useEffect(() => {
    setHasStroke(false);
    const t = setTimeout(() => canvasRef.current?.clearSignature(), 80);
    return () => clearTimeout(t);
  }, [currentIdx]);

  const totalWorkers = briefing?.participants.length ?? 0;
  const skippedCount = useMemo(
    () => briefing?.participants.filter(p => p.skipped && !p.signature).length ?? 0,
    [briefing],
  );

  const allWorkersHandled = briefing
    ? briefing.participants.every(p => p.signature || p.skipped)
    : false;
  const pointingAtInspector = !!briefing && currentIdx >= totalWorkers;
  const showInterstitial =
    !!briefing && pointingAtInspector && skippedCount > 0 && !skipReviewed && !briefing.inspectorSignature;
  const isInspectorPhase = !!briefing && pointingAtInspector && !showInterstitial;

  const persistParticipants = useCallback(
    async (next: BriefingParticipant[]) => {
      if (!id) return;
      const updated = await briefingsApi.update(id, { participants: next });
      setBriefing(updated);
      return updated;
    },
    [id],
  );

  const handleConfirm = useCallback(() => {
    if (!hasStroke) return;
    canvasRef.current?.readSignature();
  }, [hasStroke]);

  const handleClear = useCallback(() => {
    canvasRef.current?.clearSignature();
    setHasStroke(false);
  }, []);

  const handleOK = useCallback(
    async (sig: string) => {
      if (!briefing || !id) return;
      setSaving(true);
      try {
        const b64 = sig.replace(/^data:image\/png;base64,/, '');
        if (isInspectorPhase) {
          await briefingsApi.update(id, { inspectorSignature: b64, status: 'completed' });
          // Record schedule entry (non-fatal).
          await recordCompletion('briefings', id, briefing.dateTime, briefing.projectId).catch(() => {});
          invalidateRecordLists(queryClient);
          router.replace(`/briefings/${id}/done` as any);
        } else {
          // Worker signed - save signature, clear any prior skip, advance to next pending.
          const next = briefing.participants.map((p, i) =>
            i === currentIdx ? { ...p, signature: b64, skipped: false } : p,
          );
          await persistParticipants(next);
          const nextPending = next.findIndex((p, i) => i > currentIdx && !p.signature && !p.skipped);
          // No more pending after this index → jump past workers so the render
          // picks the interstitial (if anyone is still skipped) or the inspector.
          setCurrentIdx(nextPending !== -1 ? nextPending : next.length);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        Alert.alert(t('common.error'), `${t('briefings.signatureSaveFailed')}\n\n${msg}`);
      } finally {
        setSaving(false);
      }
    },
    [briefing, id, currentIdx, isInspectorPhase, persistParticipants, router, queryClient],
  );

  const handleBack = useCallback(() => {
    if (!briefing) return;
    const prev = currentIdx - 1;
    if (prev < 0) return;
    setSkipReviewed(false);
    setCurrentIdx(prev);
  }, [currentIdx, briefing]);

  const handleSkip = useCallback(() => {
    if (!briefing) return;
    Alert.alert(
      t('briefings.skipWorkerTitle'),
      t('briefings.skipWorkerBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('briefings.skipAction'),
          style: 'default',
          onPress: async () => {
            const next = briefing.participants.map((p, i) =>
              i === currentIdx ? { ...p, skipped: true } : p,
            );
            try {
              await persistParticipants(next);
              const nextPending = next.findIndex((p, i) => i > currentIdx && !p.signature && !p.skipped);
              setCurrentIdx(nextPending === -1 ? next.length : nextPending);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              Alert.alert(t('common.error'), `${t('briefings.skipFailed')}\n\n${msg}`);
            }
          },
        },
      ],
    );
  }, [briefing, currentIdx, persistParticipants]);

  const jumpTo = useCallback(
    async (idx: number) => {
      if (!briefing) return;
      // Restore skipped on jump so the target becomes the active signer.
      if (briefing.participants[idx]?.skipped) {
        const next = briefing.participants.map((p, i) =>
          i === idx ? { ...p, skipped: false } : p,
        );
        await persistParticipants(next);
      }
      setCurrentIdx(idx);
      setSkipReviewed(false);
    },
    [briefing, persistParticipants],
  );

  // Secondary navigation: one chip per participant + a trailing inspector chip.
  const handleChipSelect = useCallback(
    (idx: number) => {
      if (!briefing) return;
      if (idx >= briefing.participants.length) {
        // Inspector chip - only reachable once every worker is signed or skipped.
        if (allWorkersHandled) {
          setSkipReviewed(true);
          setCurrentIdx(briefing.participants.length);
        }
        return;
      }
      void jumpTo(idx);
    },
    [briefing, allWorkersHandled, jumpTo],
  );

  const goToFirstSkipped = useCallback(() => {
    if (!briefing) return;
    const idx = briefing.participants.findIndex(p => p.skipped && !p.signature);
    if (idx !== -1) void jumpTo(idx);
  }, [briefing, jumpTo]);

  const signerChips: ChipNavItem[] = useMemo(() => {
    if (!briefing) return [];
    const chips: ChipNavItem[] = briefing.participants.map((p, idx) => ({
      key: `${p.name}-${idx}`,
      label: p.name,
      state: chipStateOf(statusOf(p, idx, currentIdx)),
      a11yHint: t('briefings.signerChipHint'),
    }));
    const inspectorState: ChipNavState = briefing.inspectorSignature
      ? 'done'
      : isInspectorPhase
        ? 'active'
        : 'pending';
    chips.push({ key: 'inspector', label: t('briefings.inspectorChipLabel'), state: inspectorState, a11yHint: t('briefings.inspectorChipHint') });
    return chips;
  }, [briefing, currentIdx, isInspectorPhase]);

  const phase: BriefingSigningPhase = !briefing
    ? 'loading'
    : showInterstitial
      ? 'interstitial'
      : isInspectorPhase
        ? 'inspector'
        : 'worker';

  return {
    briefing,
    project,
    phase,
    currentIdx,
    totalWorkers,
    skippedCount,
    workerName: briefing?.participants[currentIdx]?.name ?? '',
    alreadySigned: !!briefing?.participants[currentIdx]?.signature,
    hasStroke,
    saving,
    canvasRef,
    signerChips,
    activeChipIndex: showInterstitial ? -1 : isInspectorPhase ? totalWorkers : currentIdx,
    backDisabled: currentIdx === 0,
    onStroke: () => setHasStroke(true),
    onCancel: () => router.back(),
    handleOK,
    handleConfirm,
    handleClear,
    handleBack,
    handleSkip,
    handleChipSelect,
    goToFirstSkipped,
    continueFromInterstitial: () => setSkipReviewed(true),
  };
}
