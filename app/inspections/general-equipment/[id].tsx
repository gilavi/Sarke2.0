import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../../components/DateTimeField';
import { InspectionShell, ChecklistStep, ConclusionStep, ProjectPickerStep } from '../../../components/inspections';
import type { VerdictOption, ChecklistResult } from '../../../components/inspections';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { generalEquipmentApi } from '../../../lib/generalEquipmentService';
import { projectsApi, signaturesApi, inspectionAttachmentsApi } from '../../../lib/services';
import { signatureAsDataUrl, imageForDisplay } from '../../../lib/imageUrl';
import type { SignatureRecord } from '../../../types/models';
import { buildGeneralEquipmentPdfHtml } from '../../../lib/generalEquipmentPdf';
import { generateAndSharePdf, PdfLimitReachedError } from '../../../lib/pdfOpen';
import { PaywallModal } from '../../../components/PaywallModal';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { usePdfUsage, useInvalidatePdfUsage } from '../../../lib/usePdfUsage';
import { generatePdfName } from '../../../lib/pdfName';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SuggestionPills } from '../../../components/SuggestionPills';
import { useFieldHistory } from '../../../hooks/useFieldHistory';
import { usePhotoWithLocation } from '../../../hooks/usePhotoWithLocation';
import {
  buildDefaultEquipmentRow,
  INSPECTION_TYPE_LABEL,
  type GeneralEquipmentInspection,
  type EquipmentItem,
  type GEInspectionType,
} from '../../../types/generalEquipment';

const INFO_STEP       = 0;
const DETAILS_STEP    = 1;
const CHECKLIST_STEP  = 2;
const CONCLUSION_STEP = 3;
const DONE_STEP       = 4;
const TOTAL_STEPS     = 4;
const STEP_LABELS     = ['პროექტი', 'ინფო', 'შემოწ.', 'დასკვნა'];

