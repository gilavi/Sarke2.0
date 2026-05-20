import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Button } from '../../../components/ui';
import { DateTimeField } from '../../../components/DateTimeField';
import { WizardStepTransition } from '../../../components/wizard/WizardStepTransition';
import { FlowHeader } from '../../../components/FlowHeader';
import { InspectionResultView } from '../../../components/InspectionResultView';
import {
  ChecklistSection,
  DynamicTable,
  SignatureSheet,
  VerdictSelector,
  PhotoSection,
  IdentificationGrid,
  type VerdictOption,
} from '../../../components/inspection';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { liftingAccessoriesApi } from '../../../lib/liftingAccessoriesService';
import { projectsApi } from '../../../lib/services';
import { renderInspectionPdf } from '../../../lib/inspection/renderMobile';
import { liftingAccessoriesSchema } from '../../../lib/inspection/schemas/liftingAccessories';
import { generateAndSharePdf, PdfLimitReachedError } from '../../../lib/pdfOpen';
import { PaywallModal } from '../../../components/PaywallModal';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { usePdfUsage, useInvalidatePdfUsage } from '../../../lib/usePdfUsage';
import { generatePdfName } from '../../../lib/pdfName';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import { haptic } from '../../../lib/haptics';
import { CelebrationBurst } from '../../../components/animations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePhotoWithLocation } from '../../../hooks/usePhotoWithLocation';

import {
  LA_CHECKLIST_ITEMS,
  LA_RESULT_TO_CHIP,
  LA_CHIP_TO_RESULT,
  LA_VERDICT_LABELS,
  LA_CHECKLIST_OPTIONS,
  LA_EQUIPMENT_TYPES,
  LA_OTHER_EQUIPMENT_VALUE,
  LA_MARKING_OPTIONS,
  LIFTING_ACCESSORIES_TEMPLATE_ID,
  computeLAVerdictSuggestion,
  buildDefaultLARemovedRow,
  type LiftingAccessoriesInspection,
  type LAVerdict,
  type LAResult,
  type LASignatory,
  type LARemovedRow,
} from '../../../types/liftingAccessories';

// ── Step constants ────────────────────────────────────────────────────────────

