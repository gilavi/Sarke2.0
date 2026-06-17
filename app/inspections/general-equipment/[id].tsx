import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CirclePlus, Info, Camera, CircleX, Check, X, TriangleAlert } from 'lucide-react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { IdentificationGrid } from '../../../components/inspection-parts/IdentificationGrid';
import { InspectionShell, InspectionShellSkeleton, ConclusionStep } from '../../../components/inspection-steps';
import type { VerdictOption } from '../../../components/inspection-steps';
import { ChecklistItemRow, ChecklistLegend } from '../../../components/inspection-parts';
import type { ChecklistRowOption } from '../../../components/inspection-parts';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { generalEquipmentApi } from '../../../lib/generalEquipmentService';
import { inspectionAttachmentsApi } from '../../../lib/services';
import { imageForDisplay } from '../../../lib/imageUrl';
import { generalEquipmentSchema } from '../../../lib/inspection/schemas/generalEquipment';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFieldHistory } from '../../../hooks/useFieldHistory';
import { usePhotoPicker } from '../../../hooks/usePhotoPicker';
import { CelebrationBurst } from '../../../components/animations';
import {
  buildDefaultEquipmentRow,
  GENERAL_EQUIPMENT_TEMPLATE_ID,
  INSPECTION_TYPE_LABEL,
  type GeneralEquipmentInspection,
  type EquipmentItem,
  type GEInspectionType,
} from '../../../types/generalEquipment';
import { useSession } from '../../../lib/session';

const INFO_STEP       = 0;
const DETAILS_STEP    = 1;
const CHECKLIST_STEP  = 2;
const CONCLUSION_STEP = 3;
const TOTAL_STEPS     = 4;

const GE_OPTIONS: ChecklistRowOption[] = [
  { value: 'good',      icon: Check,         a11yLabel: 'ვარგისია' },
  { value: 'deficient', icon: TriangleAlert, a11yLabel: 'ხარვეზი' },
  { value: 'unusable',  icon: X,             a11yLabel: 'გამოუსადეგარია' },
];

const GE_LEGEND = [
  { icon: Check,         label: 'ვარგისია' },
  { icon: TriangleAlert, label: 'ხარვეზი' },
  { icon: X,             label: 'გამოუსადეგარია' },
];

