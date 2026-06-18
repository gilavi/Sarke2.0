import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, CircleX } from 'lucide-react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { PlateInput, type PlateInputHandle } from '../../../components/inputs/PlateInput';
import { SerialKeypad } from '../../../components/inputs/SerialKeypad';
import { Button } from '../../../components/ui';
import { ExcavatorMaintenanceItem } from '../../../components/excavator/ExcavatorMaintenanceItem';
import { InspectionShell, InspectionShellSkeleton, ChecklistStep, ConclusionStep } from '../../../components/inspection-steps';
import type { VerdictOption } from '../../../components/inspection-steps';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { useBottomSheet } from '../../../components/BottomSheet';
import { excavatorApi } from '../../../lib/excavatorService';
import { inspectionAttachmentsApi } from '../../../lib/services';
import { imageForDisplay } from '../../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../../lib/supabase';

import { excavatorSchema } from '../../../lib/inspection/schemas/excavator';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
import { useSubmitGuard } from '../../../hooks/useSubmitGuard';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SuggestionPills } from '../../../components/SuggestionPills';
import { useFieldHistory } from '../../../hooks/useFieldHistory';
import { usePhotoPicker } from '../../../hooks/usePhotoPicker';
import { useSession } from '../../../lib/session';
import { CelebrationBurst } from '../../../components/animations';
import {
  ENGINE_ITEMS,
  UNDERCARRIAGE_ITEMS,
  CABIN_ITEMS,
  SAFETY_ITEMS,
  MAINTENANCE_ITEMS,
  EXCAVATOR_VERDICT_LABEL,
  EXCAVATOR_MACHINE_SPECS,
  EXCAVATOR_TEMPLATE_ID,
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

// ── Step constants ────────────────────────────────────────────────────────────

const INFO_STEP       = 0;
const PLATE_STEP      = 1;
const SERIAL_STEP     = 2;
const CHECKLIST_STEP  = 3;
const CONCLUSION_STEP = 4;
const TOTAL_STEPS     = 5;

export default function ExcavatorInspectionScreen() {
  const { theme } = useTheme();
  const { pickPhotosWithAnnotation } = usePhotoPicker();
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

  const [attachmentCount, setAttachmentCount] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Enabled finish button + on-press field errors (see useSubmitGuard).
  const { attempted, markAttempted, reset: resetAttempted } = useSubmitGuard();

  // Plate-input step state (reuses SerialKeypad like bobcat)
  const plateRef = useRef<PlateInputHandle>(null);
  const [activeSlotKind, setActiveSlotKind] = useState<'letter' | 'digit'>('letter');

  // summaryPhotos are stored locally in AsyncStorage (excavator-specific)
  const summaryPhotosKey = useMemo(() => `excavator-wizard:${id}:summaryPhotos`, [id]);

  // ── Shared orchestration ──────────────────────────────────────────────────

  const {
    inspection, setInspection, inspectionRef,
    projectName,
    saving, loading, completing, celebrating, generatingPdf,
    previewHtml, previewBusy,
    step, setStep, direction, animateSteps,
    limitNoticeVisible, setLimitNoticeVisible, pdfLocked,
    update, scheduleSave,
    complete, handlePdf, buildPreview, exit, creatorName,
  } = useInspectionFlow<ExcavatorInspection>({
    id,
    firstStep: PLATE_STEP,
    lastStep: CONCLUSION_STEP,
    persistPrefix: 'excavator-wizard',
    templateId: EXCAVATOR_TEMPLATE_ID,
    schema: excavatorSchema,
    api: excavatorApi,
    toPatch: (insp) => ({
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
    }),
    validateMissing: (insp) => {
      const missing: string[] = [];
      if (!insp.serialNumber?.trim()) missing.push('სERIული ნომERი');
      if (!insp.verdict)              missing.push('დასკვნა');
      return missing;
    },
    autofill: (insp, { inspectorName, project }) => {
      let next = insp;
      const patch: Record<string, unknown> = {};
      if (!insp.inspectorName && inspectorName) {
        next = { ...next, inspectorName };
        patch.inspectorName = inspectorName;
      }
      if (project) {
        if (!next.projectName?.trim()) {
          const v = project.company_name || project.name;
          next = { ...next, projectName: v };
          patch.projectName = v;
        }
      }
      return { next, patch: Object.keys(patch).length ? patch : null };
    },
    pdf: {
      nameLabel: 'ExcavatorInspection',
      title: 'ექსკავატორის შემოწმების აქტი',
      subject: 'შრომის უსაფრთხოების შემოწმება',
    },
    loadingTitle: 'ექსკავატორის შემოწმება',
  });

  // ── Load summaryPhotos from AsyncStorage after inspection loads ───────────

  useEffect(() => {
    if (!inspection || inspection.summaryPhotos?.length) return;
    AsyncStorage.getItem(summaryPhotosKey).then(saved => {
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setInspection(prev => prev ? { ...prev, summaryPhotos: parsed } : prev);
        }
      } catch {}
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryPhotosKey, !!inspection]);

  // ── Load attachment count when completed ──────────────────────────────────

  useEffect(() => {
    if (inspection?.status !== 'completed') return;
    inspectionAttachmentsApi.listByInspection(inspection.id)
      .then(a => setAttachmentCount(a.length)).catch(() => {});
  }, [inspection?.status, inspection?.id]);

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
  }, [scheduleSave, setInspection]);

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
  }, [scheduleSave, setInspection]);

  // ── Photo handling ─────────────────────────────────────────────────────────

  const handleAddPhoto = useCallback(async (section: Section, itemId: number) => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
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
    }
  }, [pickPhotosWithAnnotation, scheduleSave, toast, inspectionRef, setInspection]);

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
  }, [scheduleSave, toast, setInspection]);

  // ── Summary Photos ─────────────────────────────────────────────────────────

  const handleAddSummaryPhoto = useCallback(async () => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
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
    }
  }, [pickPhotosWithAnnotation, toast, inspectionRef, setInspection, summaryPhotosKey]);

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
  }, [summaryPhotosKey, toast, setInspection]);

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

  // ── Step navigation ────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === INFO_STEP)       return true;
    if (step === PLATE_STEP)      return true;
    if (step === SERIAL_STEP)     return !!inspection.serialNumber?.trim();
    if (step === CHECKLIST_STEP)  return flatState.every(s => s.result !== null);
    if (step === CONCLUSION_STEP) return !!inspection.verdict && !completing;
    return false;
  }, [step, inspection, flatState, completing]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      await complete();
    } else if (step < CONCLUSION_STEP) {
      setStep(s => s + 1);
    }
  }, [step, complete, setStep]);

  const handlePrev = useCallback(async () => {
    if (step === PLATE_STEP) {
      await exit();
    } else {
      setStep(s => s - 1);
    }
  }, [step, exit, setStep]);

  // Clear the "attempted" error reveal whenever the step changes.
  useEffect(() => { resetAttempted(); }, [step, resetAttempted]);

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
      <InspectionShellSkeleton
        title="ექსკავატორი"
        projectName={projectName ?? ''}
        step={step - 1}
        totalSteps={TOTAL_STEPS - 1}
        variant={
          step === PLATE_STEP ? 'keypad'
            : step === CHECKLIST_STEP ? 'checklist'
            : step === CONCLUSION_STEP ? 'conclusion'
            : 'form'
        }
        fields={1}
        onClose={() => router.back()}
      />
    );
  }

  // ── Completed inspection result view ───────────────────────────────────────
  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="ექსკავატორი"
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        attachmentCount={attachmentCount}
        pdfLocked={pdfLocked}
        downloading={generatingPdf}
        limitNoticeVisible={limitNoticeVisible}
        onLimitNoticeClose={() => setLimitNoticeVisible(false)}
        creatorName={creatorName}
        onDownloadPdf={(sig) => void handlePdf(sig)}
        onSheetSaved={() => {
          inspectionAttachmentsApi.listByInspection(inspection.id)
            .then(a => setAttachmentCount(a.length)).catch(() => {});
          void buildPreview();
        }}
      />
    );
  }

  return (
    <>
      <InspectionShell
        title="ექსკავატორი"
        projectName={projectName}
        step={step - 1}
        totalSteps={TOTAL_STEPS - 1}
        direction={direction}
        animate={animateSteps}
        canGoNext={canGoNext}
        isLastStep={step === CONCLUSION_STEP}
        completing={completing}
        onBlockedNext={markAttempted}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={() => router.back()}
      >
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
            verdictError={attempted && !inspection.verdict}
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
      </InspectionShell>

      {pdfLocked && <PdfLockedBanner onDetails={() => setLimitNoticeVisible(true)} />}
      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
      {celebrating && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <CelebrationBurst />
        </View>
      )}
    </>
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
        <Camera size={20} color={theme.colors.inkSoft} strokeWidth={1.5} />
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
        <CircleX size={18} color={theme.colors.white} strokeWidth={2} />
      </Pressable>
    </View>
  );
});

// ── Styles ───────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: theme.colors.background },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 24, paddingTop: 4 },
    stepBody: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, gap: 12 },
    footer: {
      gap: 10,
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 16,
      backgroundColor: theme.colors.card,
    },

    fieldRow:   { marginBottom: 4, gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

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
  });
}
