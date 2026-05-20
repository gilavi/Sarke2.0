import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { PlateInput, type PlateInputHandle } from '../../../components/inputs/PlateInput';
import { SerialKeypad } from '../../../components/inputs/SerialKeypad';
import { Button } from '../../../components/ui';
import { ExcavatorMaintenanceItem } from '../../../components/excavator/ExcavatorMaintenanceItem';
import { InspectionShell, ChecklistStep, ConclusionStep, ProjectPickerStep } from '../../../components/inspections';
import type { VerdictOption } from '../../../components/inspections';
import { SignatureSheet } from '../../../components/inspection/SignatureSheet';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { useBottomSheet } from '../../../components/BottomSheet';
import { excavatorApi } from '../../../lib/excavatorService';
import { projectsApi, inspectionAttachmentsApi } from '../../../lib/services';
import { imageForDisplay } from '../../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../../lib/supabase';

import { renderInspectionPdf } from '../../../lib/inspection/renderMobile';
import { excavatorSchema } from '../../../lib/inspection/schemas/excavator';
import { generateAndSharePdf, PdfLimitReachedError } from '../../../lib/pdfOpen';
import { PaywallModal } from '../../../components/PaywallModal';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { usePdfUsage, useInvalidatePdfUsage } from '../../../lib/usePdfUsage';
import { generatePdfName } from '../../../lib/pdfName';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SuggestionPills } from '../../../components/SuggestionPills';
import { useFieldHistory } from '../../../hooks/useFieldHistory';
import { usePhotoWithLocation } from '../../../hooks/usePhotoWithLocation';
import {
  ENGINE_ITEMS,
  UNDERCARRIAGE_ITEMS,
  CABIN_ITEMS,
  SAFETY_ITEMS,
  MAINTENANCE_ITEMS,
  EXCAVATOR_VERDICT_LABEL,
  EXCAVATOR_MACHINE_SPECS,
  type ExcavatorInspection,
  type ExcavatorVerdict,
  type ExcavatorChecklistItemState,
  type ExcavatorChecklistEntry,
  type ExcavatorMaintenanceItemState,
  type Section,
} from '../../../types/excavator';

// ── Flat catalog for wizard ───────────────────────────────────────────────────

interface FlatCatalogEntry {
  section: Section;
  sectionLabel: string;
  entry: ExcavatorChecklistEntry;
}

const FLAT_CATALOG: FlatCatalogEntry[] = [
  ...ENGINE_ITEMS.map(e => ({ section: 'engine' as Section, sectionLabel: 'ძრავი', entry: e })),
  ...UNDERCARRIAGE_ITEMS.map(e => ({ section: 'undercarriage' as Section, sectionLabel: 'სავალი ნაწილი', entry: e })),
  ...CABIN_ITEMS.map(e => ({ section: 'cabin' as Section, sectionLabel: 'კაბინა', entry: e })),
  ...SAFETY_ITEMS.map(e => ({ section: 'safety' as Section, sectionLabel: 'უსაფრთხოება', entry: e })),
];

function sectionKey(s: Section): keyof ExcavatorInspection {
  const map: Record<Section, keyof ExcavatorInspection> = {
    engine:        'engineItems',
    undercarriage: 'undercarriageItems',
    cabin:         'cabinItems',
    safety:        'safetyItems',
  };
  return map[s];
}

function getFlatState(insp: ExcavatorInspection): ExcavatorChecklistItemState[] {
  return FLAT_CATALOG.map(({ section, entry }) => {
    const key = sectionKey(section);
    const arr = insp[key] as ExcavatorChecklistItemState[];
    return arr.find(i => i.id === entry.id) ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
  });
}