export default function GeneralEquipmentScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { pickPhotosWithAnnotation } = usePhotoPicker();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();

  const userId = session?.state?.status === 'signedIn' ? session.state.session.user.id : null;

  // ── Field suggestion histories ────────────────────────────────────────────
  const conclusionHistory  = useFieldHistory(userId, 'ge:conclusion');

  const [attachmentCount, setAttachmentCount] = useState(0);

  // ── Shared orchestration ──────────────────────────────────────────────────
  const {
    inspection, setInspection, inspectionRef,
    projectName,
    loading, completing, celebrating, generatingPdf,
    previewHtml, previewBusy,
    step, setStep, direction, animateSteps,
    limitNoticeVisible, setLimitNoticeVisible, pdfLocked,
    update, scheduleSave,
    complete, handlePdf, buildPreview, exit, creatorName,
  } = useInspectionFlow<GeneralEquipmentInspection>({
    id,
    firstStep: DETAILS_STEP,
    lastStep: CONCLUSION_STEP,
    persistPrefix: 'ge-wizard',
    templateId: GENERAL_EQUIPMENT_TEMPLATE_ID,
    schema: generalEquipmentSchema,
    api: generalEquipmentApi,
    toPatch: (insp) => ({
      objectName:     insp.objectName,
      address:        insp.address,
      activityType:   insp.activityType,
      inspectionDate: insp.inspectionDate,
      actNumber:      insp.actNumber,
      inspectionType: insp.inspectionType,
      inspectorName:  insp.inspectorName,
      equipment:      insp.equipment,
      conclusion:     insp.conclusion,
      summaryPhotos:  insp.summaryPhotos,
    }),
    validateMissing: (insp) => {
      const missing: string[] = [];
      if (!insp.objectName?.trim())  missing.push('ობიექტის დასახელება');
      if (!insp.conclusion?.trim())  missing.push('დასკვნა');
      const hasFilledRow = insp.equipment.some(r => r.name.trim());
      if (!hasFilledRow)             missing.push('მინიმუმ 1 აღჭ. სტრ.');
      const degradedWithoutNote = insp.equipment.filter(
        r => (r.condition === 'needs_service' || r.condition === 'unusable') && !r.note?.trim(),
      );
      if (degradedWithoutNote.length > 0) {
        missing.push(`შენიშვნა საჭიროა ${degradedWithoutNote.length} აღჭურვილობაზე`);
      }
      return missing;
    },
    autofill: (insp, { inspectorName, project }) => {
      let next = insp;
      const patch: Record<string, unknown> = {};
      if (inspectorName) {
        if (!insp.inspectorName) {
          next = { ...next, inspectorName };
          patch.inspectorName = inspectorName;
        }
        if (!insp.signerName) {
          next = { ...next, signerName: inspectorName };
          patch.signerName = inspectorName;
        }
      }
      if (project) {
        // Object name + address are sourced from the project - no manual entry.
        if (!next.objectName?.trim()) {
          const v = project.company_name || project.name;
          if (v) {
            next = { ...next, objectName: v };
            patch.objectName = v;
          }
        }
        if (!next.address?.trim() && project.address) {
          next = { ...next, address: project.address };
          patch.address = project.address;
        }
      }
      return { next, patch: Object.keys(patch).length ? patch : null };
    },
    pdf: {
      nameLabel: 'EquipmentInspection',
      title: 'ზოგადი აღჭურვილობის შემოწმება',
      subject: 'შრომის უსაფრთხოების შემოწმება',
    },
    loadingTitle: 'შემოწმება',
  });

  // ── Load attachments when completed ──────────────────────────────────────
  useEffect(() => {
    if (inspection?.status !== 'completed') return;
    inspectionAttachmentsApi.listByInspection(inspection.id)
      .then(a => setAttachmentCount(a.length)).catch(() => {});
  }, [inspection?.status, inspection?.id]);

  // ── Equipment row updates ─────────────────────────────────────────────────

  const updateCondition = useCallback((itemId: string, condition: EquipmentItem['condition']) => {
    setInspection(prev => {
      if (!prev) return prev;
      const equipment = prev.equipment.map((r) =>
        r.id === itemId ? { ...r, condition } : r,
      );
      const next = { ...prev, equipment };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, setInspection]);

  const addEquipmentRow = useCallback(() => {
    setInspection(prev => {
      if (!prev) return prev;
      const equipment = [...prev.equipment, buildDefaultEquipmentRow()];
      const next = { ...prev, equipment };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, setInspection]);

  const updateEquipmentName = useCallback((itemId: string, name: string) => {
    setInspection(prev => {
      if (!prev) return prev;
      const equipment = prev.equipment.map(r => r.id === itemId ? { ...r, name } : r);
      const next = { ...prev, equipment };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, setInspection]);

  // ── Photo handling - summary ──────────────────────────────────────────────

  const handleAddSummaryPhoto = useCallback(async () => {
    const results = await pickPhotosWithAnnotation();
    if (results.length === 0) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    for (const result of results) {
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
    }
  }, [pickPhotosWithAnnotation, scheduleSave, toast, inspectionRef, setInspection]);

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
  }, [scheduleSave, toast, setInspection]);

  // ── Step navigation ───────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection || step >= TOTAL_STEPS) return false;
    if (step === INFO_STEP)      return true;
    if (step === DETAILS_STEP)   return !!inspection.objectName?.trim();
    if (step === CHECKLIST_STEP) {
      return inspection.equipment.length > 0 && inspection.equipment.every(r => !!r.condition);
    }
    if (step === CONCLUSION_STEP) return !!inspection.conclusion?.trim() && !completing;
    return true;
  }, [step, inspection, completing]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      await complete();
    } else if (step < CONCLUSION_STEP) {
      setStep(s => s + 1);
    }
  }, [step, complete, setStep]);

  const handlePrev = useCallback(async () => {
    if (step === DETAILS_STEP) {
      await exit();
    } else {
      setStep(s => s - 1);
    }
  }, [step, exit, setStep]);

  const verdictOptions = useMemo<VerdictOption[]>(() => [], []);

  const handleConditionChange = useCallback((itemId: string, result: string | null) => {
    const conditionMap: Record<string, EquipmentItem['condition']> = {
      good: 'good',
      deficient: 'needs_service',
      unusable: 'unusable',
    };
    const newCondition = result !== null ? (conditionMap[result] ?? null) : null;
    updateCondition(itemId, newCondition);
  }, [updateCondition]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <InspectionShellSkeleton
        title="ტექ. აღჭ."
        projectName={projectName ?? ''}
        step={step - 1}
        totalSteps={TOTAL_STEPS - 1}
        variant={
          step === CHECKLIST_STEP ? 'checklist'
            : step === CONCLUSION_STEP ? 'conclusion'
            : 'form'
        }
        fields={2}
        onClose={() => router.back()}
      />
    );
  }

  // ── Completed inspection result view ──────────────────────────────────────

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="ტექ. აღჭურვილობა"
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

  const filledCount = inspection.equipment.filter(r => r.name.trim()).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <InspectionShell
        title="ტექ. აღჭ."
        projectName={projectName}
        step={step - 1}
        totalSteps={TOTAL_STEPS - 1}
        direction={direction}
        animate={animateSteps}
        canGoNext={canGoNext}
        isLastStep={step === CONCLUSION_STEP}
        completing={completing}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={() => router.back()}
      >
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
            <IdentificationGrid
              columns={1}
              fields={[
                {
                  label: 'შემოწმების სახე',
                  type: 'select',
                  value: inspection.inspectionType ?? '',
                  onChange: v => update('inspectionType', (v || null) as GEInspectionType),
                  options: ['initial', 'repeat', 'scheduled'],
                  optionLabels: [
                    INSPECTION_TYPE_LABEL.initial,
                    INSPECTION_TYPE_LABEL.repeat,
                    INSPECTION_TYPE_LABEL.scheduled,
                  ],
                },
              ]}
            />
          </KeyboardAwareScrollView>
        )}

        {/* ── Step 2: Equipment list ─────────────────────────────────────── */}
        {step === CHECKLIST_STEP && (
          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingTop: 8, paddingBottom: 24, paddingHorizontal: 16, gap: 8 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            bottomOffset={120}
          >
            <View style={{ paddingBottom: 2 }}>
              <ChecklistLegend items={GE_LEGEND} />
            </View>
            {inspection.equipment.map(item => (
              <ChecklistItemRow
                key={item.id}
                label={item.name || '-'}
                editableLabel={{
                  value: item.name,
                  onChange: name => updateEquipmentName(item.id, name),
                  placeholder: 'დასახელება...',
                }}
                options={GE_OPTIONS}
                value={item.condition === 'needs_service' ? 'deficient' : item.condition}
                onChange={v => handleConditionChange(item.id, v)}
                dense
              />
            ))}
            <View style={{ paddingHorizontal: 8, paddingTop: 4 }}>
              <Pressable
                style={styles.addRowBtn}
                onPress={addEquipmentRow}
                {...a11y('აღჭ. დამატება', '+ აღჭურვილობის სტრიქონის დამატება', 'button')}
              >
                <CirclePlus size={18} color={theme.colors.accent} strokeWidth={1.5} />
                <Text style={styles.addRowText}>+ აღჭურვილობის დამატება</Text>
              </Pressable>
              {filledCount === 0 && (
                <View style={styles.emptyHint}>
                  <Info size={18} color={theme.colors.inkFaint} strokeWidth={1.5} />
                  <Text style={styles.emptyHintText}>
                    შეავსეთ მინიმუმ ერთი აღჭურვილობის სტრიქონი
                  </Text>
                </View>
              )}
            </View>
          </KeyboardAwareScrollView>
        )}

        {/* ── Step 3: Conclusion ─────────────────────────────────────────── */}
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

      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
      {celebrating && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <CelebrationBurst />
        </View>
      )}
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
      <Image source={{ uri }} style={styles.thumbImg} contentFit="cover" transition={200} />
      <Pressable style={styles.thumbDelete} onPress={onDelete} hitSlop={8} {...a11y('ფოტოს წაშლა', undefined, 'button')}>
        <CircleX size={18} color={theme.colors.white} strokeWidth={2} />
      </Pressable>
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: theme.colors.background },

    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft, marginBottom: 6 },

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
