import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, TriangleAlert, X } from 'lucide-react-native';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { InspectionShell } from '../../../components/inspection-steps/InspectionShell';
import { InspectionShellSkeleton } from '../../../components/inspection-steps/InspectionShellSkeleton';
import { ConclusionStep } from '../../../components/inspection-steps';
import { IdentificationGrid } from '../../../components/inspection-parts/IdentificationGrid';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { SectionHeader } from '../../../components/SectionHeader';
import {
  ChecklistItemRow,
  ChecklistLegend,
  ChipNavStrip,
  ChipSwitchTransition,
  DynamicTable,
  type ChecklistRowOption,
  type ChipNavItem,
  type DynamicTableColumn,
} from '../../../components/inspection-parts';
import { type VerdictOption } from '../../../components/inspection-steps';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { fallProtectionApi } from '../../../lib/fallProtectionService';
import { fallProtectionSchema } from '../../../lib/inspection/schemas/fallProtection';
import { SubscriptionNotice } from '../../../components/SubscriptionNotice';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { friendlyError } from '../../../lib/errorMap';
import { CelebrationBurst } from '../../../components/animations';
import { usePhotoPicker } from '../../../hooks/usePhotoPicker';
import { useSubmitGuard } from '../../../hooks/useSubmitGuard';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
import {
  FP_CHECKLIST_ITEMS,
  FP_VERDICT_LABELS,
  FALL_PROTECTION_TEMPLATE_ID,
  computeFPTabState,
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

// Per-item rating: 3 monochrome icon states (matches the other equipment flows).
// The stored value IS the FPResult ('safe' | 'minor' | 'critical'); the PDF keeps
// its own glyph catalog (FP_RESULT_TO_CHIP), so legacy 'na' rows still render.
const FP_ROW_OPTIONS: ChecklistRowOption[] = [
  { value: 'safe',     icon: Check,         a11yLabel: 'უსაფრთხოა' },
  { value: 'minor',    icon: TriangleAlert, a11yLabel: 'მცირე დაზიანება' },
  { value: 'critical', icon: X,             a11yLabel: 'კრიტიკული' },
];

const FP_LEGEND = [
  { icon: Check,         label: 'უსაფრთხოა' },
  { icon: TriangleAlert, label: 'მცირე დაზიანება' },
  { icon: X,             label: 'კრიტიკული' },
];

// ── Step constants ────────────────────────────────────────────────────────────

const INFO_STEP       = 0;
const REGISTRY_STEP   = 1;
const CHECKLIST_STEP  = 2;
const CONCLUSION_STEP = 3;
const TOTAL_STEPS     = 4;

// ── Device registry table columns ─────────────────────────────────────────────
// `id` is the row title (titleColumnKey), so it isn't rendered again as a field.

const REGISTRY_COLS: DynamicTableColumn[] = [
  { key: 'id',       label: 'ID',                  type: 'readonly', width: 44 },
  { key: 'type',     label: 'ტიპი / სახეობა',      type: 'text' },
  { key: 'location', label: 'განთავსების ადგილი',  type: 'text' },
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
    projectName, loading, completing, celebrating, generatingPdf,
    previewHtml, previewBusy,
    step, setStep, direction, animateSteps,
    limitNoticeVisible, setLimitNoticeVisible, pdfLocked,
    update, scheduleSave,
    complete, reopen, handlePdf, buildPreview, exit, creatorName,
  } = useInspectionFlow<FallProtectionInspection>({
    id,
    firstStep: INFO_STEP,
    lastStep: CONCLUSION_STEP,
    // v2: 4-step layout. Bumped from 'fall-protection-wizard' so old persisted
    // 2-step positions don't restore onto the wrong new step (data still loads
    // from the DB; only the step index resets to INFO).
    persistPrefix: 'fall-protection-wizard-v2',
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
    (devIdx: number, itemId: number, val: string | null) => {
      const result = (val as FPResult) ?? null;
      updateDeviceData(devIdx, data => {
        if (itemId === 0) {
          // custom item (13th)
          return { ...data, customItem: { ...data.customItem, result } };
        }
        const items = data.items.map(i =>
          i.id === itemId ? { ...i, result } : i,
        );
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

  // ── Device photos (item-level photos were never captured in this flow) ───────

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
    if (step === REGISTRY_STEP) return inspection.devices.length >= 1;
    if (step === CONCLUSION_STEP) return allDevicesDone && !completing;
    return true; // INFO + CHECKLIST are not hard-gated
  }, [step, inspection, allDevicesDone, completing]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      await complete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, complete, setStep]);

  const handlePrev = useCallback(async () => {
    if (step === INFO_STEP) {
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
    if (step === CONCLUSION_STEP && inspection) {
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
        variant={
          step === CHECKLIST_STEP ? 'checklist'
            : step === CONCLUSION_STEP ? 'conclusion'
            : step === REGISTRY_STEP ? 'table'
            : 'form'
        }
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
        onEdit={() => void reopen()}
        onDownloadPdf={(sig) => void handlePdf(sig)}
        onSheetSaved={() => void buildPreview()}
      />
    );
  }

  // ── Device tab state (shared by checklist + conclusion steps) ────────────────

  const tabStates = inspection.deviceData.map(d => computeFPTabState(d));
  const safeDeviceIdx = Math.min(activeDeviceIdx, inspection.devices.length - 1);
  const currentDevice = inspection.devices[safeDeviceIdx];
  const currentDeviceData = inspection.deviceData[safeDeviceIdx];

  const deviceMeta = currentDevice
    ? [currentDevice.type, currentDevice.location, currentDevice.floor]
        .filter(Boolean)
        .join(' · ')
    : '';

  const deviceTabs = (
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
  );

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
        isLastStep={step === CONCLUSION_STEP}
        blockNext
        completing={completing}
        banner={pdfLocked ? <PdfLockedBanner onDetails={() => setLimitNoticeVisible(true)} /> : undefined}
        onBlockedNext={handleBlockedNext}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={() => router.back()}
      >

        {/* ── Step 0: General info ─────────────────────────────────────────── */}
        {step === INFO_STEP && (
          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.stepBody}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            bottomOffset={120}
          >
            <FloatingLabelInput
              label="უსაფრთხოების ხელმძღვანელის სახელი"
              value={inspection.safetyLeaderName}
              onChangeText={v => update('safetyLeaderName', v)}
            />

            <FloatingLabelInput
              label="უსაფრთხოების ხელმძღვანელის ტელეფონი"
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
          </KeyboardAwareScrollView>
        )}

        {/* ── Step 1: Equipment list ───────────────────────────────────────── */}
        {step === REGISTRY_STEP && (
          <KeyboardAwareScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.stepBody}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            bottomOffset={120}
          >
            <SectionHeader title="მოწყობილობების სია" />
            <DynamicTable
              columns={REGISTRY_COLS}
              rows={inspection.devices}
              onChange={handleDevicesChange}
              onBuildDefaultRow={buildDefaultRow}
              minRows={1}
              titleColumnKey="id"
            />
          </KeyboardAwareScrollView>
        )}

        {/* ── Step 2: Checklist (კითხვარი), per device ─────────────────────── */}
        {step === CHECKLIST_STEP && inspection.devices.length > 0 && (
          <View style={{ flex: 1 }}>
            {deviceTabs}
            <ChipSwitchTransition activeKey={safeDeviceIdx}>
            {currentDevice && currentDeviceData && (
              <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.deviceBody}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                bottomOffset={120}
              >
                {deviceMeta ? <Text style={styles.deviceMeta}>{deviceMeta}</Text> : null}

                <View style={{ paddingBottom: 2 }}>
                  <ChecklistLegend items={FP_LEGEND} />
                </View>

                {FP_CHECKLIST_ITEMS.map(entry => {
                  const state = currentDeviceData.items.find(i => i.id === entry.id);
                  return (
                    <ChecklistItemRow
                      key={entry.id}
                      label={entry.label}
                      options={FP_ROW_OPTIONS}
                      value={state?.result ?? null}
                      onChange={val => handleChecklistChange(safeDeviceIdx, entry.id, val)}
                      labelLines={4}
                      dense
                    />
                  );
                })}

                {/* Custom item 13 - editable label */}
                <ChecklistItemRow
                  label={currentDeviceData.customItem.label || 'სხვა'}
                  editableLabel={{
                    value: currentDeviceData.customItem.label,
                    onChange: v =>
                      updateDeviceData(safeDeviceIdx, d => ({
                        ...d,
                        customItem: { ...d.customItem, label: v },
                      })),
                    placeholder: 'სხვა (სახელი)…',
                  }}
                  options={FP_ROW_OPTIONS}
                  value={currentDeviceData.customItem.result ?? null}
                  onChange={val => handleChecklistChange(safeDeviceIdx, 0, val)}
                  labelLines={4}
                  dense
                />
              </KeyboardAwareScrollView>
            )}
            </ChipSwitchTransition>
          </View>
        )}

        {/* ── Step 3: Conclusion (დასკვნა), per device ─────────────────────── */}
        {step === CONCLUSION_STEP && inspection.devices.length > 0 && (
          <View style={{ flex: 1 }}>
            {deviceTabs}
            <ChipSwitchTransition activeKey={safeDeviceIdx}>
            {currentDevice && currentDeviceData && (
              <ConclusionStep<FPVerdict>
                showAvatar={false}
                summarySection={
                  deviceMeta ? <Text style={styles.deviceMeta}>{deviceMeta}</Text> : null
                }
                verdict={currentDeviceData.verdict}
                verdictOptions={FP_VERDICT_OPTIONS}
                verdictLayout="vertical"
                onVerdictChange={v => handleVerdictChange(safeDeviceIdx, v)}
                verdictError={attempted && !currentDeviceData.verdict}
                notes={currentDeviceData.verdictComment}
                onNotesChange={v => handleVerdictCommentChange(safeDeviceIdx, v)}
                photoPaths={currentDeviceData.photoPaths ?? []}
                onAddPhoto={() => handleAddDevicePhoto(safeDeviceIdx)}
                onDeletePhoto={path => handleDeleteDevicePhoto(safeDeviceIdx, path)}
                photoLabel={`${currentDevice.id} მოწყობილობის ფოტო (სურვ.)`}
                completing={completing}
              />
            )}
            </ChipSwitchTransition>
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
    root: { flex: 1, backgroundColor: theme.colors.background },
    stepBody: {
      flexGrow: 1, paddingHorizontal: 16,
      paddingTop: 12, paddingBottom: 24, gap: 12,
    },
    deviceBody: {
      flexGrow: 1, paddingHorizontal: 16,
      paddingTop: 12, paddingBottom: 24, gap: 8,
    },
    deviceMeta: {
      fontSize: 11, color: theme.colors.inkSoft,
      paddingHorizontal: 2, marginBottom: 4,
    },
  });
}
