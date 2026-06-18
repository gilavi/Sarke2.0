import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../../components/DateTimeField';
import { InspectionShell } from '../../../components/inspection-steps/InspectionShell';
import { InspectionShellSkeleton } from '../../../components/inspection-steps/InspectionShellSkeleton';
import { IdentificationGrid } from '../../../components/inspection-parts/IdentificationGrid';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { SectionHeader } from '../../../components/SectionHeader';
import {
  ChecklistItem,
  ChipNavStrip,
  DynamicTable,
  PhotoSection,
  type ChipNavItem,
  type DynamicTableColumn,
} from '../../../components/inspection-parts';
import {
  VerdictSelector,
  VerdictSuggestionBanner,
  type VerdictOption,
} from '../../../components/inspection-steps';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { fallProtectionApi } from '../../../lib/fallProtectionService';
import { fallProtectionSchema } from '../../../lib/inspection/schemas/fallProtection';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import { haptic } from '../../../lib/haptics';
import { CelebrationBurst } from '../../../components/animations';
import { usePhotoPicker } from '../../../hooks/usePhotoPicker';
import { useSubmitGuard } from '../../../hooks/useSubmitGuard';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
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
  type FPInspectionType,
} from '../../../types/fallProtection';

const FP_VERDICT_OPTIONS: VerdictOption<FPVerdict>[] = [
  { value: 'safe',   label: FP_VERDICT_LABELS.safe,   tone: 'success' },
  { value: 'minor',  label: FP_VERDICT_LABELS.minor,  tone: 'caution' },
  { value: 'banned', label: FP_VERDICT_LABELS.banned, tone: 'danger'  },
];

// ── Step constants ────────────────────────────────────────────────────────────

const REGISTRY_STEP   = 0;
const DEVICES_STEP    = 1;
const TOTAL_STEPS     = 2;

// ── Device registry table columns ─────────────────────────────────────────────

