/**
 * Shared orchestration for the equipment-inspection screens.
 *
 * Every per-type screen (bobcat, excavator, mobile-ladder, …) repeated the same
 * ~250 lines: load + autofill, step index + AsyncStorage persistence, debounced
 * autosave, the complete handler (validate → patch → complete → recordCompletion
 * → status → celebration), PDF preview + share, and limit-notice state. This hook
 * owns all of that ("when"); each screen supplies only the genuinely type-specific
 * parts ("what") via callbacks - so behaviour is preserved exactly while the
 * boilerplate is shared.
 *
 * Type-specific UI (steps, item reducers, signature wiring) stays in the screen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useToast } from '../toast';
import { useSession } from '../session';
import { usePdfUsage, useInvalidatePdfUsage } from '../usePdfUsage';
import { projectsApi } from '../services';
import { recordCompletion } from '../calendarSchedule';
import { queryClient } from '../queryClient';
import { invalidateRecordLists, qk } from '../apiHooks';
import { cachedRead } from '../cachedRead';
import { reopenDocument } from '../documents/reopen';
import { friendlyError } from '../errorMap';
import { haptic } from '../haptics';
import { generateAndSharePdf, PdfLimitReachedError } from '../pdfOpen';
import { generatePdfName } from '../pdfName';
import { renderInspectionPdf } from './renderMobile';
import type { SignaturesSnapshot } from '../../features/signatures';
import type { SignaturesSectionData } from '../pdf/inspection/renderSignaturesSection';
import type { InspectionSchema } from './schema';
import type { Project } from '../../types/models';

/** Minimum shape every inspection model shares. */
interface BaseInspection {
  id: string;
  projectId: string;
  status: string;
  inspectionDate: string;
  inspectorName?: string | null;
  company?: string | null;
  address?: string | null;
}

export interface InspectionFlowConfig<T extends BaseInspection> {
  id: string | undefined;
  /** First/last wizard step (e.g. 1 and CONCLUSION_STEP). */
  firstStep: number;
  lastStep: number;
  /** AsyncStorage step-key prefix, e.g. 'mobile-ladder-wizard'. */
  persistPrefix: string;
  /** Template UUID used for the recordCompletion calendar key. */
  templateId: string;
  schema: InspectionSchema<T>;
  api: {
    getById: (id: string) => Promise<T | null>;
    patch: (id: string, patch: any) => Promise<void>;
    complete: (id: string) => Promise<void>;
  };
  /** Full patch persisted on autosave + complete (the type-specific field list). */
  toPatch: (insp: T) => any;
  /** Returns missing required-field labels; empty array = ready to complete. */
  validateMissing: (insp: T) => string[];
  /**
   * Load-time autofill of inspector name + project company/address. Returns the
   * (possibly updated) inspection and the exact subset to persist (null = none),
   * so each type keeps its own signature-name sync etc.
   */
  autofill: (
    insp: T,
    ctx: { inspectorName: string | null; project: Project | null },
  ) => { next: T; patch: any | null };
  pdf: { nameLabel: string; title: string; subject: string };
  /** Heading for the loading placeholder screen. */
  loadingTitle: string;
}

export interface InspectionFlowResult<T extends BaseInspection> {
  inspection: T | null;
  setInspection: React.Dispatch<React.SetStateAction<T | null>>;
  inspectionRef: React.MutableRefObject<T | null>;
  projectName: string;
  setProjectName: React.Dispatch<React.SetStateAction<string>>;
  /** Signed-in user's display name (`first_name last_name`), or '' when
   *  signed out. Pass this to `EquipmentResultDetails.creatorName`. */
  creatorName: string;
  loading: boolean;
  saving: boolean;
  completing: boolean;
  celebrating: boolean;
  generatingPdf: boolean;
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  direction: 'next' | 'prev';
  animateSteps: boolean;
  limitNoticeVisible: boolean;
  setLimitNoticeVisible: React.Dispatch<React.SetStateAction<boolean>>;
  pdfLocked: boolean;
  /** Update one field, debounced-save. */
  update: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Merge a partial patch, debounced-save. */
  updateMany: (patch: Partial<T>) => void;
  /** Debounced autosave for callers that mutate via setInspection themselves. */
  scheduleSave: (insp: T) => void;
  complete: () => Promise<boolean>;
  /** Reopen a completed inspection back to draft (flips the view to its wizard). */
  reopen: () => Promise<boolean>;
  handlePdf: (signatures?: SignaturesSnapshot | null) => Promise<void>;
  /** Clear the persisted step and navigate back (used when leaving from step 1). */
  exit: () => Promise<void>;
}

