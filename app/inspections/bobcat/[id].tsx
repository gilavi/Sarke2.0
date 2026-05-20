import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { InspectionShell, ChecklistStep, ConclusionStep, ProjectPickerStep } from '../../../components/inspections';
import type { VerdictOption } from '../../../components/inspections';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';

import { bobcatApi } from '../../../lib/bobcatService';
import { projectsApi, inspectionAttachmentsApi } from '../../../lib/services';
import {
  PhotoSection,
  SignatureSheet,
} from '../../../components/inspection';
import { STORAGE_BUCKETS } from '../../../lib/supabase';

import { buildBobcatPdfHtml } from '../../../lib/bobcatPdf';
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
  BOBCAT_ITEMS,
  BOBCAT_CATEGORY_LABELS,
  VERDICT_LABEL,
  LARGE_LOADER_TEMPLATE_ID,
  LARGE_LOADER_ITEMS,
  categoryCounts,
  type BobcatInspection,
  type BobcatVerdict,
  type BobcatItemState,
  type BobcatCategory,
  type BobcatChecklistEntry,
} from '../../../types/bobcat';

const CATEGORIES: BobcatCategory[] = ['A', 'B', 'C', 'D'];

export default function BobcatInspectionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();

  const { pickPhotoWithAnnotation } = usePhotoWithLocation();

  const [paywallVisible, setPaywallVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  const userId = session?.state?.status === 'signedIn' ? session.state.session.user.id : null;

  // ── Field suggestion histories ────────────────────────────────────────────
  const equipmentModelHistory = useFieldHistory(userId, 'bobcat:equipmentModel');
  const registrationNumberHistory = useFieldHistory(userId, 'bobcat:registrationNumber');

  const PROJECT_STEP    = 0;
  const INFO_STEP       = 1;
  const SERIAL_STEP     = 2;
  const CHECKLIST_STEP  = 3;
  const CONCLUSION_STEP = 4;
  const DONE_STEP       = 5;
  const TOTAL_STEPS     = 5;
  const STEP_LABELS     = ['პროექტი', 'მოდელი', 'ს/ნ', 'შემოწ.', 'დასკვნა'];

  const [inspection, setInspection] = useState<BobcatInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [attachmentCount, setAttachmentCount] = useState(0);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Serial number step state
  const plateRef = useRef<PlateInputHandle>(null);
  const [activeSlotKind, setActiveSlotKind] = useState<'letter' | 'digit'>('letter');

  // Step state: 0=info, 1=serial, 2=checklist, 3=conclusion
  const [step, setStep] = useState(INFO_STEP);
  const prevStepRef = useRef(INFO_STEP);
  const [animateSteps, setAnimateSteps] = useState(false);
  const inspectionRef = useRef<BobcatInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  const catalog: BobcatChecklistEntry[] = useMemo(
    () => inspection?.templateId === LARGE_LOADER_TEMPLATE_ID ? LARGE_LOADER_ITEMS : BOBCAT_ITEMS,
    [inspection?.templateId],
  );

  const isLargeLoader = inspection?.templateId === LARGE_LOADER_TEMPLATE_ID;
  const screenTitle = isLargeLoader ? 'დიდი ციცხვიანი დამტვირთველი' : 'ციცხვიანი დამტვირთველი';



  const persistKey = useMemo(() => `bobcat-wizard:${id}:step`, [id]);
  const summaryPhotosKey = useMemo(() => `bobcat-wizard:${id}:summaryPhotos`, [id]);

  // Direction for animations
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
        const insp = await bobcatApi.getById(id);
        if (cancelled) return;
        if (!insp) { router.back(); return; }

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

        if (patched.inspectorName && patched.inspectorName !== insp.inspectorName) {
          bobcatApi.patch(patched.id, { inspectorName: patched.inspectorName }).catch(() => {});
        }

        // Compute correct step constants based on the loaded inspection's template
        const loadedCatalog = insp.templateId === LARGE_LOADER_TEMPLATE_ID ? LARGE_LOADER_ITEMS : BOBCAT_ITEMS;
        const loadedChecklistCount = loadedCatalog.length;
        const loadedSummaryStep = 1 + loadedChecklistCount;
        const loadedSignatureStep = loadedSummaryStep + 1;
        const loadedDoneStep = loadedSignatureStep + 1;

        if (insp.status === 'completed') {
          // Will render result view instead of wizard
        } else {
          // Restore saved step
          const saved = await AsyncStorage.getItem(persistKey);
          if (saved && !cancelled) {
            const s = parseInt(saved, 10);
            if (!isNaN(s) && s >= INFO_STEP && s <= CONCLUSION_STEP) {
              setStep(s);
            }
          }
        }

        projectsApi.getById(insp.projectId).then(p => {
          if (cancelled || !p) return;
          setProjectName(p.company_name || p.name);
          setInspection(prev => {
            if (!prev) return prev;
            const companyFill = !prev.company?.trim() ? (p.company_name || p.name) : null;
            const addressFill = !prev.address?.trim() && p.address ? p.address : null;
            if (!companyFill && !addressFill) return prev;
            const next = {
              ...prev,
              ...(companyFill ? { company: companyFill } : {}),
              ...(addressFill ? { address: addressFill } : {}),
            };
            bobcatApi.patch(next.id, {
              ...(companyFill ? { company: next.company } : {}),
              ...(addressFill ? { address: next.address } : {}),
            }).catch(() => {});
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
          // Enable animations after load to avoid animation on restored step
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

  // Persist step when in checklist range
  useEffect(() => {
    if (step >= INFO_STEP && step <= CONCLUSION_STEP) {
      AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
    }
  }, [step, persistKey, INFO_STEP, CONCLUSION_STEP]);

  // ── Auto-save (debounced) ──────────────────────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((insp: BobcatInspection) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      bobcatApi.patch(insp.id, {
        company: insp.company,
        address: insp.address,
        equipmentModel: insp.equipmentModel,
        registrationNumber: insp.registrationNumber,
        inspectionDate: insp.inspectionDate,
        inspectionType: insp.inspectionType,
        inspectorName: insp.inspectorName,
        items: insp.items,
        verdict: insp.verdict,
        notes: insp.notes,
        inspectorSignature: insp.inspectorSignature,
      }).catch(e => {
        toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      }).finally(() => setSaving(false));
    }, 700);
  }, [toast]);

  const update = useCallback(<K extends keyof BobcatInspection>(
    key: K,
    value: BobcatInspection[K],
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateItem = useCallback((
    itemId: number,
    patch: Partial<Pick<BobcatItemState, 'result' | 'comment'>>,
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i =>
        i.id === itemId ? { ...i, ...patch } : i,
      );
      const next = { ...prev, items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Photo handling ─────────────────────────────────────────────────────────

  const handleAddPhoto = useCallback(async (itemId: number) => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await bobcatApi.uploadPhoto(insp.id, itemId, result.uri);
      setInspection(prev => {
        if (!prev) return prev;
        const items = prev.items.map(i =>
          i.id === itemId ? { ...i, photo_paths: [...(i.photo_paths ?? []), path] } : i,
        );
        const next = { ...prev, items };
        scheduleSave(next);
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  }, [pickPhotoWithAnnotation, scheduleSave, toast]);

  const handleDeletePhoto = useCallback(async (itemId: number, path: string) => {
    try {
      await bobcatApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხერხდა'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i =>
        i.id === itemId ? { ...i, photo_paths: (i.photo_paths ?? []).filter(p => p !== path) } : i,
      );
      const next = { ...prev, items };
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
    if (!inspection) return;
    const missing: string[] = [];
    if (!inspection.equipmentModel?.trim())     missing.push('დამტვირთველის მარკა / მოდელი');
    if (!inspection.registrationNumber?.trim()) missing.push('სახელმწიფო / ს.ნ ნომერი');
    if (!inspection.verdict)                    missing.push('შეჯამება: დასკვნა');

    if (missing.length > 0) {
      Alert.alert('შეავსეთ სავალდებულო ველები', missing.map(m => `• ${m}`).join('\n'));
      return;
    }
    setCompleting(true);
    try {
      await bobcatApi.patch(inspection.id, {
        company: inspection.company,
        address: inspection.address,
        equipmentModel: inspection.equipmentModel,
        registrationNumber: inspection.registrationNumber,
        inspectionDate: inspection.inspectionDate,
        inspectionType: inspection.inspectionType,
        inspectorName: inspection.inspectorName,
        items: inspection.items,
        verdict: inspection.verdict,
        notes: inspection.notes,
        inspectorSignature: inspection.inspectorSignature,
      });
      await bobcatApi.complete(inspection.id);
      const completedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        inspection.id,
        completedAt,
        `${inspection.projectId}:bobcat`,
      ).catch(() => {});
      setInspection(prev => prev ? { ...prev, status: 'completed', completedAt } : prev);
      await AsyncStorage.removeItem(persistKey);
      toast.success('შემოწმება დასრულდა');
    } catch (e) {
      toast.error(friendlyError(e, 'შეცდომა'));
    } finally {
      setCompleting(false);
    }
  }, [inspection, toast, persistKey]);

  // ── PDF ────────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    if (!inspection) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setGeneratingPdf(true);
    try {
      const html = await buildBobcatPdfHtml({
        inspection,
        projectName: projectName || 'პროექტი',
        catalog,
      });
      const pdfName = generatePdfName(
        projectName || 'project',
        isLargeLoader ? 'LargeLoaderInspection' : 'BobcatInspection',
        new Date(inspection.inspectionDate),
        inspection.id,
      );
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, userId, {
        title: isLargeLoader ? 'დიდი ციცხვიანი' : 'ბობკატის შემოწმება',
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
  }, [inspection, projectName, catalog, isLargeLoader, session.state, invalidatePdfUsage, toast]);

  // ── Summary Photos ─────────────────────────────────────────────────────────

  const handleAddSummaryPhoto = useCallback(async () => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await bobcatApi.uploadSummaryPhoto(insp.id, result.uri);
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
      await bobcatApi.deletePhoto(path);
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
      const html = await buildBobcatPdfHtml({
        inspection,
        projectName: projectName || 'პროექტი',
        catalog,
      });
      setPreviewHtml(html);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setPreviewBusy(false);
    }
  }, [inspection, projectName, catalog, toast]);

  useEffect(() => {
    if (inspection?.status === 'completed') {
      void buildPreview();
    }
  }, [inspection?.status, buildPreview]);

  // ── Step navigation ────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === PROJECT_STEP) return true;
    if (step === INFO_STEP) return !!inspection.equipmentModel?.trim();
    if (step === SERIAL_STEP) return !!inspection.registrationNumber?.trim();
    if (step === CONCLUSION_STEP) return !!inspection.verdict && !completing;
    return true;
  }, [step, inspection, completing, PROJECT_STEP, INFO_STEP, SERIAL_STEP, CONCLUSION_STEP]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      await handleComplete();
      router.push(`/inspections/bobcat/${id}/done` as any);
    } else if (step < CONCLUSION_STEP) {
      setStep(s => s + 1);
    }
  }, [step, CONCLUSION_STEP, handleComplete, id, router]);

  const handlePrev = useCallback(() => {
    if (step === PROJECT_STEP) {
      router.back();
    } else {
      setStep(s => s - 1);
    }
  }, [step, PROJECT_STEP, router]);

  // ── Derived data for shared components ────────────────────────────────────

  const checklistItems = useMemo(
    () => catalog.map(e => ({ id: String(e.id), description: e.description })),
    [catalog],
  );

  const checklistStates = useMemo(
    () => catalog.map(e => {
      const s = inspection?.items.find(i => i.id === e.id);
      return {
        id: String(e.id),
        result: (s?.result ?? null) as import('../../../components/inspections').ChecklistResult,
        comment: s?.comment ?? null,
        photo_paths: s?.photo_paths ?? [],
      };
    }),
    [catalog, inspection?.items],
  );

  const bobcatVerdictOptions = useMemo<VerdictOption<BobcatVerdict>[]>(
    () => (['approved', 'limited', 'rejected'] as BobcatVerdict[]).map(v => ({
      value: v,
      label: VERDICT_LABEL[v],
    })),
    [],
  );

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
        templateName={screenTitle}
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
                position: '',
                signature: inspection.inspectorSignature,
              },
            ]}
            onChange={(_idx: number, field: string, value: string) => {
              setInspection(prev => {
                if (!prev) return prev;
                const next = { ...prev };
                if (field === 'name') next.inspectorName = value;
                else if (field === 'signature') next.inspectorSignature = value || null;
                return next;
              });
            }}
            onSign={(_idx: number, base64: string) => {
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
      title={screenTitle}
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
      showPdfIcon={step > PROJECT_STEP}
      generatingPdf={generatingPdf}
      onNext={handleNext}
      onPrev={step === PROJECT_STEP
        ? async () => { await AsyncStorage.removeItem(persistKey); router.back(); }
        : handlePrev}
      onClose={() => router.back()}
      onPdf={handlePdf}
    >
          {/* ── Step 0: Project picker ──────────────────────────────────── */}
          {step === PROJECT_STEP && (
            <ProjectPickerStep
              selectedId={inspection.projectId}
              onSelect={p => {
                setProjectName(p.company_name || p.name);
                setInspection(prev => prev ? { ...prev, projectId: p.id } : prev);
              }}
            />
          )}

          {/* ── Step 1: Equipment model ─────────────────────────────────── */}
          {step === INFO_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <FloatingLabelInput
                label="დამტვირთველის მარკა / მოდელი *"
                value={inspection.equipmentModel ?? ''}
                onChangeText={v => update('equipmentModel', v)}
                onFocus={() => setFocusedField('equipmentModel')}
                onBlur={() => {
                  setFocusedField(null);
                  if (inspection.equipmentModel?.trim()) {
                    equipmentModelHistory.addToHistory(inspection.equipmentModel.trim());
                  }
                }}
                required
              />
              {equipmentModelHistory.suggestions.length > 0 && (
                <SuggestionPills
                  suggestions={equipmentModelHistory.suggestions}
                  onSelect={v => {
                    update('equipmentModel', v);
                    setFocusedField(null);
                  }}
                  visible={focusedField === 'equipmentModel' || (!inspection.equipmentModel?.trim() && equipmentModelHistory.suggestions.length > 0)}
                />
              )}
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Serial Number (custom on-screen keypad) ─────────── */}
          {step === SERIAL_STEP && (
            <View style={{ flex: 1 }}>
              <View style={{ paddingHorizontal: 20, paddingTop: 32, gap: 20, alignItems: 'center' }}>
                <PlateInput
                  ref={plateRef}
                  label="სახელმწიფო / ს.ნ ნომერი"
                  value={inspection.registrationNumber ?? ''}
                  onChangeText={v => {
                    update('registrationNumber', v);
                    if (v.trim()) registrationNumberHistory.addToHistory(v.trim());
                  }}
                  customKeyboard
                  onActiveSlotKindChange={k => setActiveSlotKind(k ?? 'letter')}
                  required
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

          {/* ── Step 2: Checklist ──────────────────────────────────────── */}
          {step === CHECKLIST_STEP && (
            <ChecklistStep
              items={checklistItems}
              states={checklistStates}
              onStateChange={(sid, patch) => updateItem(Number(sid), patch as any)}
              showCommentButton={false}
            />
          )}

          {/* ── Step 3: Conclusion ─────────────────────────────────────── */}
          {step === CONCLUSION_STEP && (
            <ConclusionStep
              verdict={inspection.verdict}
              verdictOptions={bobcatVerdictOptions}
              notes={inspection.notes ?? ''}
              onVerdictChange={v => update('verdict', v)}
              onNotesChange={v => update('notes', v || null)}
              completing={completing}
              photoSection={
                <>
                  <Text style={[styles.fieldLabel, { color: theme.colors.ink }]}>ფოტოები (სურვ.)</Text>
                  <PhotoSection
                    photoPaths={inspection.summaryPhotos ?? []}
                    onAdd={handleAddSummaryPhoto}
                    onDelete={handleDeleteSummaryPhoto}
                  />
                </>
              }
            />
          )}
    </InspectionShell>
  );
}

// ── Screen styles ────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
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

    fieldRow: { marginBottom: 4, gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },

    sumTable: {
      marginBottom: 12,
    },
    sumRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline },
    sumHeaderRow: { backgroundColor: theme.colors.subtleSurface },
    sumCell: { flex: 1, padding: 8, fontSize: 11 },
    sumCatCell: { flex: 3, color: theme.colors.ink },
    sumCountCell: { width: 40, textAlign: 'center', padding: 8, fontSize: 13, color: theme.colors.inkSoft },
    sumHeaderText: { fontWeight: '700', color: theme.colors.inkSoft, fontSize: 10, textTransform: 'uppercase' },

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
    verdictOptionActive: {
      borderBottomColor: theme.colors.accent,
    },
    verdictOptionSuggested: {
      borderBottomColor: theme.colors.warn,
    },
    verdictCheck: {
      width: 20, height: 20, borderRadius: 5,
      borderWidth: 1.5, borderColor: theme.colors.hairline,
      alignItems: 'center', justifyContent: 'center',
      marginTop: 1,
    },
    verdictCheckActive: {
      backgroundColor: theme.colors.accent, borderColor: theme.colors.accent,
    },
    verdictLabel: { flex: 1, fontSize: 12, color: theme.colors.inkSoft, lineHeight: 18 },
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

    completingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
    completingText: { fontSize: 13, color: theme.colors.inkSoft },

    doneHero: { paddingVertical: 16, gap: 6 },
    doneTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.ink, textAlign: 'center' },
    doneDate: { fontSize: 13, color: theme.colors.inkSoft, marginTop: 2 },
    doneVerdict: {
      paddingHorizontal: 16, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1.5,
      marginTop: 8,
    },
    doneVerdictGreen: { borderColor: theme.colors.semantic.success, backgroundColor: theme.colors.semantic.successSoft },
    doneVerdictAmber: { borderColor: theme.colors.warn, backgroundColor: theme.colors.warnSoft },
    doneVerdictRed:   { borderColor: theme.colors.dangerBorder, backgroundColor: theme.colors.dangerTint },
    doneVerdictText:  { fontSize: 13, fontWeight: '700' },

    // List row styles
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
      gap: 8,
    },
    listRowInfo: { flex: 1, gap: 2 },
    listRowLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.ink },
    listRowActions: { flexDirection: 'row', gap: 6 },
    statusBtn: {
      width: 44, height: 44,
      borderRadius: 8,
      borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center',
    },
    statusBtnGood:       { borderColor: theme.colors.semantic.success },
    statusBtnGoodActive: { backgroundColor: theme.colors.semantic.success, borderColor: theme.colors.semantic.success },
    statusBtnWarn:       { borderColor: theme.colors.warn },
    statusBtnWarnActive: { backgroundColor: theme.colors.warn, borderColor: theme.colors.warn },
    statusBtnBad:        { borderColor: theme.colors.dangerBorder },
    statusBtnBadActive:  { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger },
    statusBtnText:       { fontSize: 18 },
    statusBtnTextGood:   { color: theme.colors.semantic.success },
    statusBtnTextWarn:   { color: theme.colors.warn },
    statusBtnTextBad:    { color: theme.colors.danger },
    statusBtnTextActive: { color: theme.colors.white, fontWeight: '700' },
  });
}