export default function ExcavatorInspectionScreen() {
  const { theme } = useTheme();
  const { pickPhotoWithAnnotation } = usePhotoWithLocation();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const showSheet = useBottomSheet();

  const userId = session?.state?.status === 'signedIn' ? session.state.session.user.id : null;

  // ── Field suggestion histories ────────────────────────────────────────────
  const serialNumberHistory = useFieldHistory(userId, 'excavator:serialNumber');
  const registrationNumberHistory = useFieldHistory(userId, 'excavator:registrationNumber');

  const [inspection, setInspection] = useState<ExcavatorInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [attachmentCount, setAttachmentCount] = useState(0);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Plate-input step state (reuses SerialKeypad like bobcat)
  const plateRef = useRef<PlateInputHandle>(null);
  const [activeSlotKind, setActiveSlotKind] = useState<'letter' | 'digit'>('letter');

  // Step state
  const [step, setStep] = useState(0);
  const prevStepRef = useRef(0);
  const [animateSteps, setAnimateSteps] = useState(false);
  const inspectionRef = useRef<ExcavatorInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  const INFO_STEP       = 0;
  const PLATE_STEP      = 1;
  const SERIAL_STEP     = 2;
  const CHECKLIST_STEP  = 3;
  const CONCLUSION_STEP = 4;
  const DONE_STEP       = 5;
  const TOTAL_STEPS     = 5;
  const STEP_LABELS     = ['პროექტი', 'სახ.ნომ', 'სERიული', 'შემოწ.', 'დასკვნა'];

  const persistKey = useMemo(() => `excavator-wizard:${id}:step`, [id]);
  const summaryPhotosKey = useMemo(() => `excavator-wizard:${id}:summaryPhotos`, [id]);

  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const insp = await excavatorApi.getById(id);
        if (cancelled) return;
        if (!insp) { router.back(); return; }

        if (insp.status === 'completed') {
          // Will render result view instead of wizard
        }

        let patched = insp;
        if (!insp.inspectorName && session.state.status === 'signedIn') {
          const u = session.state.user;
          const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
          if (name) patched = { ...patched, inspectorName: name };
        }
        setInspection(patched);

        // Load summary photos from AsyncStorage
        const savedPhotos = await AsyncStorage.getItem(summaryPhotosKey);
        if (savedPhotos && !cancelled) {
          try {
            const parsed = JSON.parse(savedPhotos);
            if (Array.isArray(parsed)) {
              setInspection(prev => prev ? { ...prev, summaryPhotos: parsed } : prev);
            }
          } catch {}
        }

        const saved = await AsyncStorage.getItem(persistKey);
        if (saved && !cancelled) {
          const s = parseInt(saved, 10);
          if (!isNaN(s) && s >= 0 && s <= CONCLUSION_STEP && s !== DONE_STEP) {
            setStep(s);
          }
        }

        projectsApi.getById(insp.projectId).then(p => {
          if (cancelled || !p) return;
          setProjectName(p.company_name || p.name);
          setInspection(prev => {
            if (!prev) return prev;
            const projectNameFill = !prev.projectName?.trim() ? (p.company_name || p.name) : null;
            if (!projectNameFill) return prev;
            const next = { ...prev, projectName: projectNameFill };
            excavatorApi.patch(next.id, { projectName: next.projectName }).catch(() => {});
            return next;
          });
        }).catch(() => {});

      } catch (e) {
        if (!cancelled) {
          toast.error(friendlyError(e, 'ვერ ჩაიტვირთა'));
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

  // Persist step
  useEffect(() => {
    AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
  }, [step, persistKey]);

  // ── Auto-save (debounced) ──────────────────────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((insp: ExcavatorInspection) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      excavatorApi.patch(insp.id, {
        serialNumber: insp.serialNumber,
        registrationNumber: insp.registrationNumber,
        inventoryNumber: insp.inventoryNumber,
        projectName: insp.projectName,
        department: insp.department,
        inspectionDate: insp.inspectionDate,
        motoHours: insp.motoHours,
        inspectorName: insp.inspectorName,
        lastInspectionDate: insp.lastInspectionDate,
        engineItems: insp.engineItems,
        undercarriageItems: insp.undercarriageItems,
        cabinItems: insp.cabinItems,
        safetyItems: insp.safetyItems,
        maintenanceItems: insp.maintenanceItems,
        verdict: insp.verdict,
        notes: insp.notes,
      }).catch(e => {
        toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      }).finally(() => setSaving(false));
    }, 700);
  }, [toast]);

  const update = useCallback(<K extends keyof ExcavatorInspection>(
    key: K,
    value: ExcavatorInspection[K],
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Checklist item update (flat → section mapping) ─────────────────────────

  const updateFlatItem = useCallback((flatIndex: number, patch: Partial<Pick<ExcavatorChecklistItemState, 'result' | 'comment'>>) => {
    setInspection(prev => {
      if (!prev) return prev;
      const { section, entry } = FLAT_CATALOG[flatIndex];
      const key = sectionKey(section);
      const arr = [...(prev[key] as ExcavatorChecklistItemState[])];
      const idx = arr.findIndex(i => i.id === entry.id);
      if (idx >= 0) arr[idx] = { ...arr[idx], ...patch };
      const next = { ...prev, [key]: arr };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateMaintenanceItem = useCallback((
    itemId: number,
    patch: Partial<Pick<ExcavatorMaintenanceItemState, 'answer' | 'date'>>,
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const maintenanceItems = prev.maintenanceItems.map(i =>
        i.id === itemId ? { ...i, ...patch } : i,
      );
      const next = { ...prev, maintenanceItems };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Photo handling ─────────────────────────────────────────────────────────

  const handleAddPhoto = useCallback(async (section: Section, itemId: number) => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await excavatorApi.uploadPhoto(insp.id, section, itemId, result.uri);
      setInspection(prev => {
        if (!prev) return prev;
        const key = sectionKey(section);
        const arr = [...(prev[key] as ExcavatorChecklistItemState[])];
        const idx = arr.findIndex(i => i.id === itemId);
        if (idx >= 0) arr[idx] = { ...arr[idx], photo_paths: [...(arr[idx].photo_paths ?? []), path] };
        const next = { ...prev, [key]: arr };
        scheduleSave(next);
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  }, [pickPhotoWithAnnotation, scheduleSave, toast]);

  const handleDeletePhoto = useCallback(async (section: Section, itemId: number, path: string) => {
    try {
      await excavatorApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხერხდა'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const key = sectionKey(section);
      const arr = [...(prev[key] as ExcavatorChecklistItemState[])];
      const idx = arr.findIndex(i => i.id === itemId);
      if (idx >= 0) arr[idx] = { ...arr[idx], photo_paths: (arr[idx].photo_paths ?? []).filter(p => p !== path) };
      const next = { ...prev, [key]: arr };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, toast]);

  // ── Load attachments when completed ───────────────────────────────────────

  useEffect(() => {
    if (inspection?.status !== 'completed') return;
    inspectionAttachmentsApi.listByInspection(inspection.id)
      .then(a => setAttachmentCount(a.length)).catch(() => {});
  }, [inspection?.status, inspection?.id]);

  // ── Complete ───────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!inspection || completing) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const missing: string[] = [];
    if (!inspection.serialNumber?.trim()) missing.push('სერიული ნომერი');
    if (!inspection.verdict)              missing.push('დასკვნა');

    if (missing.length > 0) {
      Alert.alert('შეავსეთ სავალდებულო ველები', missing.map(m => `• ${m}`).join('\n'));
      return;
    }
    setCompleting(true);
    try {
      await excavatorApi.patch(inspection.id, {
        serialNumber: inspection.serialNumber,
        registrationNumber: inspection.registrationNumber,
        inventoryNumber: inspection.inventoryNumber,
        projectName: inspection.projectName,
        department: inspection.department,
        inspectionDate: inspection.inspectionDate,
        motoHours: inspection.motoHours,
        inspectorName: inspection.inspectorName,
        lastInspectionDate: inspection.lastInspectionDate,
        engineItems: inspection.engineItems,
        undercarriageItems: inspection.undercarriageItems,
        cabinItems: inspection.cabinItems,
        safetyItems: inspection.safetyItems,
        maintenanceItems: inspection.maintenanceItems,
        verdict: inspection.verdict,
        notes: inspection.notes,
      });
      await excavatorApi.complete(inspection.id);
      const completedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        inspection.id,
        completedAt,
        `${inspection.projectId}:excavator`,
      ).catch(() => {});
      setInspection(prev => prev ? { ...prev, status: 'completed', completedAt } : prev);
      await AsyncStorage.removeItem(persistKey);
      toast.success('შემოწმება დასრულდა');
    } catch (e) {
      toast.error(friendlyError(e, 'შეცდომა'));
    } finally {
      setCompleting(false);
    }
  }, [inspection, toast, persistKey, router]);

  // ── PDF ────────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    if (!inspection) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setGeneratingPdf(true);
    try {
      const html = await renderInspectionPdf(excavatorSchema, {
        inspection,
        projectName: projectName || 'პროექტი',
      });
      const pdfName = generatePdfName(
        projectName || 'project',
        'ExcavatorInspection',
        new Date(inspection.inspectionDate),
        inspection.id,
      );
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, userId, {
        title: 'ექსკავატორის შემოწმება',
        author: inspection.inspectorName || undefined,
        documentId: inspection.id,
        subject: 'შრომის უსაფრთხოების შემოწმება',
      });
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setPaywallVisible(true); return; }
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setGeneratingPdf(false);
    }
  }, [inspection, projectName, session.state, toast, pdfUsage, invalidatePdfUsage]);

  // ── Summary Photos ─────────────────────────────────────────────────────────

  const handleAddSummaryPhoto = useCallback(async () => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await excavatorApi.uploadSummaryPhoto(insp.id, result.uri);
      setInspection(prev => {
        if (!prev) return prev;
        const next = { ...prev, summaryPhotos: [...(prev.summaryPhotos ?? []), path] };
        AsyncStorage.setItem(summaryPhotosKey, JSON.stringify(next.summaryPhotos)).catch(() => {});
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  }, [pickPhotoWithAnnotation, toast]);

  const handleDeleteSummaryPhoto = useCallback(async (path: string) => {
    try {
      await excavatorApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხერხდა'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, summaryPhotos: (prev.summaryPhotos ?? []).filter(p => p !== path) };
      AsyncStorage.setItem(summaryPhotosKey, JSON.stringify(next.summaryPhotos)).catch(() => {});
      return next;
    });
  }, [summaryPhotosKey, toast]);

  // ── PDF Preview ────────────────────────────────────────────────────────────

  const buildPreview = useCallback(async () => {
    if (!inspection) return;
    setPreviewBusy(true);
    try {
      const html = await renderInspectionPdf(excavatorSchema, {
        inspection,
        projectName: projectName || 'პროექტი',
      });
      setPreviewHtml(html);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setPreviewBusy(false);
    }
  }, [inspection, projectName, toast]);

  useEffect(() => {
    if (inspection?.status === 'completed') {
      void buildPreview();
    }
  }, [inspection?.status, buildPreview]);

  // ── Help sheet ─────────────────────────────────────────────────────────────

  const showHelp = useCallback((entry: ExcavatorChecklistEntry) => {
    showSheet({
      dismissable: true,
      content: ({ dismiss }) => (
        <View style={helpStyles(theme).body}>
          <Text style={helpStyles(theme).title}>{entry.label}</Text>
          <Text style={helpStyles(theme).desc}>{entry.description}</Text>
          {entry.helpText ? (
            <Text style={helpStyles(theme).help}>{entry.helpText}</Text>
          ) : null}
          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [helpStyles(theme).btn, pressed && { opacity: 0.8 }]}
          >
            <Text style={helpStyles(theme).btnText}>დახურვა</Text>
          </Pressable>
        </View>
      ),
    });
  }, [showSheet, theme]);

  // ── Summary counts ─────────────────────────────────────────────────────────

  const flatState = useMemo(() => inspection ? getFlatState(inspection) : [], [inspection]);

  const counts = useMemo(() => {
    const good = flatState.filter(s => s.result === 'good').length;
    const deficient = flatState.filter(s => s.result === 'deficient').length;
    const unusable = flatState.filter(s => s.result === 'unusable').length;
    return { good, deficient, unusable, total: FLAT_CATALOG.length };
  }, [flatState]);

  // ── Step navigation ────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === INFO_STEP)       return true;
    if (step === PLATE_STEP)      return true;
    if (step === SERIAL_STEP)     return !!inspection.serialNumber?.trim();
    if (step === CHECKLIST_STEP)  return flatState.every(s => s.result !== null);
    if (step === CONCLUSION_STEP) return !!inspection.verdict && !completing;
    return false;
  }, [step, inspection, flatState, completing, PLATE_STEP, SERIAL_STEP, CONCLUSION_STEP]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      await handleComplete();
      router.push(`/inspections/excavator/${id}/done` as any);
    } else if (step < CONCLUSION_STEP) {
      setStep(s => s + 1);
    }
  }, [step, CONCLUSION_STEP, handleComplete, id, router]);

  const handlePrev = useCallback(async () => {
    if (step === 0) {
      await AsyncStorage.removeItem(persistKey);
      router.back();
    } else {
      setStep(s => s - 1);
    }
  }, [step, persistKey, router]);

  // ── List item update helper ────────────────────────────────────────────────

  const updateItem = useCallback((itemId: number, result: 'good' | 'deficient' | 'unusable') => {
    const flatIndex = FLAT_CATALOG.findIndex(e => e.entry.id === itemId);
    if (flatIndex >= 0) updateFlatItem(flatIndex, { result });
  }, [updateFlatItem]);

  // ── Shared-component adapter memos ────────────────────────────────────────

  const checklistItems = useMemo(() =>
    FLAT_CATALOG.map(entry => ({
      id: String(entry.entry.id) + ':' + entry.section,
      description: entry.entry.label ?? entry.entry.description,
      section: entry.sectionLabel,
    })),
  []);

  const checklistStates = useMemo(() =>
    FLAT_CATALOG.map((entry, index) => {
      const flatStates = inspection ? getFlatState(inspection) : [];
      const s = flatStates[index] ?? { id: entry.entry.id, result: null, comment: null, photo_paths: [] };
      return {
        id: String(entry.entry.id) + ':' + entry.section,
        result: s.result,
        comment: s.comment,
        photo_paths: s.photo_paths ?? [],
      };
    }),
  [inspection]);

  const handleChecklistStateChange = useCallback((compositeId: string, patch: Partial<{ result: 'good' | 'deficient' | 'unusable' | null; comment: string | null }>) => {
    const flatIndex = FLAT_CATALOG.findIndex(e => String(e.entry.id) + ':' + e.section === compositeId);
    if (flatIndex >= 0) updateFlatItem(flatIndex, patch);
  }, [updateFlatItem]);

  const excavatorVerdictOptions = useMemo((): VerdictOption<ExcavatorVerdict>[] =>
    (Object.entries(EXCAVATOR_VERDICT_LABEL) as [ExcavatorVerdict, string][]).map(([value, label]) => ({ value, label })),
  []);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
    );
  }

  // ── Completed inspection result view ───────────────────────────────────────
  if (inspection.status === 'completed') {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="ექსკავატორი"
        requiredSignerRoles={[]}
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        signedCount={inspection.inspectorSignature ? 1 : 0}
        totalSlots={1}
        attachmentCount={attachmentCount}
        pdfLocked={pdfUsage?.isLocked}
        downloading={generatingPdf}
        paywallVisible={paywallVisible}
        onPaywallClose={() => setPaywallVisible(false)}
        onDownloadPdf={() => void handlePdf()}
        onSheetSaved={() => {
          inspectionAttachmentsApi.listByInspection(inspection.id)
            .then(a => setAttachmentCount(a.length)).catch(() => {});
          void buildPreview();
        }}
        renderSignaturesSheet={({ dismiss, onChanged }) => (
          <SignatureSheet
            onClose={dismiss}
            signatories={[
              {
                role: 'შემომწმებელი',
                name: inspection.inspectorName ?? '',
                position: inspection.inspectorPosition ?? '',
                signature: inspection.inspectorSignature,
              },
            ]}
            onChange={(idx, field, value) => {
              setInspection(prev => {
                if (!prev) return prev;
                const next = { ...prev };
                if (field === 'name') next.inspectorName = value;
                else if (field === 'position') next.inspectorPosition = value;
                else if (field === 'signature') next.inspectorSignature = value || null;
                return next;
              });
            }}
            onSign={(idx, base64) => {
              setInspection(prev => prev ? { ...prev, inspectorSignature: base64 } : prev);
              onChanged();
            }}
          />
        )}
      />
    );
  }

  return (
    <InspectionShell
      title="ექსკავატორი"
      projectName={projectName}
      step={step}
      totalSteps={TOTAL_STEPS}
      direction={direction}
      animate={animateSteps}
      canGoNext={canGoNext}
      isLastStep={step === CONCLUSION_STEP}
      saving={saving}
      completing={completing}
      stepLabels={STEP_LABELS}
      showPdfIcon={step > INFO_STEP}
      generatingPdf={generatingPdf}
      onNext={handleNext}
      onPrev={handlePrev}
      onClose={() => router.back()}
      onPdf={handlePdf}
    >
      {/* ── Step 0: Project picker ─────────────────────────────────── */}
      {step === INFO_STEP && (
        <ProjectPickerStep
          selectedId={inspection.projectId}
          onSelect={p => {
            setProjectName(p.company_name || p.name);
            setInspection(prev => prev ? { ...prev, projectId: p.id } : prev);
          }}
        />
      )}

      {/* ── Step 1: Plate / registration number (custom keypad) ─────── */}
      {step === PLATE_STEP && (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 32, gap: 20, alignItems: 'center' }}>
            <PlateInput
              ref={plateRef}
              label="სახელმწიფო / ს.ნ ნომERი"
              value={inspection.registrationNumber ?? ''}
              onChangeText={v => {
                update('registrationNumber', v || null);
                if (v.trim()) registrationNumberHistory.addToHistory(v.trim());
              }}
              customKeyboard
              onActiveSlotKindChange={k => setActiveSlotKind(k ?? 'letter')}
            />
            {registrationNumberHistory.suggestions.length > 0 && (
              <SuggestionPills
                suggestions={registrationNumberHistory.suggestions}
                onSelect={v => update('registrationNumber', v)}
                visible
              />
            )}
          </View>
          <View style={{ flex: 1 }} />
          <SerialKeypad
            slotKind={activeSlotKind}
            onKey={k => plateRef.current?.pressKey(k)}
          />
        </View>
      )}

      {/* ── Step 2: Serial number ───────────────────────────────────── */}
      {step === SERIAL_STEP && (
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bottomOffset={120}
        >
          <FloatingLabelInput
            label="სERIული ნომERი *"
            value={inspection.serialNumber ?? ''}
            onChangeText={v => update('serialNumber', v || null)}
            onFocus={() => setFocusedField('serialNumber')}
            onBlur={() => {
              setFocusedField(null);
              if (inspection.serialNumber?.trim()) {
                serialNumberHistory.addToHistory(inspection.serialNumber.trim());
              }
            }}
            required
            autoFocus
          />
          <SuggestionPills
            suggestions={serialNumberHistory.suggestions}
            onSelect={v => {
              update('serialNumber', v);
              setFocusedField(null);
            }}
            visible={focusedField === 'serialNumber' || (!inspection.serialNumber?.trim() && serialNumberHistory.suggestions.length > 0)}
          />
        </KeyboardAwareScrollView>
      )}

      {/* ── Step 3: Checklist + Maintenance ─────────────────────────── */}
      {step === CHECKLIST_STEP && (
        <ChecklistStep
          items={checklistItems}
          states={checklistStates}
          onStateChange={handleChecklistStateChange}
          showSectionHeaders={true}
          footer={
            <>
              {MAINTENANCE_ITEMS.map((entry, idx) => {
                const state = inspection.maintenanceItems.find(i => i.id === entry.id)
                  ?? { id: entry.id, answer: null, date: null };
                return (
                  <ExcavatorMaintenanceItem
                    key={entry.id}
                    index={idx}
                    entry={entry}
                    state={state}
                    onChange={patch => updateMaintenanceItem(entry.id, patch)}
                  />
                );
              })}
            </>
          }
        />
      )}

      {/* ── Step 4: Conclusion ──────────────────────────────────────── */}
      {step === CONCLUSION_STEP && (
        <ConclusionStep
          verdict={inspection.verdict}
          verdictOptions={excavatorVerdictOptions}
          notes={inspection.notes ?? ''}
          onVerdictChange={v => update('verdict', v)}
          onNotesChange={v => update('notes', v || null)}
          completing={completing}
          photoSection={
            <>
              <Text style={styles.fieldLabel}>ფოტოები (სურვ.)</Text>
              <SummaryPhotoStrip
                paths={inspection.summaryPhotos ?? []}
                onAdd={handleAddSummaryPhoto}
                onDelete={handleDeleteSummaryPhoto}
                styles={styles}
              />
            </>
          }
        />
      )}

      {/* ── Step 5: Done ────────────────────────────────────────────── */}
      {step === DONE_STEP && (
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bottomOffset={120}
        >
          <View style={styles.doneHero}>
            <Ionicons name="checkmark-circle" size={72} color={theme.colors.semantic.success} />
            <Text style={styles.doneTitle}>შემოწმება დასრულდა!</Text>
            {inspection.completedAt && (
              <Text style={styles.doneDate}>
                {new Date(inspection.completedAt).toLocaleDateString('ka-GE', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </Text>
            )}
            {inspection.verdict && (
              <View style={[
                styles.doneVerdict,
                inspection.verdict === 'approved'    && styles.doneVerdictGreen,
                inspection.verdict === 'conditional' && styles.doneVerdictAmber,
                inspection.verdict === 'rejected'    && styles.doneVerdictRed,
              ]}>
                <Text style={[
                  styles.doneVerdictText,
                  inspection.verdict === 'approved'    && { color: theme.colors.semantic.success },
                  inspection.verdict === 'conditional' && { color: theme.colors.warn },
                  inspection.verdict === 'rejected'    && { color: theme.colors.danger },
                ]}>
                  {EXCAVATOR_VERDICT_LABEL[inspection.verdict].split(' — ')[0]}
                </Text>
              </View>
            )}
          </View>

          <Button
            title={pdfUsage?.isLocked ? '🔒 PDF გენერირება' : 'PDF გენერირება / გაზიარება'}
            onPress={handlePdf}
            loading={generatingPdf}
            style={{ marginBottom: 12 }}
          />
          <Button
            title="პროექტზე დაბრუნება"
            variant="secondary"
            onPress={() => router.back()}
          />
        </KeyboardAwareScrollView>
      )}
    </InspectionShell>
  );
}