const REGISTRY_COLS: DynamicTableColumn[] = [
  { key: 'id',       label: 'ID',                  type: 'readonly', width: 44 },
  { key: 'type',     label: 'ტიპი / სახეობა',      type: 'text' },
  { key: 'location', label: 'განთავს. ადგილი',      type: 'text' },
  { key: 'floor',    label: 'სართული',              type: 'text' },
  { key: 'purpose',  label: 'ვისთვის / რისთვის',   type: 'text' },
  { key: 'comment',  label: 'კომენტარი',            type: 'text' },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function FallProtectionInspectionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { pickPhotosWithAnnotation } = usePhotoPicker();

  const [activeDeviceIdx, setActiveDeviceIdx] = useState(0);

  // Enabled finish button + on-press field errors (see useSubmitGuard).
  const { attempted, markAttempted, reset: resetAttempted } = useSubmitGuard();

  // Shared orchestration: loading, step+persist, autosave, complete, celebration,
  // PDF preview/download, limit notice. Type-specific bits are passed as callbacks.
  const {
    inspection, setInspection, inspectionRef,
    projectName, saving, loading, completing, celebrating, generatingPdf,
    previewHtml, previewBusy,
    step, setStep, direction, animateSteps,
    limitNoticeVisible, setLimitNoticeVisible, pdfLocked,
    update, scheduleSave,
    complete, handlePdf, buildPreview, exit, creatorName,
  } = useInspectionFlow<FallProtectionInspection>({
    id,
    firstStep: REGISTRY_STEP,
    lastStep: DEVICES_STEP,
    persistPrefix: 'fall-protection-wizard',
    templateId: FALL_PROTECTION_TEMPLATE_ID,
    schema: fallProtectionSchema,
    api: fallProtectionApi,
    toPatch: (insp) => ({
      company: insp.company,
      address: insp.address,
      inspectionDate: insp.inspectionDate,
      safetyLeaderName: insp.safetyLeaderName,
      safetyLeaderPhone: insp.safetyLeaderPhone,
      inspectionType: insp.inspectionType,
      nextInspectionDate: insp.nextInspectionDate,
      devices: insp.devices,
      deviceData: insp.deviceData,
    }),
    validateMissing: (insp) => {
      const missing: string[] = [];
      if (insp.devices.length === 0) missing.push('მინიმუმ 1 მოწყობილობა');
      const incompleteDevices = insp.deviceData
        .map((d, i) => (!d.verdict ? insp.devices[i]?.id : null))
        .filter(Boolean);
      if (incompleteDevices.length > 0) {
        missing.push(`დასკვნა: ${incompleteDevices.join(', ')}`);
      }
      return missing;
    },
    autofill: (insp, { project }) => {
      let next = insp;
      const patch: Record<string, unknown> = {};
      if (project) {
        if (!next.company?.trim()) {
          const v = project.company_name || project.name;
          next = { ...next, company: v };
          patch.company = v;
        }
        if (!next.address?.trim() && project.address) {
          next = { ...next, address: project.address };
          patch.address = project.address;
        }
      }
      return { next, patch: Object.keys(patch).length ? patch : null };
    },
    pdf: {
      nameLabel: 'FallProtectionInspection',
      title: 'დამჭერი მოწყობილობების შემოწმების აქტი',
      subject: 'შრომის უსაფრთხოება',
    },
    loadingTitle: 'შემოწმება',
  });

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
  }, [scheduleSave, setInspection]);

  const buildDefaultRow = useCallback(() => {
    const insp = inspectionRef.current;
    const idx = insp ? insp.devices.length : 0;
    return buildDefaultFPDeviceRow(idx);
  }, [inspectionRef]);

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
    [scheduleSave, setInspection],
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

  const handleVerdictChange = useCallback((devIdx: number, v: string | null) => {
    updateDeviceData(devIdx, data => ({
      ...data,
      verdict: v as FPVerdict,
    }));
  }, [updateDeviceData]);

  const handleVerdictCommentChange = useCallback((devIdx: number, v: string) => {
    updateDeviceData(devIdx, data => ({ ...data, verdictComment: v }));
  }, [updateDeviceData]);

  // ── Photos ──────────────────────────────────────────────────────────────────

  const handleAddItemPhoto = useCallback(
    async (devIdx: number, itemId: number) => {
      const results = await pickPhotosWithAnnotation();
      if (results.length === 0) return;
      const insp = inspectionRef.current;
      if (!insp) return;
      for (const result of results) {
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
      }
    },
    [pickPhotosWithAnnotation, updateDeviceData, toast, inspectionRef],
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
      const results = await pickPhotosWithAnnotation();
      if (results.length === 0) return;
      const insp = inspectionRef.current;
      if (!insp) return;
      for (const result of results) {
        try {
          const path = await fallProtectionApi.uploadDevicePhoto(insp.id, devIdx, result.uri);
          updateDeviceData(devIdx, data => ({
            ...data,
            photoPaths: [...(data.photoPaths ?? []), path],
          }));
        } catch (e) {
          toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
        }
      }
    },
    [pickPhotosWithAnnotation, updateDeviceData, toast, inspectionRef],
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

  // ── Step navigation ─────────────────────────────────────────────────────────

  const allDevicesDone = useMemo(() => {
    if (!inspection) return false;
    if (inspection.devices.length === 0) return false;
    return inspection.deviceData.every(d => !!d.verdict);
  }, [inspection]);

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
      await complete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, complete, setStep]);

  const handlePrev = useCallback(async () => {
    if (step === REGISTRY_STEP) {
      await exit();
    } else {
      setStep(s => s - 1);
    }
  }, [step, exit, setStep]);

  // Clear the "attempted" error reveal whenever the step changes.
  useEffect(() => { resetAttempted(); }, [step, resetAttempted]);

  // On a blocked finish, reveal errors and jump to the first device still
  // missing a verdict so the red selector is in view.
  const handleBlockedNext = useCallback(() => {
    markAttempted();
    if (step === DEVICES_STEP && inspection) {
      const idx = inspection.deviceData.findIndex(d => !d.verdict);
      if (idx >= 0) setActiveDeviceIdx(idx);
    }
  }, [markAttempted, step, inspection]);

  // ── Loading & completed ─────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <InspectionShellSkeleton
        title="დამჭერი მოწყობილობა"
        projectName={projectName ?? ''}
        step={step}
        totalSteps={TOTAL_STEPS}
        variant={step === DEVICES_STEP ? 'checklist' : 'form'}
        fields={4}
        onClose={() => router.back()}
      />
    );
  }

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="დამჭერი მოწყობილობა"
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        attachmentCount={0}
        pdfLocked={pdfLocked}
        downloading={generatingPdf}
        limitNoticeVisible={limitNoticeVisible}
        onLimitNoticeClose={() => setLimitNoticeVisible(false)}
        creatorName={creatorName}
        onDownloadPdf={(sig) => void handlePdf(sig)}
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
      <InspectionShell
        title="დამჭერი მოწყობილობა"
        projectName={projectName ?? ''}
        step={step}
        totalSteps={TOTAL_STEPS}
        direction={direction}
        animate={animateSteps}
        canGoNext={canGoNext}
        isLastStep={step === DEVICES_STEP}
        blockNext
        completing={completing}
        finishLabel="შემოწმება დასრულდა"
        banner={pdfLocked ? <PdfLockedBanner onDetails={() => setLimitNoticeVisible(true)} /> : undefined}
        onBlockedNext={handleBlockedNext}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={() => router.back()}
      >

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

              <IdentificationGrid
                columns={1}
                fields={[
                  {
                    label: 'შემოწმების სახე',
                    type: 'select',
                    value: inspection.inspectionType ?? '',
                    onChange: v => update('inspectionType', (v || null) as FPInspectionType | null),
                    options: ['primary', 'secondary'],
                    optionLabels: ['პირველადი', 'განმეორებითი'],
                  },
                ]}
              />

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
              <ChipNavStrip
                items={inspection.devices.map((d, idx): ChipNavItem => ({
                  key: d.id,
                  label: d.id,
                  state: tabStates[idx] ?? 'pending',
                  a11yHint: `${d.id} - ${d.type || 'მოწყობილობა'}`,
                }))}
                activeIndex={safeDeviceIdx}
                onSelect={setActiveDeviceIdx}
                tone="neutral"
              />

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
                    <VerdictSuggestionBanner
                      text={`შემოთავაზება: ${FP_VERDICT_LABELS[suggestedVerdict]}`}
                      onApply={() => handleVerdictChange(safeDeviceIdx, suggestedVerdict)}
                    />
                  )}
                  <VerdictSelector
                    value={currentDeviceData.verdict}
                    options={FP_VERDICT_OPTIONS}
                    onChange={v => handleVerdictChange(safeDeviceIdx, v)}
                    showError={attempted && !currentDeviceData.verdict}
                  />
                  <FloatingLabelInput
                    label="კომენტარი"
                    value={currentDeviceData.verdictComment}
                    onChangeText={v => handleVerdictCommentChange(safeDeviceIdx, v)}
                    multiline
                    numberOfLines={4}
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

// ── Styles ────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: theme.colors.background },
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
    // Device tabs
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
  });
}