export default function GeneralEquipmentScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { pickPhotoWithAnnotation } = usePhotoWithLocation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();

  const userId = session?.state?.status === 'signedIn' ? session.state.session.user.id : null;

  // ── Field suggestion histories ────────────────────────────────────────────
  const objectNameHistory = useFieldHistory(userId, 'ge:objectName');
  const activityTypeHistory = useFieldHistory(userId, 'ge:activityType');
  const actNumberHistory = useFieldHistory(userId, 'ge:actNumber');
  const conclusionHistory = useFieldHistory(userId, 'ge:conclusion');
  const signerNameHistory = useFieldHistory(userId, 'ge:signerName');

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [inspection, setInspection] = useState<GeneralEquipmentInspection | null>(null);
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
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [attachmentCount, setAttachmentCount] = useState(0);

  const [step, setStep] = useState(0);
  const prevStepRef = useRef(0);
  const [animateSteps, setAnimateSteps] = useState(false);
  const inspectionRef = useRef<GeneralEquipmentInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  const persistKey = useMemo(() => `ge-wizard:${id}:step`, [id]);

  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // ── Load ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const insp = await generalEquipmentApi.getById(id);
        if (cancelled) return;
        if (!insp) { router.back(); return; }

        let patched = insp;
        if (session.state.status === 'signedIn') {
          const u = session.state.user;
          const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
          if (name && !insp.inspectorName) patched = { ...patched, inspectorName: name };
          if (name && !insp.signerName)    patched = { ...patched, signerName: name };
        }
        setInspection(patched);

        const saved = await AsyncStorage.getItem(persistKey);
        if (saved && !cancelled) {
          const s = parseInt(saved, 10);
          if (!isNaN(s) && s >= INFO_STEP && s <= CONCLUSION_STEP) setStep(s);
        }

        projectsApi.getById(insp.projectId).then(p => {
          if (cancelled || !p) return;
          setProjectName(p.company_name || p.name);
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
    if (step >= 0 && step <= 2) {
      AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
    }
  }, [step, persistKey]);

  // Clear pending auto-save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // ── Auto-save ────────────────────────────────────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((insp: GeneralEquipmentInspection) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      generalEquipmentApi.patch(insp.id, {
        objectName:         insp.objectName,
        address:            insp.address,
        activityType:       insp.activityType,
        inspectionDate:     insp.inspectionDate,
        actNumber:          insp.actNumber,
        inspectionType:     insp.inspectionType,
        inspectorName:      insp.inspectorName,
        equipment:          insp.equipment,
        conclusion:         insp.conclusion,
        summaryPhotos:      insp.summaryPhotos,
        signerName:         insp.signerName,
        signerRole:         insp.signerRole,
        signerRoleCustom:   insp.signerRoleCustom,
        inspectorSignature: insp.inspectorSignature,
      }).catch(e => {
        toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      }).finally(() => setSaving(false));
    }, 700);
  }, [toast]);

  const update = useCallback(<K extends keyof GeneralEquipmentInspection>(
    key: K,
    value: GeneralEquipmentInspection[K],
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Equipment row updates ────────────────────────────────────────────────────

  const updateCondition = useCallback((index: number, condition: EquipmentItem['condition']) => {
    setInspection(prev => {
      if (!prev) return prev;
      const equipment = prev.equipment.map((r, i) =>
        i === index ? { ...r, condition } : r,
      );
      const next = { ...prev, equipment };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const addEquipmentRow = useCallback(() => {
    setInspection(prev => {
      if (!prev) return prev;
      const equipment = [...prev.equipment, buildDefaultEquipmentRow()];
      const next = { ...prev, equipment };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Photo handling — summary ─────────────────────────────────────────────────

  const handleAddSummaryPhoto = useCallback(async () => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await generalEquipmentApi.uploadPhoto(insp.id, 'summary', 'summary', result.uri);
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
      await generalEquipmentApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხერხდა'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, summaryPhotos: prev.summaryPhotos.filter(p => p !== path) };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, toast]);

  // ── Load signatures/attachments when completed ────────────────────────────

  useEffect(() => {
    if (inspection?.status !== 'completed') return;
    signaturesApi.list(inspection.id).then(setSignatures).catch(() => {});
    inspectionAttachmentsApi.listByInspection(inspection.id)
      .then(a => setAttachmentCount(a.length)).catch(() => {});
  }, [inspection?.status, inspection?.id]);

  // ── Complete ─────────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!inspection || completing) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const missing: string[] = [];
    if (!inspection.objectName?.trim())    missing.push('ობიექტის დასახელება');
    if (!inspection.conclusion?.trim())    missing.push('დასკვნა');

    const hasFilledRow = inspection.equipment.some(r => r.name.trim());
    if (!hasFilledRow)                     missing.push('მინიმუმ 1 აღჭ. სტრ.');
    // Validate notes on degraded equipment rows
    const degradedWithoutNote = inspection.equipment.filter(
      r => (r.condition === 'needs_service' || r.condition === 'unusable') && !r.note?.trim(),
    );
    if (degradedWithoutNote.length > 0) {
      missing.push(`შენიშვნა საჭიროა ${degradedWithoutNote.length} აღჭურვილობაზე`);
    }
    if (missing.length > 0) {
      Alert.alert('შეავსეთ სავალდებულო ველები', missing.map(m => `• ${m}`).join('\n'));
      return;
    }
    setCompleting(true);
    try {
      await generalEquipmentApi.patch(inspection.id, {
        objectName:         inspection.objectName,
        address:            inspection.address,
        activityType:       inspection.activityType,
        inspectionDate:     inspection.inspectionDate,
        actNumber:          inspection.actNumber,
        inspectionType:     inspection.inspectionType,
        inspectorName:      inspection.inspectorName,
        equipment:          inspection.equipment,
        conclusion:         inspection.conclusion,
        summaryPhotos:      inspection.summaryPhotos,
        signerName:         inspection.signerName,
        signerRole:         inspection.signerRole,
        signerRoleCustom:   inspection.signerRoleCustom,
        inspectorSignature: inspection.inspectorSignature,
      });
      await generalEquipmentApi.complete(inspection.id);
      const completedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        inspection.id,
        completedAt,
        `${inspection.projectId}:general_equipment`,
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

  // ── PDF ──────────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    if (!inspection) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setGeneratingPdf(true);
    try {
      const html = await buildGeneralEquipmentPdfHtml({
        inspection,
        projectName: projectName || 'პროექტი',
      });
      const pdfName = generatePdfName(
        projectName || 'project',
        'EquipmentInspection',
        new Date(inspection.inspectionDate),
        inspection.id,
      );
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, userId, {
        title: 'ზოგადი აღჭურვილობის შემოწმება',
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

  // ── PDF Preview ──────────────────────────────────────────────────────────────

  const buildPreview = useCallback(async (sigs: SignatureRecord[] = signatures) => {
    if (!inspection) return;
    setPreviewBusy(true);
    try {
      const sigsEmbedded = await Promise.all(
        sigs.map(async sig => {
          if (!sig.signature_png_url || sig.signature_png_url.startsWith('data:')) return sig;
          const dataUrl = await signatureAsDataUrl(STORAGE_BUCKETS.signatures, sig.signature_png_url)
            .catch(() => sig.signature_png_url ?? '');
          return { ...sig, signature_png_url: dataUrl };
        }),
      );
      const html = await buildGeneralEquipmentPdfHtml({
        inspection,
        projectName: projectName || 'პროექტი',
        signatures: sigsEmbedded,
      });
      setPreviewHtml(html);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setPreviewBusy(false);
    }
  }, [inspection, projectName, signatures, toast]);

  useEffect(() => {
    if (inspection?.status === 'completed') {
      void buildPreview();
    }
  }, [inspection?.status, buildPreview]);

  // ── Step navigation ──────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection || step >= TOTAL_STEPS) return false;
    if (step === INFO_STEP) return true;
    if (step === DETAILS_STEP) return !!inspection.objectName?.trim();
    if (step === CHECKLIST_STEP) {
      return inspection.equipment.length > 0 && inspection.equipment.every(r => !!r.condition);
    }
    if (step === CONCLUSION_STEP) return !!inspection.conclusion?.trim() && !completing;
    return true;
  }, [step, inspection, completing, DETAILS_STEP, CONCLUSION_STEP]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      await handleComplete();
      router.push(`/inspections/general-equipment/${id}/done` as any);
    } else if (step < CONCLUSION_STEP) {
      setStep(s => s + 1);
    }
  }, [step, CONCLUSION_STEP, handleComplete, id, router]);

  const handlePrev = useCallback(() => {
    if (step > 0) {
      setStep(s => s - 1);
    } else {
      router.back();
    }
  }, [step, router]);

  // ── Shared component data ────────────────────────────────────────────────────

  const checklistItems = useMemo(() =>
    (inspection?.equipment ?? []).map(item => ({
      id: item.id,
      description: [item.name, item.model, item.serialNumber].filter(Boolean).join(' · ') || '—',
    })),
  [inspection?.equipment]);

  const checklistStates = useMemo(() =>
    (inspection?.equipment ?? []).map(item => ({
      id: item.id,
      result: (item.condition === 'needs_service' ? 'deficient' : item.condition) as ChecklistResult,
      comment: item.note,
      photo_paths: item.photo_paths,
    })),
  [inspection?.equipment]);

  const verdictOptions = useMemo<VerdictOption[]>(() => [], []);

  const handleChecklistStateChange = useCallback((id: string, patch: { result?: ChecklistResult }) => {
    if (patch.result === undefined) return;
    const conditionMap: Record<string, EquipmentItem['condition']> = {
      good: 'good',
      deficient: 'needs_service',
      unusable: 'unusable',
    };
    const newCondition = patch.result !== null ? (conditionMap[patch.result] ?? null) : null;
    setInspection(prev => {
      if (!prev) return prev;
      const equipment = prev.equipment.map(r =>
        r.id === id ? { ...r, condition: newCondition } : r,
      );
      const next = { ...prev, equipment };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Render helpers ───────────────────────────────────────────────────────────

  const filledCount = inspection?.equipment.filter(r => r.name.trim()).length ?? 0;
  const totalCount = inspection?.equipment.length ?? 0;

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
    );
  }

  // ── Completed inspection result view ─────────────────────────────────────────
  if (inspection.status === 'completed') {
    const signedCount = signatures.filter(s => s.status === 'signed' && !!s.signature_png_url).length;
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="ტექ. აღჭურვილობა"
        requiredSignerRoles={[]}
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        signedCount={signedCount}
        totalSlots={signatures.length}
        attachmentCount={attachmentCount}
        pdfLocked={pdfUsage?.isLocked}
        downloading={generatingPdf}
        paywallVisible={paywallVisible}
        onPaywallClose={() => setPaywallVisible(false)}
        onDownloadPdf={() => void handlePdf()}
        onSheetSaved={() => {
          signaturesApi.list(inspection.id).then(sigs => {
            setSignatures(sigs);
            void buildPreview(sigs);
          }).catch(() => {});
          inspectionAttachmentsApi.listByInspection(inspection.id)
            .then(a => setAttachmentCount(a.length)).catch(() => {});
        }}
      />
    );
  }

  return (
    <InspectionShell
      title="ტექ. აღჭ."
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
      onPrev={step === INFO_STEP ? async () => { await AsyncStorage.removeItem(persistKey); router.back(); } : handlePrev}
      onClose={() => router.back()}
      onPdf={handlePdf}
    >
      {/* ── Step 0: Project picker ─────────────────────────────────────── */}
      {step === INFO_STEP && (
        <ProjectPickerStep
          selectedId={inspection.projectId}
          onSelect={p => {
            setProjectName(p.company_name || p.name);
            setInspection(prev => prev ? {
              ...prev,
              projectId: p.id,
              address: p.address ?? prev.address,
            } : prev);
          }}
        />
      )}

      {/* ── Step 1: Inspection details ─────────────────────────────────── */}
      {step === DETAILS_STEP && (
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bottomOffset={120}
        >
          <FloatingLabelInput
            label="ობიექტის დასახელება *"
            value={inspection.objectName ?? ''}
            onChangeText={v => update('objectName', v || null)}
            onFocus={() => setFocusedField('objectName')}
            onBlur={() => {
              setFocusedField(null);
              if (inspection.objectName?.trim()) objectNameHistory.addToHistory(inspection.objectName.trim());
            }}
            required
          />
          <SuggestionPills
            suggestions={objectNameHistory.suggestions}
            onSelect={v => update('objectName', v)}
            visible={focusedField === 'objectName' || (!inspection.objectName?.trim() && objectNameHistory.suggestions.length > 0)}
          />

          <FloatingLabelInput
            label="საქმიანობის სახე"
            value={inspection.activityType ?? ''}
            onChangeText={v => update('activityType', v || null)}
            onFocus={() => setFocusedField('activityType')}
            onBlur={() => {
              setFocusedField(null);
              if (inspection.activityType?.trim()) activityTypeHistory.addToHistory(inspection.activityType.trim());
            }}
          />
          <SuggestionPills
            suggestions={activityTypeHistory.suggestions}
            onSelect={v => update('activityType', v)}
            visible={focusedField === 'activityType' || (!inspection.activityType?.trim() && activityTypeHistory.suggestions.length > 0)}
          />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>შემოწმების თარიღი</Text>
            <DateTimeField
              mode="date"
              value={new Date(inspection.inspectionDate)}
              onChange={d => update('inspectionDate', d.toLocaleDateString('en-CA'))}
              maxDate={new Date()}
            />
          </View>

          <FloatingLabelInput
            label="აქტის №"
            value={inspection.actNumber ?? ''}
            onChangeText={v => update('actNumber', v || null)}
            onFocus={() => setFocusedField('actNumber')}
            onBlur={() => {
              setFocusedField(null);
              if (inspection.actNumber?.trim()) actNumberHistory.addToHistory(inspection.actNumber.trim());
            }}
          />
          <SuggestionPills
            suggestions={actNumberHistory.suggestions}
            onSelect={v => update('actNumber', v)}
            visible={focusedField === 'actNumber' || (!inspection.actNumber?.trim() && actNumberHistory.suggestions.length > 0)}
          />

          <Text style={styles.fieldLabel}>შემოწმების სახე</Text>
          <View style={styles.typeChips}>
            {(['initial', 'repeat', 'scheduled'] as GEInspectionType[]).map(t => {
              const active = inspection.inspectionType === t;
              return (
                <Pressable
                  key={t}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => update('inspectionType', active ? null : t)}
                  {...a11y(INSPECTION_TYPE_LABEL[t], undefined, 'radio')}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                    {INSPECTION_TYPE_LABEL[t]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </KeyboardAwareScrollView>
      )}

      {/* ── Step 2: Equipment list ─────────────────────────────────────── */}
      {step === CHECKLIST_STEP && (
        <ChecklistStep
          items={checklistItems}
          states={checklistStates}
          onStateChange={handleChecklistStateChange}
          showSectionHeaders={false}
          showCommentButton={false}
          footer={
            <View style={{ paddingHorizontal: 8, paddingTop: 4 }}>
              <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                <View style={styles.progressPill}>
                  <Text style={styles.progressPillText}>
                    შევსებულია {filledCount} / {totalCount}
                  </Text>
                </View>
              </View>
              <Pressable
                style={styles.addRowBtn}
                onPress={addEquipmentRow}
                {...a11y('აღჭ. დამატება', '+ აღჭურვილობის სტრიქონის დამატება', 'button')}
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.accent} />
                <Text style={styles.addRowText}>+ აღჭურვილობის დამატება</Text>
              </Pressable>
              {filledCount === 0 && (
                <View style={styles.emptyHint}>
                  <Ionicons name="information-circle-outline" size={18} color={theme.colors.inkFaint} />
                  <Text style={styles.emptyHintText}>
                    შეავსეთ მინიმუმ ერთი აღჭურვილობის სტრიქონი
                  </Text>
                </View>
              )}
            </View>
          }
        />
      )}

      {/* ── Step 2: Conclusion ─────────────────────────────────────────── */}
      {step === CONCLUSION_STEP && (
        <ConclusionStep
          verdict={null}
          verdictOptions={verdictOptions}
          onVerdictChange={() => {}}
          notes={inspection.conclusion ?? ''}
          onNotesChange={v => {
            update('conclusion', v || null);
            if (v.trim()) conclusionHistory.addToHistory(v.trim());
          }}
          conclusionHistory={conclusionHistory.suggestions}
          onConclusionChange={v => update('conclusion', v || null)}
          photoSection={
            <View>
              <Text style={styles.fieldLabel}>ფოტოები (სურვ.)</Text>
              <SummaryPhotoStrip
                paths={inspection.summaryPhotos}
                onAdd={handleAddSummaryPhoto}
                onDelete={handleDeleteSummaryPhoto}
                styles={styles}
              />
            </View>
          }
          completing={completing}
        />
      )}
    </InspectionShell>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

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
        {...a11y('ფოტოს დამატება', 'ფოტოს გადაღება ან ბიბლიოთეკიდან', 'button')}
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
      <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" />
      <Pressable style={styles.thumbDelete} onPress={onDelete} hitSlop={8} {...a11y('ფოტოს წაშლა', undefined, 'button')}>
        <Ionicons name="close-circle" size={18} color={theme.colors.white} />
      </Pressable>
    </View>
  );
});

// ── Styles ───────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: theme.colors.background },
    footer: {
      gap: 10,
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 16,
      backgroundColor: theme.colors.card,
    },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 8, paddingTop: 4 },
    stepBody: { paddingHorizontal: 8, paddingTop: 16, paddingBottom: 16, gap: 12 },

    fieldRow:   { marginBottom: 4, gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft, marginBottom: 6 },

    typeChips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    typeChip: {
      paddingHorizontal: 12, paddingVertical: 16,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    typeChipActive:     { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
    typeChipText:       { fontSize: 13, color: theme.colors.inkSoft, fontWeight: '500' },
    typeChipTextActive: { color: theme.colors.accent, fontWeight: '700' },


    progressPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.colors.subtleSurface,
      borderWidth: 1,
      borderColor: theme.colors.hairline,
    },
    progressPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.inkSoft,
    },
    addRowBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 14, paddingHorizontal: 12,
      borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed',
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
      marginTop: 4,
    },
    addRowText: { fontSize: 14, fontWeight: '600', color: theme.colors.accent },

    emptyHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.warn,
      marginTop: 8,
    },
    emptyHintText: {
      fontSize: 13,
      color: theme.colors.inkSoft,
      flex: 1,
    },

    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
      marginBottom: 4,
    },
    listRowText: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 8,
    },
    listRowNumber: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.inkSoft,
      minWidth: 24,
    },
    listRowLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.ink,
    },
    listRowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusBtn: {
      width: 44,
      height: 44,
      borderRadius: 8,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusBtnGood: {
      borderColor: theme.colors.semantic.success,
    },
    statusBtnGoodActive: {
      backgroundColor: theme.colors.semantic.success,
      borderColor: theme.colors.semantic.success,
    },
    statusBtnDef: {
      borderColor: theme.colors.warn,
    },
    statusBtnDefActive: {
      backgroundColor: theme.colors.warn,
      borderColor: theme.colors.warn,
    },
    statusBtnBad: {
      borderColor: theme.colors.danger,
    },
    statusBtnBadActive: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
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
    doneTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.ink },
    doneDate:  { fontSize: 13, color: theme.colors.inkSoft, marginTop: 4, marginBottom: 12 },
    completingRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
    completingText:   { fontSize: 13, color: theme.colors.inkSoft },
  });
}
