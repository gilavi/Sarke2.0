import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { Button } from '../../../components/ui';
import { DateTimeField } from '../../../components/DateTimeField';
import { WizardStepTransition } from '../../../components/wizard/WizardStepTransition';
import { FlowHeader } from '../../../components/FlowHeader';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { SectionHeader } from '../../../components/SectionHeader';
import {
  ChecklistItem,
  SignatureBlock,
  VerdictSelector,
  DynamicTable,
  PhotoSection,
  type VerdictOption,
  type DynamicTableColumn,
} from '../../../components/inspection';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fallProtectionApi } from '../../../lib/fallProtectionService';
import { projectsApi } from '../../../lib/services';
import { buildFallProtectionPdfHtml } from '../../../lib/fallProtectionPdf';
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
  FP_CHECKLIST_ITEMS,
  FP_CHECKLIST_OPTIONS,
  FP_CHIP_TO_RESULT,
  FP_RESULT_TO_CHIP,
  FP_VERDICT_LABELS,
  FALL_PROTECTION_TEMPLATE_ID,
  computeFPTabState,
  computeFPVerdictSuggestion,
  renumberDevices,
  syncDeviceData,
  buildDefaultFPDeviceRow,
  type FallProtectionInspection,
  type FPDeviceRow,
  type FPDeviceData,
  type FPVerdict,
  type FPResult,
  type FPTabState,
} from '../../../types/fallProtection';

// ── Step constants ────────────────────────────────────────────────────────────

const REGISTRY_STEP = 0;
const DEVICES_STEP  = 1;
const TOTAL_STEPS   = 2;
const STEP_LABELS   = ['რეესტრი', 'მოწყობ.'];

// ── Device registry table columns ─────────────────────────────────────────────

const REGISTRY_COLS: DynamicTableColumn[] = [
  { key: 'id',       label: 'ID',                  type: 'readonly', width: 44 },
  { key: 'type',     label: 'ტიპი / სახეობა',      type: 'text' },
  { key: 'location', label: 'განთავს. ადგილი',      type: 'text' },
  { key: 'floor',    label: 'სართული',              type: 'text' },
  { key: 'purpose',  label: 'ვისთვის / რისთვის',   type: 'text' },
  { key: 'comment',  label: 'კომენტარი',            type: 'text' },
];

// ── Tab state color ────────────────────────────────────────────────────────────

function tabColor(state: FPTabState, theme: Theme): string {
  switch (state) {
    case 'done':    return theme.colors.semantic?.success ?? '#10B981';
    case 'problem': return theme.colors.danger;
    case 'warning': return theme.colors.warn;
    case 'active':  return theme.colors.accent;
    default:        return theme.colors.hairline;
  }
}