// ── Help sheet styles ────────────────────────────────────────────────────────

function helpStyles(theme: Theme) {
  return StyleSheet.create({
    body: {
      alignItems: 'center',
      paddingVertical: 8,
      gap: 14,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.ink,
      textAlign: 'center',
    },
    desc: {
      fontSize: 14,
      color: theme.colors.inkSoft,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 8,
    },
    help: {
      fontSize: 13,
      color: theme.colors.ink,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.subtleSurface,
      paddingVertical: 10,
      borderRadius: 10,
      alignSelf: 'stretch',
    },
    btn: {
      marginTop: 4,
      alignSelf: 'stretch',
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.accent,
    },
  });
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MachineSpecsCard({ insp, styles }: { insp: ExcavatorInspection; styles: ReturnType<typeof getstyles> }) {
  const sp = insp.machineSpecs ?? EXCAVATOR_MACHINE_SPECS;
  const { theme } = useTheme();
  return (
    <View style={styles.specsCard}>
      <Text style={styles.specsTitle}>I — მანქანის ტექნიკური მახასიათებლები</Text>
      <View style={styles.specsGrid}>
        {[
          ['წონა', sp.weight],
          ['ძრავა', sp.engine],
          ['სიმძლავრე', sp.power],
          ['სიღრმე', sp.depth],
          ['სვლა', sp.travel],
          ['მაქს. გამბარი', sp.maxReach],
        ].map(([label, value]) => (
          <View key={label} style={styles.specsCell}>
            <Text style={[styles.specsLabel, { color: theme.colors.inkSoft }]}>{label}</Text>
            <Text style={[styles.specsValue, { color: theme.colors.ink }]}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryPhotoStrip({
  paths,
  onAdd,
  onDelete,
  styles,
}: {
  paths: string[];
  onAdd: () => void;
  onDelete: (path: string) => void;
  styles: ReturnType<typeof getstyles>;
}) {
  const { theme } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.photoStrip}
    >
      {paths.map(path => (
        <SummaryThumb key={path} path={path} onDelete={() => onDelete(path)} styles={styles} />
      ))}
      <Pressable
        style={styles.addPhoto}
        onPress={onAdd}
        accessible accessibilityLabel="ფოტოს დამატება" accessibilityRole="button"
      >
        <Ionicons name="camera-outline" size={20} color={theme.colors.inkSoft} />
        <Text style={styles.addPhotoLabel}>+ ფოტო</Text>
      </Pressable>
    </ScrollView>
  );
}

const SummaryThumb = memo(function SummaryThumb({
  path,
  onDelete,
  styles,
}: {
  path: string;
  onDelete: () => void;
  styles: ReturnType<typeof getstyles>;
}) {
  const { theme } = useTheme();
  const [uri, setUri] = useState('');
  useEffect(() => {
    let cancelled = false;
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, path)
      .then(url => { if (!cancelled) setUri(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path]);
  return (
    <View style={styles.thumb}>
      <Image source={{ uri }} style={styles.thumbImg} resizeMode="cover" />
      <Pressable style={styles.thumbDelete} onPress={onDelete} hitSlop={8} accessible accessibilityLabel="ფოტოს წაშლა" accessibilityRole="button">
        <Ionicons name="close-circle" size={18} color={theme.colors.white} />
      </Pressable>
    </View>
  );
});

// ── Styles ───────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: theme.colors.background },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 24, paddingTop: 4 },
    stepBody: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, gap: 12 },
    footer: {
      gap: 10,
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 16,
      backgroundColor: theme.colors.card,
    },

    specsCard: {
      marginBottom: 16,
    },
    specsTitle: {
      fontSize: 10, fontWeight: '700', color: theme.colors.inkSoft,
      textTransform: 'uppercase', letterSpacing: 0.5,
      paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8,
      borderBottomWidth: 0.5, borderBottomColor: theme.colors.hairline,
      backgroundColor: theme.colors.subtleSurface,
    },
    specsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    specsCell: {
      width: '33.33%',
      padding: 10,
      borderRightWidth: 0.5, borderBottomWidth: 0.5,
      borderColor: theme.colors.hairline,
    },
    specsLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
    specsValue: { fontSize: 11, fontWeight: '700' },

    fieldRow:   { marginBottom: 4, gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    typeChip: {
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: theme.colors.hairline,
    },
    typeChipActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    typeChipText: { fontSize: 13, color: theme.colors.inkSoft },
    typeChipTextActive: { color: theme.colors.accent, fontWeight: '700' },



    listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 8 },
    listRowText: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    listRowNumber: { fontSize: 12, color: theme.colors.inkFaint, marginTop: 2, minWidth: 18 },
    listRowLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.ink, lineHeight: 18 },
    listRowActions: { flexDirection: 'row', gap: 6 },
    statusBtn: {
      width: 44, height: 44, borderRadius: 8, borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center',
    },
    statusBtnGood:      { borderColor: theme.colors.semantic.success },
    statusBtnGoodActive:{ backgroundColor: theme.colors.semantic.success, borderColor: theme.colors.semantic.success },
    statusBtnDef:       { borderColor: theme.colors.warn },
    statusBtnDefActive: { backgroundColor: theme.colors.warn, borderColor: theme.colors.warn },
    statusBtnBad:        { borderColor: theme.colors.danger },
    statusBtnBadActive: { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger },

    photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 32, paddingBottom: 8 },
    photoThumbWrap: { position: 'relative', width: 44, height: 44, borderRadius: 6, overflow: 'hidden' },
    photoThumb: { width: 44, height: 44 },
    photoDelete: {
      position: 'absolute', top: 2, right: 2,
      backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
      width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    },
    photoAddBtn: {
      width: 44, height: 44, borderRadius: 6,
      borderWidth: 1, borderColor: theme.colors.hairline, borderStyle: 'dashed',
      alignItems: 'center', justifyContent: 'center',
    },

    summaryCard: {
      gap: 10, marginBottom: 12,
    },
    summaryTitle: {
      fontSize: 12, fontWeight: '700', color: theme.colors.inkSoft,
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
    summaryCounts: { flexDirection: 'row', gap: 10, justifyContent: 'space-around' },
    countBadge: { alignItems: 'center', gap: 2 },
    countNumber: { fontSize: 18, fontWeight: '800', color: theme.colors.ink },
    countLabel: { fontSize: 11, color: theme.colors.inkSoft },

    maintenanceSummaryRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: theme.colors.hairline,
    },
    maintenanceSummaryLabel: { flex: 1, fontSize: 12, color: theme.colors.inkSoft },
    maintenanceSummaryValue: { fontSize: 12, fontWeight: '700', color: theme.colors.ink },
    maintenanceSummaryDate: { fontSize: 11, color: theme.colors.inkFaint, marginLeft: 8 },

    suggestionBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.colors.warnSoft,
      padding: 10, marginBottom: 8,
    },
    suggestionText: { fontSize: 12, color: theme.colors.inkSoft, flex: 1 },

    verdictBlock: { gap: 0, marginBottom: 12 },
    verdictOption: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      paddingVertical: 10, paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    verdictOptionActive:    { borderBottomColor: theme.colors.accent },
    verdictOptionSuggested: { borderBottomColor: theme.colors.warn },
    verdictCheck: {
      width: 20, height: 20, borderRadius: 5,
      borderWidth: 1.5, borderColor: theme.colors.hairline,
      alignItems: 'center', justifyContent: 'center', marginTop: 1,
    },
    verdictCheckActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
    verdictLabel:       { flex: 1, fontSize: 12, color: theme.colors.inkSoft, lineHeight: 18 },
    verdictLabelActive: { color: theme.colors.accent, fontWeight: '600' },

    sigRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    sigRowActive: {
      borderBottomColor: theme.colors.semantic.success,
    },
    sigRowText: {
      fontSize: 15, color: theme.colors.ink,
    },
    sigRowClear: {
      fontSize: 13, color: theme.colors.accent,
    },
    photoStrip: { gap: 8, paddingVertical: 4 },
    addPhoto: {
      width: 64, height: 64, borderRadius: 8,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.hairline,
      alignItems: 'center', justifyContent: 'center', gap: 2,
    },
    addPhotoLabel: { fontSize: 11, color: theme.colors.inkSoft },
    thumb:       { width: 64, height: 64, borderRadius: 8, overflow: 'hidden' },
    thumbImg:    { width: 64, height: 64 },
    thumbDelete: { position: 'absolute', top: 2, right: 2 },

    completingRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
    completingText:   { fontSize: 13, color: theme.colors.inkSoft },

    doneHero: { paddingVertical: 16, gap: 6 },
    doneTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.ink, textAlign: 'center' },
    doneDate:  { fontSize: 13, color: theme.colors.inkSoft, marginTop: 2 },
    doneVerdict: {
      paddingHorizontal: 16, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1.5, marginTop: 8,
    },
    doneVerdictGreen: { borderColor: theme.colors.semantic.success,              backgroundColor: theme.colors.semantic.successSoft },
    doneVerdictAmber: { borderColor: theme.colors.warn,        backgroundColor: theme.colors.warnSoft },
    doneVerdictRed:   { borderColor: theme.colors.dangerBorder, backgroundColor: theme.colors.dangerTint },
    doneVerdictText:  { fontSize: 13, fontWeight: '700' },
  });
}
