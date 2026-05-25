import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { IdentificationGrid } from '../../../components/inspection-parts/IdentificationGrid';
import { DateTimeField } from '../../../components/DateTimeField';
import { InspectionShell, ChecklistStep, ConclusionStep } from '../../../components/inspection-steps';
import type { VerdictOption, ChecklistResult } from '../../../components/inspection-steps';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { generalEquipmentApi } from '../../../lib/generalEquipmentService';
import { inspectionAttachmentsApi } from '../../../lib/services';
import { imageForDisplay } from '../../../lib/imageUrl';
import { SignatureSheet } from '../../../components/inspection-parts/SignatureSheet';
import { generalEquipmentSchema } from '../../../lib/inspection/schemas/generalEquipment';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
import { PaywallModal } from '../../../components/PaywallModal';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SuggestionPills } from '../../../components/SuggestionPills';
import { useFieldHistory } from '../../../hooks/useFieldHistory';
import { usePhotoWithLocation } from '../../../hooks/usePhotoWithLocation';
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
  const objectNameHistory  = useFieldHistory(userId, 'ge:objectName');
  const activityTypeHistory = useFieldHistory(userId, 'ge:activityType');
  const actNumberHistory   = useFieldHistory(userId, 'ge:actNumber');
  const conclusionHistory  = useFieldHistory(userId, 'ge:conclusion');

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [attachmentCount, setAttachmentCount] = useState(0);

  // ── Shared orchestration ──────────────────────────────────────────────────
  const {
    inspection, setInspection, inspectionRef,
    projectName,
    saving, loading, completing, celebrating, generatingPdf,
    previewHtml, previewBusy,
    step, setStep, direction, animateSteps,
    paywallVisible, setPaywallVisible, pdfLocked,
    update, scheduleSave,
    complete, handlePdf, buildPreview, exit,
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
      if (project && !next.address?.trim() && project.address) {
        next = { ...next, address: project.address };
        patch.address = project.address;
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

  // ── Photo handling — summary ──────────────────────────────────────────────

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
  }, [pickPhotoWithAnnotation, scheduleSave, toast, inspectionRef, setInspection]);

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

  // ── Checklist data ────────────────────────────────────────────────────────

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

  const handleChecklistStateChange = useCallback((itemId: string, patch: { result?: ChecklistResult }) => {
    if (patch.result === undefined) return;
    const conditionMap: Record<string, EquipmentItem['condition']> = {
      good: 'good',
      deficient: 'needs_service',
      unusable: 'unusable',
    };
    const newCondition = patch.result !== null ? (conditionMap[patch.result] ?? null) : null;
    updateCondition(itemId, newCondition);
  }, [updateCondition]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
    );
  }

  // ── Completed inspection result view ──────────────────────────────────────

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="ტექ. აღჭურვილობა"
        requiredSignerRoles={[]}
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        signedCount={inspection.inspectorSignature ? 1 : 0}
        totalSlots={1}
        attachmentCount={attachmentCount}
        pdfLocked={pdfLocked}
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
                role: 'ხელმომწერი',
                name: inspection.signerName ?? '',
                position: inspection.signerRole === 'other'
                  ? (inspection.signerRoleCustom ?? '')
                  : (inspection.signerRole ?? ''),
                signature: inspection.inspectorSignature,
              },
            ]}
            onChange={(_, field, value) => {
              setInspection(prev => {
                if (!prev) return prev;
                const next = { ...prev };
                if (field === 'name') next.signerName = value;
                else if (field === 'position') next.signerRoleCustom = value;
                else if (field === 'signature') next.inspectorSignature = value || null;
                return next;
              });
            }}
            onSign={(_, base64) => {
              setInspection(prev => prev ? { ...prev, inspectorSignature: base64 } : prev);
              onChanged();
            }}
          />
        )}
      />
    );
  }

  const filledCount = inspection.equipment.filter(r => r.name.trim()).length;
  const totalCount  = inspection.equipment.length;

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
        saving={saving}
        completing={completing}
        showPdfIcon={step > INFO_STEP}
        generatingPdf={generatingPdf}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={() => router.back()}
        onPdf={handlePdf}
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

      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />
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

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: theme.colors.background },
    centred: { alignItems: 'center', justifyContent: 'center' },

    fieldRow:   { marginBottom: 4, gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft, marginBottom: 6 },

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