export function useInspectionFlow<T extends BaseInspection>(
  cfg: InspectionFlowConfig<T>,
): InspectionFlowResult<T> {
  const { id, api, schema } = cfg;
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  const [inspection, setInspection] = useState<T | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);

  const [step, setStep] = useState(cfg.firstStep);
  const [animateSteps, setAnimateSteps] = useState(false);
  const prevStepRef = useRef(cfg.firstStep);
  const inspectionRef = useRef<T | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  const persistKey = useMemo(() => `${cfg.persistPrefix}:${id}:step`, [cfg.persistPrefix, id]);

  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // ── Load + autofill ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const insp = await cachedRead(
          qk.equipmentInspection.byId(schema.category, id),
          () => api.getById(id),
        );
        if (cancelled) return;
        if (!insp) { router.back(); return; }

        const inspectorName =
          session.state.status === 'signedIn'
            ? `${session.state.user?.first_name ?? ''} ${session.state.user?.last_name ?? ''}`.trim() || null
            : null;

        if (insp.status !== 'completed') {
          const saved = await AsyncStorage.getItem(persistKey);
          if (saved && !cancelled) {
            const s = parseInt(saved, 10);
            if (!isNaN(s) && s >= cfg.firstStep && s <= cfg.lastStep) setStep(s);
          }
        }

        let project: Project | null = null;
        try {
          project = await cachedRead(qk.projects.byId(insp.projectId), () =>
            projectsApi.getById(insp.projectId),
          );
          if (project) setProjectName(project.company_name || project.name);
        } catch {
          // project fetch is best-effort
        }

        const { next, patch } = cfg.autofill(insp, { inspectorName, project });
        if (patch && Object.keys(patch).length > 0) {
          api.patch(next.id, patch).catch(() => {});
        }
        if (!cancelled) setInspection(next);
      } catch (e) {
        if (!cancelled) {
          toast.error(friendlyError(e, t('errors.loadFailed')));
          router.back();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          animateTimeoutRef.current = setTimeout(() => setAnimateSteps(true), 50);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (animateTimeoutRef.current) clearTimeout(animateTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Persist step + cleanup ───────────────────────────────────────────────────
  useEffect(() => {
    if (step >= cfg.firstStep && step <= cfg.lastStep) {
      AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
    }
  }, [step, persistKey, cfg.firstStep, cfg.lastStep]);

  useEffect(() => () => { if (celebrationTimer.current) clearTimeout(celebrationTimer.current); }, []);

  // ── Debounced autosave ───────────────────────────────────────────────────────
  const scheduleSave = useCallback((insp: T) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      api.patch(insp.id, cfg.toPatch(insp))
        .catch(e => toast.error(friendlyError(e, t('errors.saveFailed'))))
        .finally(() => setSaving(false));
    }, 700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const update = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateMany = useCallback((patch: Partial<T>) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Complete ─────────────────────────────────────────────────────────────────
  const complete = useCallback(async (): Promise<boolean> => {
    const insp = inspectionRef.current;
    if (!insp) return false;
    const missing = cfg.validateMissing(insp);
    if (missing.length > 0) {
      Alert.alert(t('inspections.requiredFields'), missing.map(m => `• ${m}`).join('\n'));
      return false;
    }
    setCompleting(true);
    try {
      await api.patch(insp.id, cfg.toPatch(insp));
      await api.complete(insp.id);
      invalidateRecordLists(queryClient);
      const completedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        insp.id,
        completedAt,
        `${insp.projectId}:${cfg.templateId}`,
      ).catch(() => {});
      setInspection(prev => prev ? { ...prev, status: 'completed', completedAt } as T : prev);
      await AsyncStorage.removeItem(persistKey);
      toast.success(t('inspections.completeSuccess'));
      setCelebrating(true);
      haptic.inspectionComplete();
      celebrationTimer.current = setTimeout(() => setCelebrating(false), 2000);
      return true;
    } catch (e) {
      toast.error(friendlyError(e, t('common.error')));
      return false;
    } finally {
      setCompleting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey, toast]);

  // ── Reopen (edit a completed inspection) ─────────────────────────────────────
  // Equipment "completed" lives on the <type>_inspections row (no freeze
  // trigger), so reopenDocument flips it to draft via the per-type service.
  // The optimistic local flip re-renders the screen into its wizard with the
  // already-loaded data; re-completing regenerates the PDF + re-signs.
  const reopen = useCallback(async (): Promise<boolean> => {
    const insp = inspectionRef.current;
    if (!insp) return false;
    try {
      await reopenDocument(
        { kind: 'equipmentInspection', id: insp.id, source: schema.category },
        queryClient,
      );
      setInspection(prev => (prev ? ({ ...prev, status: 'draft', completedAt: null } as T) : prev));
      setStep(cfg.firstStep);
      haptic.medium();
      return true;
    } catch (e) {
      toast.error(friendlyError(e, 'რედაქტირება ვერ მოხერხდა'));
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema.category, toast]);

  // ── Signatures snapshot → PDF section data ───────────────────────────────────
  // The result screen owns useSignaturesState and passes its snapshot down
  // through handlePdf/buildPreview. No global state hop.
  const buildSignaturesSection = useCallback(
    (snapshot?: SignaturesSnapshot | null): SignaturesSectionData | null => {
      if (!snapshot || (!snapshot.creatorSignature && snapshot.additionalRowsCount === 0)) {
        return null;
      }
      const u = session.state.status === 'signedIn' ? session.state.user : null;
      const creatorName = u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : '';
      const creator = snapshot.creatorSignature;
      return {
        creatorSignature: creator
          ? {
              pngBase64: creator.pngBase64,
              capturedAtIso: creator.capturedAt.toISOString(),
              creatorName,
            }
          : null,
        additionalRowsCount: snapshot.additionalRowsCount,
      };
    },
    [session.state],
  );

  // ── PDF download/share ───────────────────────────────────────────────────────
  const handlePdf = useCallback(async (signatures?: SignaturesSnapshot | null) => {
    const insp = inspectionRef.current;
    if (!insp) return;
    if (pdfUsage?.isLocked) { setLimitNoticeVisible(true); return; }
    setGeneratingPdf(true);
    try {
      const html = await renderInspectionPdf(schema, {
        inspection: insp,
        projectName: projectName || t('common.project'),
        signaturesSession: buildSignaturesSection(signatures),
      });
      const pdfName = generatePdfName(
        projectName || 'project',
        cfg.pdf.nameLabel,
        new Date(insp.inspectionDate),
        insp.id,
      );
      const uid = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, uid, {
        title: cfg.pdf.title,
        author: insp.inspectorName || undefined,
        documentId: insp.id,
        subject: cfg.pdf.subject,
      });
      // No store to clear - the result-view snapshot lives only in component
      // state and dies when the screen unmounts.
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setLimitNoticeVisible(true); return; }
      toast.error(friendlyError(e, t('errors.pdfFailed')));
    } finally {
      setGeneratingPdf(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectName, session.state, invalidatePdfUsage, toast, pdfUsage, buildSignaturesSection]);

  const exit = useCallback(async () => {
    await AsyncStorage.removeItem(persistKey);
    router.back();
  }, [persistKey, router]);

  const creatorName = useMemo(() => {
    if (session.state.status !== 'signedIn') return '';
    const u = session.state.user;
    if (!u) return '';
    return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  }, [session.state]);

  return {
    inspection, setInspection, inspectionRef,
    projectName, setProjectName, creatorName,
    loading, saving, completing, celebrating, generatingPdf,
    step, setStep, direction, animateSteps,
    limitNoticeVisible, setLimitNoticeVisible, pdfLocked: !!pdfUsage?.isLocked,
    update, updateMany, scheduleSave,
    complete, reopen, handlePdf, exit,
  };
}