const IDENTIFICATION_STEP = 1;
const CHECKLIST_STEP      = 2;
const REMOVED_STEP        = 3;
const CONCLUSION_STEP     = 4;
const TOTAL_STEPS         = 4;
const STEP_LABELS         = ['მოწყ.', 'შემოწ.', 'ამოღ.', 'დასკვ.'];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LiftingAccessoriesInspectionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const insets = useSafeAreaInsets();
  const { pickPhotoWithAnnotation } = usePhotoWithLocation();

  const [paywallVisible, setPaywallVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  const [inspection, setInspection] = useState<LiftingAccessoriesInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const [step, setStep] = useState(IDENTIFICATION_STEP);
  const prevStepRef = useRef(IDENTIFICATION_STEP);
  const [animateSteps, setAnimateSteps] = useState(false);
  const inspectionRef = useRef<LiftingAccessoriesInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  const persistKey = useMemo(() => `lifting-accessories-wizard:${id}:step`, [id]);

  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const insp = await liftingAccessoriesApi.getById(id);
        if (cancelled) return;
        if (!insp) { router.back(); return; }

        let patched = insp;
        if (!insp.inspectorName && session.state.status === 'signedIn') {
          const u = session.state.user;
          const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
          if (name) {
            patched = {
              ...patched,
              inspectorName: name,
              signatures: [
                { ...patched.signatures[0], name },
                patched.signatures[1],
              ],
            };
          }
        }
        if (patched.inspectorName !== insp.inspectorName) {
          liftingAccessoriesApi.patch(patched.id, {
            inspectorName: patched.inspectorName,
          }).catch(() => {});
        }

        if (insp.status !== 'completed') {
          const saved = await AsyncStorage.getItem(persistKey);
          if (saved && !cancelled) {
            const s = parseInt(saved, 10);
            if (!isNaN(s) && s >= IDENTIFICATION_STEP && s <= CONCLUSION_STEP) setStep(s);
          }
        }

        try {
          const p = await projectsApi.getById(insp.projectId);
          if (p) {
            setProjectName(p.company_name || p.name);
            const companyFill = !patched.company?.trim() ? (p.company_name || p.name) : null;
            const addressFill = !patched.address?.trim() && p.address ? p.address : null;
            if (companyFill || addressFill) {
              patched = {
                ...patched,
                ...(companyFill ? { company: companyFill } : {}),
                ...(addressFill ? { address: addressFill } : {}),
              };
              liftingAccessoriesApi.patch(patched.id, {
                ...(companyFill ? { company: patched.company } : {}),
                ...(addressFill ? { address: patched.address } : {}),
              }).catch(() => {});
            }
          }
        } catch {
          // project fetch is best-effort
        }

        if (!cancelled) setInspection(patched);
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

  useEffect(() => {
    if (step >= IDENTIFICATION_STEP && step <= CONCLUSION_STEP) {
      AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
    }
  }, [step, persistKey]);

  useEffect(() => {
    return () => { if (celebrationTimer.current) clearTimeout(celebrationTimer.current); };
  }, []);

  // ── Auto-save (debounced) ───────────────────────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((insp: LiftingAccessoriesInspection) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      liftingAccessoriesApi.patch(insp.id, {
        company:             insp.company,
        address:             insp.address,
        inspectorName:       insp.inspectorName,
        inspectionDate:      insp.inspectionDate,
        equipmentTypes:      insp.equipmentTypes,
        equipmentTypeOther:  insp.equipmentTypeOther,
        serialNumber:        insp.serialNumber,
        manufacturer:        insp.manufacturer,
        yearOfManufacture:   insp.yearOfManufacture,
        markingStatus:       insp.markingStatus,
        wllKg:               insp.wllKg,
        unitCount:           insp.unitCount,
        nextInspectionDate:  insp.nextInspectionDate,
        items:               insp.items,
        removedRows:         insp.removedRows,
        verdict:             insp.verdict,
        verdictComment:      insp.verdictComment,
        summaryPhotos:       insp.summaryPhotos,
      }).catch(e => {
        toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      }).finally(() => setSaving(false));
    }, 700);
  }, [toast]);

  const update = useCallback(<K extends keyof LiftingAccessoriesInspection>(
    key: K,
    value: LiftingAccessoriesInspection[K],
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateMulti = useCallback((patch: Partial<LiftingAccessoriesInspection>) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Checklist ───────────────────────────────────────────────────────────────

  const handleChecklistChange = useCallback(
    (itemId: number, field: 'value' | 'comment', val: string | null) => {
      setInspection(prev => {
        if (!prev) return prev;
        const items = prev.items.map(i => {
          if (i.id !== itemId) return i;
          if (field === 'value') {
            const result: LAResult | null = val ? (LA_CHIP_TO_RESULT[val] ?? null) : null;
            return { ...i, result };
          }
          return { ...i, comment: val };
        });
        const next = { ...prev, items };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  // ── Item photos ─────────────────────────────────────────────────────────────

  const handleAddItemPhoto = useCallback(async (itemId: number) => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await liftingAccessoriesApi.uploadPhoto(insp.id, itemId, result.uri);
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

  const handleDeleteItemPhoto = useCallback(async (itemId: number, path: string) => {
    try {
      await liftingAccessoriesApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხ.'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i =>
        i.id === itemId
          ? { ...i, photo_paths: (i.photo_paths ?? []).filter(p => p !== path) }
          : i,
      );
      const next = { ...prev, items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, toast]);

  // ── Summary photos ──────────────────────────────────────────────────────────

  const handleAddSummaryPhoto = useCallback(async () => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await liftingAccessoriesApi.uploadPhoto(insp.id, 'summary', result.uri);
      setInspection(prev => {
        if (!prev) return prev;
        const next = { ...prev, summaryPhotos: [...prev.summaryPhotos, path] };
        scheduleSave(next);
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  }, [pickPhotoWithAnnotation, scheduleSave, toast]);

  const handleDeleteSummaryPhoto = useCallback(async (path: string) => {
    try {
      await liftingAccessoriesApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხ.'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, summaryPhotos: prev.summaryPhotos.filter(p => p !== path) };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, toast]);

  // ── Removed rows ────────────────────────────────────────────────────────────

  const handleRemovedRowsChange = useCallback((rows: Record<string, any>[]) => {
    const removedRows = rows.map(({ num: _n, ...r }) => r as LARemovedRow);
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, removedRows };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Signatures ──────────────────────────────────────────────────────────────

  const handleSignatoryChange = useCallback((idx: number, field: string, value: string) => {
    setInspection(prev => {
      if (!prev) return prev;
      const sigs = [...prev.signatures];
      const sig = { ...sigs[idx] };
      if (field.startsWith('extra.')) {
        const key = field.slice(6);
        sig.extra = { ...(sig.extra ?? {}), [key]: value };
      } else {
        (sig as any)[field] = field === 'signature' ? (value || null) : value;
      }
      sigs[idx] = sig;
      return { ...prev, signatures: sigs };
    });
  }, []);

  const handleSign = useCallback((idx: number, base64Png: string) => {
    const insp = inspectionRef.current;
    if (!insp) return;
    const sigs = [...insp.signatures];
    sigs[idx] = { ...sigs[idx], signature: base64Png, date: new Date().toISOString() };
    setInspection({ ...insp, signatures: sigs });
  }, []);

  // ── Verdict suggestion ──────────────────────────────────────────────────────

  const suggestedVerdict = useMemo(
    () => inspection ? computeLAVerdictSuggestion(inspection.items, inspection.markingStatus) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inspection?.items, inspection?.markingStatus],
  );

  // ── PDF ─────────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    const insp = inspectionRef.current;
    if (!insp) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setGeneratingPdf(true);
    try {
      const html = await renderInspectionPdf(liftingAccessoriesSchema, { inspection: insp, projectName: projectName || 'პროექტი' });
      const pdfName = generatePdfName(
        projectName || 'project',
        'LiftingAccessoriesInspection',
        new Date(insp.inspectionDate),
        insp.id,
      );
      const uid = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, uid, {
        title: 'ამწე მოწყ. / სლინგი / ჩამჭ. შემოწმება',
        author: insp.inspectorName || undefined,
        documentId: insp.id,
        subject: 'შრომის უსაფრთხოება',
      });
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setPaywallVisible(true); return; }
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setGeneratingPdf(false);
    }
  }, [projectName, session.state, invalidatePdfUsage, toast, pdfUsage]);

  // ── Preview (completed) ─────────────────────────────────────────────────────

  const buildPreview = useCallback(async () => {
    const insp = inspectionRef.current;
    if (!insp) return;
    setPreviewBusy(true);
    try {
      const html = await renderInspectionPdf(liftingAccessoriesSchema, { inspection: insp, projectName: projectName || 'პროექტი' });
      setPreviewHtml(html);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setPreviewBusy(false);
    }
  }, [projectName, toast]);

  useEffect(() => {
    if (inspection?.status === 'completed') void buildPreview();
  }, [inspection?.status]);

  // ── Complete ────────────────────────────────────────────────────────────────

  const isBothSigned = !!(inspection?.signatures[0].signature && inspection?.signatures[1].signature);

  const handleComplete = useCallback(async () => {
    if (!inspection) return;
    const missing: string[] = [];
    if (!inspection.verdict)          missing.push('დასკვნა');

    if (missing.length > 0) {
      Alert.alert('შეავსეთ სავალდებულო ველები', missing.map(m => `• ${m}`).join('\n'));
      return;
    }

    setCompleting(true);
    try {
      await liftingAccessoriesApi.patch(inspection.id, {
        company:             inspection.company,
        address:             inspection.address,
        inspectorName:       inspection.inspectorName,
        inspectionDate:      inspection.inspectionDate,
        equipmentTypes:      inspection.equipmentTypes,
        equipmentTypeOther:  inspection.equipmentTypeOther,
        serialNumber:        inspection.serialNumber,
        manufacturer:        inspection.manufacturer,
        yearOfManufacture:   inspection.yearOfManufacture,
        markingStatus:       inspection.markingStatus,
        wllKg:               inspection.wllKg,
        unitCount:           inspection.unitCount,
        nextInspectionDate:  inspection.nextInspectionDate,
        items:               inspection.items,
        removedRows:         inspection.removedRows,
        verdict:             inspection.verdict,
        verdictComment:      inspection.verdictComment,
        summaryPhotos:       inspection.summaryPhotos,
      });
      await liftingAccessoriesApi.complete(inspection.id);
      const completedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        inspection.id,
        completedAt,
        `${inspection.projectId}:${LIFTING_ACCESSORIES_TEMPLATE_ID}`,
      ).catch(() => {});
      setInspection(prev => prev ? { ...prev, status: 'completed', completedAt } : prev);
      await AsyncStorage.removeItem(persistKey);
      toast.success('შემოწმება დასრულდა');
      setCelebrating(true);
      haptic.inspectionComplete();
      celebrationTimer.current = setTimeout(() => setCelebrating(false), 2000);
    } catch (e) {
      toast.error(friendlyError(e, 'შეცდომა'));
    } finally {
      setCompleting(false);
    }
  }, [inspection, persistKey, toast]);

  // ── Step navigation ─────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === CONCLUSION_STEP) return !!inspection.verdict && !completing;
    return true;
  }, [step, inspection, completing]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      await handleComplete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, handleComplete]);

  const handlePrev = useCallback(async () => {
    if (step === IDENTIFICATION_STEP) {
      await AsyncStorage.removeItem(persistKey);
      router.back();
    } else {
      setStep(s => s - 1);
    }
  }, [step, persistKey, router]);

  // ── Checklist items builder ─────────────────────────────────────────────────

  const checklistItemsForSection = (sectionKey: 'A' | 'B') =>
    LA_CHECKLIST_ITEMS.filter(e => e.section === sectionKey).map(e => {
      const state = inspection!.items.find(i => i.id === e.id)
        ?? { id: e.id, result: null, comment: null, photo_paths: [] };
      return {
        id: e.id,
        label: e.label,
        description: e.description || undefined,
        type: 'binary' as const,
        options: LA_CHECKLIST_OPTIONS,
        value: state.result ? LA_RESULT_TO_CHIP[state.result] : null,
        comment: state.comment,
        photoPaths: state.photo_paths ?? [],
      };
    });

  // ── Loading & completed ─────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'სლინგის შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
    );
  }

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="ამწე მოწყ. / სლინგი"
        requiredSignerRoles={[]}
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        signedCount={inspection.signatures.filter(s => !!s.signature).length}
        totalSlots={inspection.signatures.length}
        attachmentCount={0}
        pdfLocked={pdfUsage?.isLocked}
        downloading={generatingPdf}
        paywallVisible={paywallVisible}
        onPaywallClose={() => setPaywallVisible(false)}
        onDownloadPdf={() => void handlePdf()}
        onSheetSaved={() => void buildPreview()}
        renderSignaturesSheet={({ dismiss, onChanged }) => (
          <SignatureSheet
            onClose={dismiss}
            signatories={[
              { role: 'I ხელმომწერი', ...inspection.signatures[0] },
              { role: 'II ხელმომწერი', ...inspection.signatures[1] },
            ]}
            onChange={handleSignatoryChange}
            onSign={(idx, base64) => {
              handleSign(idx, base64);
              onChanged();
            }}
          />
        )}
      />
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle="სლინგ. / ჩამჭ. შემოწ."
        project={projectName ? { name: projectName } : null}
        step={step}
        totalSteps={TOTAL_STEPS}
        leading="back"
        trailing="close"
        onClose={() => router.back()}
        trailingElement={(
          <Pressable
            onPress={handlePdf}
            disabled={generatingPdf}
            hitSlop={10}
            {...a11y('PDF', 'PDF დოკუმენტის გენერირება', 'button')}
          >
            <Ionicons
              name={generatingPdf ? 'hourglass-outline' : 'document-text-outline'}
              size={22}
              color={theme.colors.accent}
            />
          </Pressable>
        )}
        onBack={handlePrev}
        backDisabled={false}
      />

      {saving && <Text style={styles.savingHint}>შენახვა…</Text>}

      {pdfUsage?.isLocked && <PdfLockedBanner onSubscribe={() => setPaywallVisible(true)} />}

      <View style={{ flex: 1 }}>
        <WizardStepTransition stepKey={step} direction={direction} animate={animateSteps}>

          {/* ── Step 1: Equipment Identification ────────────────────────────── */}
          {step === IDENTIFICATION_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <IdentificationGrid
                fields={[
                  {
                    label: 'ტ-პი / სახ.',
                    value: '',
                    type: 'chips',
                    multiSelect: true,
                    values: inspection.equipmentTypes,
                    onValuesChange: v => update('equipmentTypes', v),
                    options: LA_EQUIPMENT_TYPES as unknown as string[],
                    otherOptionValue: LA_OTHER_EQUIPMENT_VALUE,
                    otherValue: inspection.equipmentTypeOther,
                    onOtherValueChange: v => update('equipmentTypeOther', v),
                  },
                  {
                    label: 'სერ. NN / ID',
                    value: inspection.serialNumber,
                    onChange: v => update('serialNumber', v),
                  },
                  {
                    label: 'მწარმოებელი',
                    value: inspection.manufacturer,
                    onChange: v => update('manufacturer', v),
                  },
                  {
                    label: 'წ. წარმ.',
                    value: inspection.yearOfManufacture,
                    type: 'number',
                    onChange: v => update('yearOfManufacture', v),
                  },
                  {
                    label: 'WLL (კგ)',
                    value: inspection.wllKg,
                    type: 'number',
                    onChange: v => update('wllKg', v),
                  },
                  {
                    label: 'ერთ. რ-ბა',
                    value: inspection.unitCount,
                    type: 'number',
                    onChange: v => update('unitCount', v),
                  },
                  {
                    label: 'მარ-ბა',
                    value: inspection.markingStatus ?? '',
                    type: 'chips',
                    options: LA_MARKING_OPTIONS as unknown as string[],
                    onChange: v => update('markingStatus', v),
                    isProblematic: inspection.markingStatus === LA_MARKING_OPTIONS[2],
                    isWarning: inspection.markingStatus === LA_MARKING_OPTIONS[1],
                  },
                ]}
                columns={2}
              />

              <View style={styles.nextDateRow}>
                <Text style={styles.fieldLabel}>მომდევნო შემოწმება</Text>
                <DateTimeField
                  label="მომდევნო შემოწმება"
                  value={
                    inspection.nextInspectionDate
                      ? new Date(inspection.nextInspectionDate)
                      : new Date()
                  }
                  onChange={d => update('nextInspectionDate', d.toISOString().slice(0, 10))}
                  mode="date"
                />
              </View>
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Checklist ────────────────────────────────────────────── */}
          {step === CHECKLIST_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1, paddingHorizontal: 16, paddingTop: 12,
                paddingBottom: 24, gap: 8,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <ChecklistSection
                title="A — ვიზუალური შემოწმება"
                items={checklistItemsForSection('A')}
                onItemChange={handleChecklistChange}
                onAddPhoto={handleAddItemPhoto}
                onDeletePhoto={handleDeleteItemPhoto}
              />

              <ChecklistSection
                title="B — ფუნქციური შემოწმება"
                items={checklistItemsForSection('B')}
                onItemChange={handleChecklistChange}
                onAddPhoto={handleAddItemPhoto}
                onDeletePhoto={handleDeleteItemPhoto}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 3: Removed from service + photos ───────────────────────── */}
          {step === REMOVED_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <Text style={styles.sectionLabel}>ამოღებული მოწყობილობები</Text>
              <DynamicTable
                columns={[
                  { key: 'serialNumber',    label: 'სერ. NN / ID',     type: 'text' },
                  { key: 'typeDescription', label: 'ტ-პი / სახელ.',    type: 'text' },
                  { key: 'reason',          label: 'ამოღების მიზეზი',  type: 'text' },
                ]}
                rows={inspection.removedRows}
                onChange={handleRemovedRowsChange}
                onBuildDefaultRow={buildDefaultLARemovedRow}
              />

              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>საერთო ფოტო მასალა</Text>
              <PhotoSection
                photoPaths={inspection.summaryPhotos}
                onAdd={handleAddSummaryPhoto}
                onDelete={handleDeleteSummaryPhoto}
                title=""
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 4: Conclusion ───────────────────────────────────────────── */}
          {step === CONCLUSION_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              {suggestedVerdict && inspection.verdict !== suggestedVerdict && (
                <Pressable
                  style={styles.suggestBanner}
                  onPress={() => update('verdict', suggestedVerdict)}
                >
                  <Ionicons name="bulb-outline" size={16} color={theme.colors.warn} />
                  <Text style={styles.suggestText}>
                    შემოთ.: {LA_VERDICT_LABELS[suggestedVerdict]}
                  </Text>
                </Pressable>
              )}

              <Text style={styles.fieldLabel}>დასკვნა *</Text>
              <VerdictSelector
                options={([
                  { value: 'pass',   label: LA_VERDICT_LABELS.pass,   type: 'success' },
                  { value: 'repair', label: LA_VERDICT_LABELS.repair,  type: 'warning' },
                  { value: 'fail',   label: LA_VERDICT_LABELS.fail,    type: 'danger'  },
                ] as VerdictOption[])}
                value={inspection.verdict}
                onChange={v => update('verdict', v as LAVerdict)}
                note={inspection.verdictComment}
                onNoteChange={v => update('verdictComment', v)}
                notePlaceholder="კომენტარი"
              />
            </KeyboardAwareScrollView>
          )}

        </WizardStepTransition>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          {step === CONCLUSION_STEP ? (
            <Button
              title="შენახვა და დასრულება"
              style={{ paddingVertical: 14 }}
              iconRight={<Ionicons name="checkmark" size={20} color={theme.colors.white} />}
              loading={completing}
              disabled={!canGoNext || completing}
              onPress={handleNext}
            />
          ) : (
            <Button
              title="შემდეგი"
              style={{ paddingVertical: 14 }}
              iconRight={<Ionicons name="chevron-forward" size={20} color={theme.colors.white} />}
              disabled={!canGoNext}
              onPress={handleNext}
            />
          )}
        </View>
      </View>

      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
      {celebrating && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <CelebrationBurst />
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: theme.colors.background },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: {
      textAlign: 'center', fontSize: 11,
      color: theme.colors.inkFaint, paddingVertical: 2,
    },
    stepBody: {
      flexGrow: 1, paddingHorizontal: 16,
      paddingTop: 12, paddingBottom: 24, gap: 12,
    },
    footer: {
      paddingHorizontal: 16, paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
    },
    twoCol:   { flexDirection: 'row', gap: 8 },
    colHalf:  { flex: 1, gap: 4 },
    fieldLabel: {
      fontSize: 12, fontWeight: '600',
      color: theme.colors.inkSoft, marginBottom: 4,
    },
    sectionLabel: {
      fontSize: 13, fontWeight: '700',
      color: theme.colors.ink, marginBottom: 4,
    },
    nextDateRow: { gap: 4, marginTop: 8 },
    suggestBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.colors.warnSoft ?? theme.colors.accentSoft,
      borderRadius: 10, padding: 10,
    },
    suggestText: { fontSize: 12, color: theme.colors.inkSoft, flex: 1 },
  });
}