function tabBg(state: FPTabState, active: boolean, theme: Theme): string {
  if (!active) return theme.colors.card;
  switch (state) {
    case 'done':    return (theme.colors.semantic as any)?.successSoft ?? '#D1FAE5';
    case 'problem': return theme.colors.dangerSoft ?? theme.colors.dangerTint;
    case 'warning': return theme.colors.warnSoft ?? '#FEF3C7';
    case 'active':  return theme.colors.accentSoft;
    default:        return theme.colors.subtleSurface;
  }
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FallProtectionInspectionScreen() {
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

  const [inspection, setInspection] = useState<FallProtectionInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const [step, setStep] = useState(REGISTRY_STEP);
  const prevStepRef = useRef(REGISTRY_STEP);
  const [animateSteps, setAnimateSteps] = useState(false);
  const [activeDeviceIdx, setActiveDeviceIdx] = useState(0);
  const inspectionRef = useRef<FallProtectionInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  const persistKey = useMemo(() => `fall-protection-wizard:${id}:step`, [id]);

  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const insp = await fallProtectionApi.getById(id);
        if (cancelled) return;
        if (!insp) { router.back(); return; }

        let patched = insp;

        if (insp.status !== 'completed') {
          const saved = await AsyncStorage.getItem(persistKey);
          if (saved && !cancelled) {
            const s = parseInt(saved, 10);
            if (!isNaN(s) && s >= REGISTRY_STEP && s <= DEVICES_STEP) setStep(s);
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
              fallProtectionApi.patch(patched.id, {
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
    if (step >= REGISTRY_STEP && step <= DEVICES_STEP) {
      AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
    }
  }, [step, persistKey]);

  // ── Auto-save (debounced) ───────────────────────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((insp: FallProtectionInspection) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      fallProtectionApi.patch(insp.id, {
        company: insp.company,
        address: insp.address,
        inspectionDate: insp.inspectionDate,
        safetyLeaderName: insp.safetyLeaderName,
        safetyLeaderPhone: insp.safetyLeaderPhone,
        inspectionType: insp.inspectionType,
        nextInspectionDate: insp.nextInspectionDate,
        devices: insp.devices,
        deviceData: insp.deviceData,
      }).catch(e => {
        toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      }).finally(() => setSaving(false));
    }, 700);
  }, [toast]);

  const update = useCallback(<K extends keyof FallProtectionInspection>(
    key: K,
    value: FallProtectionInspection[K],
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Registry table ──────────────────────────────────────────────────────────

  const handleDevicesChange = useCallback((rawRows: Record<string, any>[]) => {
    setInspection(prev => {
      if (!prev) return prev;
      const numbered = renumberDevices(rawRows as FPDeviceRow[]);
      const deviceData = syncDeviceData(numbered, prev.deviceData);
      const next = { ...prev, devices: numbered, deviceData };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const buildDefaultRow = useCallback(() => {
    const insp = inspectionRef.current;
    const idx = insp ? insp.devices.length : 0;
    return buildDefaultFPDeviceRow(idx);
  }, []);

  // ── Per-device data mutations ────────────────────────────────────────────────

  const updateDeviceData = useCallback(
    (devIdx: number, updater: (d: FPDeviceData) => FPDeviceData) => {
      setInspection(prev => {
        if (!prev) return prev;
        const deviceData = prev.deviceData.map((d, i) =>
          i === devIdx ? updater(d) : d,
        );
        const next = { ...prev, deviceData };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const handleChecklistChange = useCallback(
    (devIdx: number, itemId: number, field: 'value' | 'comment', val: string | null) => {
      updateDeviceData(devIdx, data => {
        if (itemId === 0) {
          // custom item
          if (field === 'value') {
            const result: FPResult | null = val ? (FP_CHIP_TO_RESULT[val] ?? null) : null;
            return { ...data, customItem: { ...data.customItem, result } };
          }
          return { ...data, customItem: { ...data.customItem, comment: val } };
        }
        const items = data.items.map(i => {
          if (i.id !== itemId) return i;
          if (field === 'value') {
            const result: FPResult | null = val ? (FP_CHIP_TO_RESULT[val] ?? null) : null;
            return { ...i, result };
          }
          return { ...i, comment: val };
        });
        return { ...data, items };
      });
    },
    [updateDeviceData],
  );

  const handleVerdictChange = useCallback((devIdx: number, v: string) => {
    updateDeviceData(devIdx, data => ({
      ...data,
      verdict: v as FPVerdict,
    }));
  }, [updateDeviceData]);

  const handleVerdictCommentChange = useCallback((devIdx: number, v: string) => {
    updateDeviceData(devIdx, data => ({ ...data, verdictComment: v }));
  }, [updateDeviceData]);

  const handleSignChange = useCallback(
    (devIdx: number, _sigIdx: number, field: string, value: string) => {
      updateDeviceData(devIdx, data => ({
        ...data,
        signature: {
          ...data.signature,
          [field]: field === 'signature' ? (value || null) : value,
        },
      }));
    },
    [updateDeviceData],
  );

  const handleSign = useCallback(
    async (devIdx: number, _sigIdx: number, base64Png: string) => {
      const insp = inspectionRef.current;
      if (!insp) return;
      updateDeviceData(devIdx, data => ({
        ...data,
        signature: {
          ...data.signature,
          signature: base64Png,
          date: new Date().toISOString(),
        },
      }));
      // Immediate save for signatures
      try {
        const updated = inspectionRef.current;
        if (updated) {
          await fallProtectionApi.patch(updated.id, { deviceData: updated.deviceData });
        }
      } catch (e) {
        toast.error(friendlyError(e, 'ხელმოწერა ვერ შეინახა'));
      }
    },
    [updateDeviceData, toast],
  );

  // ── Photos ──────────────────────────────────────────────────────────────────

  const handleAddItemPhoto = useCallback(
    async (devIdx: number, itemId: number) => {
      const result = await pickPhotoWithAnnotation();
      if (!result) return;
      const insp = inspectionRef.current;
      if (!insp) return;
      try {
        const path = await fallProtectionApi.uploadPhoto(insp.id, devIdx, itemId, result.uri);
        updateDeviceData(devIdx, data => {
          if (itemId === 0) {
            return {
              ...data,
              customItem: {
                ...data.customItem,
                photo_paths: [...(data.customItem.photo_paths ?? []), path],
              },
            };
          }
          const items = data.items.map(i =>
            i.id === itemId
              ? { ...i, photo_paths: [...(i.photo_paths ?? []), path] }
              : i,
          );
          return { ...data, items };
        });
      } catch (e) {
        toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
      }
    },
    [pickPhotoWithAnnotation, updateDeviceData, toast],
  );

  const handleDeleteItemPhoto = useCallback(
    async (devIdx: number, itemId: number, path: string) => {
      try {
        await fallProtectionApi.deletePhoto(path);
      } catch (e) {
        toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხერხდა'));
        return;
      }
      updateDeviceData(devIdx, data => {
        if (itemId === 0) {
          return {
            ...data,
            customItem: {
              ...data.customItem,
              photo_paths: (data.customItem.photo_paths ?? []).filter(p => p !== path),
            },
          };
        }
        const items = data.items.map(i =>
          i.id === itemId
            ? { ...i, photo_paths: (i.photo_paths ?? []).filter(p => p !== path) }
            : i,
        );
        return { ...data, items };
      });
    },
    [updateDeviceData, toast],
  );

  const handleAddDevicePhoto = useCallback(
    async (devIdx: number) => {
      const result = await pickPhotoWithAnnotation();
      if (!result) return;
      const insp = inspectionRef.current;
      if (!insp) return;
      try {
        const path = await fallProtectionApi.uploadDevicePhoto(insp.id, devIdx, result.uri);
        updateDeviceData(devIdx, data => ({
          ...data,
          photoPaths: [...(data.photoPaths ?? []), path],
        }));
      } catch (e) {
        toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
      }
    },
    [pickPhotoWithAnnotation, updateDeviceData, toast],
  );

  const handleDeleteDevicePhoto = useCallback(
    async (devIdx: number, path: string) => {
      try {
        await fallProtectionApi.deletePhoto(path);
      } catch (e) {
        toast.error(friendlyError(e, 'ფოტოს წაშლა ვერ მოხერხდა'));
        return;
      }
      updateDeviceData(devIdx, data => ({
        ...data,
        photoPaths: (data.photoPaths ?? []).filter(p => p !== path),
      }));
    },
    [updateDeviceData, toast],
  );

  // ── Completion ──────────────────────────────────────────────────────────────

  const allDevicesDone = useMemo(() => {
    if (!inspection) return false;
    if (inspection.devices.length === 0) return false;
    return inspection.deviceData.every(d => d.verdict && d.signature.signature);
  }, [inspection]);

  const handleComplete = useCallback(async () => {
    if (!inspection) return;
    const missing: string[] = [];
    if (inspection.devices.length === 0) missing.push('მინიმუმ 1 მოწყობილობა');

    const incompleteDevices = inspection.deviceData
      .map((d, i) => (!d.verdict || !d.signature.signature ? inspection.devices[i]?.id : null))
      .filter(Boolean);
    if (incompleteDevices.length > 0) {
      missing.push(`დასკვნა/ხელმოწ.: ${incompleteDevices.join(', ')}`);
    }

    if (missing.length > 0) {
      Alert.alert('შეავსეთ სავალდებულო ველები', missing.map(m => `• ${m}`).join('\n'));
      return;
    }

    setCompleting(true);
    try {
      await fallProtectionApi.patch(inspection.id, {
        company: inspection.company,
        address: inspection.address,
        inspectionDate: inspection.inspectionDate,
        safetyLeaderName: inspection.safetyLeaderName,
        safetyLeaderPhone: inspection.safetyLeaderPhone,
        inspectionType: inspection.inspectionType,
        nextInspectionDate: inspection.nextInspectionDate,
        devices: inspection.devices,
        deviceData: inspection.deviceData,
      });
      await fallProtectionApi.complete(inspection.id);
      const completedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        inspection.id,
        completedAt,
        `${inspection.projectId}:${FALL_PROTECTION_TEMPLATE_ID}`,
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

  // ── PDF ─────────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    if (!inspection) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setGeneratingPdf(true);
    try {
      const html = await buildFallProtectionPdfHtml({
        inspection,
        projectName: projectName || 'პროექტი',
      });
      const pdfName = generatePdfName(
        projectName || 'project',
        'FallProtectionInspection',
        new Date(inspection.inspectionDate),
        inspection.id,
      );
      const uid = session.state.status === 'signedIn'
        ? session.state.session.user.id
        : undefined;
      await generateAndSharePdf(html, pdfName, undefined, uid, {
        title: 'დამჭერი მოწყობილობების შემოწმების აქტი',
        documentId: inspection.id,
        subject: 'შრომის უსაფრთხოება',
      });
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setPaywallVisible(true); return; }
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setGeneratingPdf(false);
    }
  }, [inspection, projectName, session.state, invalidatePdfUsage, toast, pdfUsage]);

  const buildPreview = useCallback(async () => {
    if (!inspection) return;
    setPreviewBusy(true);
    try {
      const html = await buildFallProtectionPdfHtml({
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
    if (inspection?.status === 'completed') void buildPreview();
  }, [inspection?.status]);

  useEffect(() => {
    return () => { if (celebrationTimer.current) clearTimeout(celebrationTimer.current); };
  }, []);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === REGISTRY_STEP) {
      return inspection.devices.length >= 1;
    }
    if (step === DEVICES_STEP) return allDevicesDone && !completing;
    return true;
  }, [step, inspection, allDevicesDone, completing]);

  const handleNext = useCallback(async () => {
    if (step === DEVICES_STEP) {
      await handleComplete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, handleComplete]);

  const handlePrev = useCallback(async () => {
    if (step === REGISTRY_STEP) {
      await AsyncStorage.removeItem(persistKey);
      router.back();
    } else {
      setStep(s => s - 1);
    }
  }, [step, persistKey, router]);

  // ── Loading & completed ─────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
    );
  }

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="დამჭერი მოწყობილობა"
        requiredSignerRoles={[]}
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        signedCount={0}
        totalSlots={0}
        attachmentCount={0}
        pdfLocked={pdfUsage?.isLocked}
        downloading={generatingPdf}
        paywallVisible={paywallVisible}
        onPaywallClose={() => setPaywallVisible(false)}
        onDownloadPdf={() => void handlePdf()}
        onSheetSaved={() => void buildPreview()}
      />
    );
  }

  // ── Device tab states ───────────────────────────────────────────────────────

  const tabStates = inspection.deviceData.map(d => computeFPTabState(d));
  const safeDeviceIdx = Math.min(activeDeviceIdx, inspection.devices.length - 1);
  const currentDevice = inspection.devices[safeDeviceIdx];
  const currentDeviceData = inspection.deviceData[safeDeviceIdx];

  const suggestedVerdict = currentDeviceData
    ? computeFPVerdictSuggestion(currentDeviceData)
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle="დამჭერი მოწყობილობა"
        project={projectName ? { name: projectName } : null}
        step={step + 1}
        totalSteps={TOTAL_STEPS}
        leading="back"
        trailing="close"
        onClose={() => router.back()}
        trailingElement={
          step > 0 ? (
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
          ) : null
        }
        onBack={handlePrev}
        backDisabled={false}
      />

      {saving && (
        <Text style={styles.savingHint}>შენახვა…</Text>
      )}

      {pdfUsage?.isLocked && (
        <PdfLockedBanner onSubscribe={() => setPaywallVisible(true)} />
      )}

      <View style={{ flex: 1 }}>
        <WizardStepTransition stepKey={step} direction={direction} animate={animateSteps}>

          {/* ── Step 0: Equipment Registry ──────────────────────────────────── */}
          {step === REGISTRY_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <View style={styles.twoCol}>
                <View style={styles.colHalf}>
                  <Text style={styles.fieldLabel}>შემოწმების თარიღი</Text>
                  <DateTimeField
                    label="შემოწმების თარიღი"
                    value={new Date(inspection.inspectionDate)}
                    onChange={d => update('inspectionDate', d.toISOString().slice(0, 10))}
                    mode="date"
                  />
                </View>
                <View style={styles.colHalf}>
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
              </View>

              <FloatingLabelInput
                label="უსაფრთხ. ხელმძღვ. სახელი"
                value={inspection.safetyLeaderName}
                onChangeText={v => update('safetyLeaderName', v)}
              />

              <FloatingLabelInput
                label="უსაფრთხ. ხელმძღვ. ტელეფონი"
                value={inspection.safetyLeaderPhone}
                onChangeText={v => update('safetyLeaderPhone', v)}
                keyboardType="phone-pad"
              />

              <View style={{ gap: 6 }}>
                <Text style={styles.fieldLabel}>შემოწმების სახე</Text>
                <View style={styles.chipRow}>
                  {(['primary', 'secondary'] as const).map(type => {
                    const label = type === 'primary' ? 'პირველადი' : 'განმეორებითი';
                    const active = inspection.inspectionType === type;
                    return (
                      <Pressable
                        key={type}
                        style={[styles.typeChip, active && styles.typeChipActive]}
                        onPress={() => { haptic.light(); update('inspectionType', type); }}
                        {...a11y(label, undefined, 'radio')}
                      >
                        <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <SectionHeader title="მოწყობილობების რეესტრი" />
                <DynamicTable
                  columns={REGISTRY_COLS}
                  rows={inspection.devices}
                  onChange={handleDevicesChange}
                  onBuildDefaultRow={buildDefaultRow}
                  minRows={1}
                />
              </View>
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 1: Device-by-device inspection ─────────────────────────── */}
          {step === DEVICES_STEP && inspection.devices.length > 0 && (
            <View style={{ flex: 1 }}>

              {/* Device tab strip */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabStrip}
                style={styles.tabStripWrap}
              >
                {inspection.devices.map((d, idx) => {
                  const state = tabStates[idx] ?? 'pending';
                  const isActive = idx === safeDeviceIdx;
                  return (
                    <Pressable
                      key={d.id}
                      style={[
                        styles.tab,
                        { borderColor: tabColor(state, theme) },
                        isActive && { backgroundColor: tabBg(state, true, theme) },
                      ]}
                      onPress={() => { haptic.light(); setActiveDeviceIdx(idx); }}
                      {...a11y(d.id, `${d.id} — ${d.type || 'მოწყობილობა'}`, 'tab')}
                    >
                      <View
                        style={[
                          styles.tabDot,
                          { backgroundColor: tabColor(state, theme) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.tabLabel,
                          isActive && { color: tabColor(state, theme), fontWeight: '800' },
                        ]}
                      >
                        {d.id}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Device details */}
              {currentDevice && currentDeviceData && (
                <KeyboardAwareScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 24,
                    gap: 8,
                  }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  showsVerticalScrollIndicator={false}
                  bottomOffset={120}
                >
                  {/* Device meta */}
                  {(currentDevice.type || currentDevice.location) && (
                    <Text style={styles.deviceMeta}>
                      {[currentDevice.type, currentDevice.location, currentDevice.floor]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  )}

                  {/* Checklist */}
                  <SectionHeader title="შემოწმების პარამეტრები" />
                  <View style={{ gap: 1 }}>
                    {FP_CHECKLIST_ITEMS.map(entry => {
                      const state = currentDeviceData.items.find(i => i.id === entry.id)
                        ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
                      return (
                        <ChecklistItem
                          key={entry.id}
                          id={entry.id}
                          label={entry.label}
                          type="four_state"
                          options={FP_CHECKLIST_OPTIONS}
                          value={state.result ? FP_RESULT_TO_CHIP[state.result] : null}
                          onChange={val =>
                            handleChecklistChange(safeDeviceIdx, entry.id, 'value', val)
                          }
                          comment={state.comment ?? undefined}
                          onCommentChange={text =>
                            handleChecklistChange(safeDeviceIdx, entry.id, 'comment', text || null)
                          }
                          photoPaths={state.photo_paths ?? []}
                          onAddPhoto={() => handleAddItemPhoto(safeDeviceIdx, entry.id)}
                          onDeletePhoto={path =>
                            handleDeleteItemPhoto(safeDeviceIdx, entry.id, path)
                          }
                        />
                      );
                    })}

                    {/* Custom item 13 */}
                    <View style={styles.customItemWrap}>
                      <FloatingLabelInput
                        label="სხვა (სახელი)"
                        value={currentDeviceData.customItem.label}
                        onChangeText={v =>
                          updateDeviceData(safeDeviceIdx, d => ({
                            ...d,
                            customItem: { ...d.customItem, label: v },
                          }))
                        }
                      />
                      <ChecklistItem
                        id={13}
                        label={currentDeviceData.customItem.label || 'სხვა'}
                        type="four_state"
                        options={FP_CHECKLIST_OPTIONS}
                        value={
                          currentDeviceData.customItem.result
                            ? FP_RESULT_TO_CHIP[currentDeviceData.customItem.result]
                            : null
                        }
                        onChange={val =>
                          handleChecklistChange(safeDeviceIdx, 0, 'value', val)
                        }
                        comment={currentDeviceData.customItem.comment ?? undefined}
                        onCommentChange={text =>
                          handleChecklistChange(safeDeviceIdx, 0, 'comment', text || null)
                        }
                        photoPaths={currentDeviceData.customItem.photo_paths ?? []}
                        onAddPhoto={() => handleAddItemPhoto(safeDeviceIdx, 0)}
                        onDeletePhoto={path =>
                          handleDeleteItemPhoto(safeDeviceIdx, 0, path)
                        }
                      />
                    </View>
                  </View>

                  {/* Verdict */}
                  <SectionHeader title="დასკვნა" />
                  {suggestedVerdict && currentDeviceData.verdict !== suggestedVerdict && (
                    <Pressable
                      style={styles.suggestBanner}
                      onPress={() => handleVerdictChange(safeDeviceIdx, suggestedVerdict)}
                    >
                      <Ionicons name="bulb-outline" size={16} color={theme.colors.warn} />
                      <Text style={styles.suggestText}>
                        შემოთავაზება: {FP_VERDICT_LABELS[suggestedVerdict]}
                      </Text>
                    </Pressable>
                  )}
                  <VerdictSelector
                    options={([
                      { value: 'safe',   label: FP_VERDICT_LABELS.safe,   type: 'success' },
                      { value: 'minor',  label: FP_VERDICT_LABELS.minor,  type: 'warning' },
                      { value: 'banned', label: FP_VERDICT_LABELS.banned, type: 'danger'  },
                    ] as VerdictOption[])}
                    value={currentDeviceData.verdict}
                    onChange={v => handleVerdictChange(safeDeviceIdx, v)}
                    note={currentDeviceData.verdictComment}
                    onNoteChange={v => handleVerdictCommentChange(safeDeviceIdx, v)}
                    notePlaceholder="კომენტარი"
                  />

                  {/* Signature */}
                  <SectionHeader title="ხელმოწერა" />
                  <SignatureBlock
                    signatories={[{
                      role: 'შემომწმებელი პირი',
                      name: currentDeviceData.signature.name,
                      position: currentDeviceData.signature.position,
                      signature: currentDeviceData.signature.signature,
                      date: currentDeviceData.signature.date,
                    }]}
                    onChange={(sigIdx, field, value) =>
                      handleSignChange(safeDeviceIdx, sigIdx, field, value)
                    }
                    onSign={(sigIdx, base64Png) =>
                      handleSign(safeDeviceIdx, sigIdx, base64Png)
                    }
                  />

                  {/* Device photos */}
                  <SectionHeader title={`${currentDevice.id} დამჭერი მოწყობილობის ფოტო`} />
                  <PhotoSection
                    photoPaths={currentDeviceData.photoPaths ?? []}
                    onAdd={() => handleAddDevicePhoto(safeDeviceIdx)}
                    onDelete={path => handleDeleteDevicePhoto(safeDeviceIdx, path)}
                  />
                </KeyboardAwareScrollView>
              )}
            </View>
          )}

        </WizardStepTransition>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          {step === DEVICES_STEP ? (
            <Button
              title="შემოწმება დასრულდა"
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
    twoCol:  { flexDirection: 'row', gap: 8 },
    colHalf: { flex: 1, gap: 4 },
    fieldLabel: {
      fontSize: 12, fontWeight: '600',
      color: theme.colors.inkSoft, marginBottom: 4,
    },
    chipRow: { flexDirection: 'row', gap: 8 },
    typeChip: {
      paddingHorizontal: 16, paddingVertical: 10,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    typeChipActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    typeChipText: { fontSize: 13, color: theme.colors.inkSoft },
    typeChipTextActive: { color: theme.colors.accent, fontWeight: '700' },
    // Device tabs
    tabStripWrap: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
      maxHeight: 52,
    },
    tabStrip: {
      flexDirection: 'row', paddingHorizontal: 12, gap: 6,
      alignItems: 'center', paddingVertical: 8,
    },
    tab: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    tabDot: {
      width: 7, height: 7, borderRadius: 3.5,
    },
    tabLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.inkSoft },
    deviceMeta: {
      fontSize: 11, color: theme.colors.inkSoft,
      paddingHorizontal: 2, marginBottom: 4,
    },
    customItemWrap: {
      gap: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.hairline,
      paddingTop: 8, marginTop: 4,
    },
    suggestBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: theme.colors.warnSoft ?? theme.colors.accentSoft,
      borderRadius: 10, padding: 10,
    },
    suggestText: { fontSize: 12, color: theme.colors.inkSoft, flex: 1 },
  });
}
