import { useCallback, useMemo, useState } from 'react';
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
  SignatureSheet,
  VerdictSelector,
  DynamicTable,
  PhotoSection,
  type VerdictOption,
  type DynamicTableColumn,
} from '../../../components/inspection';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fallProtectionApi } from '../../../lib/fallProtectionService';
import { fallProtectionSchema } from '../../../lib/inspection/schemas/fallProtection';
import { PaywallModal } from '../../../components/PaywallModal';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import { haptic } from '../../../lib/haptics';
import { CelebrationBurst } from '../../../components/animations';
import { usePhotoWithLocation } from '../../../hooks/usePhotoWithLocation';
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
  type FPTabState,
} from '../../../types/fallProtection';

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
  const insets = useSafeAreaInsets();
  const { pickPhotoWithAnnotation } = usePhotoWithLocation();

  const [activeDeviceIdx, setActiveDeviceIdx] = useState(0);

  // Shared orchestration: loading, step+persist, autosave, complete, celebration,
  // PDF preview/download, paywall. Type-specific bits are passed as callbacks.
  const {
    inspection, setInspection, inspectionRef,
    projectName, saving, loading, completing, celebrating, generatingPdf,
    previewHtml, previewBusy,
    step, setStep, direction, animateSteps,
    paywallVisible, setPaywallVisible, pdfLocked,
    update, scheduleSave,
    complete, handlePdf, buildPreview, exit,
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

  const handleSignChange = useCallback((_idx: number, field: string, value: string) => {
    setInspection(prev => {
      if (!prev) return prev;
      const sig = { ...prev.signature, [field]: field === 'signature' ? (value || null) : value };
      return { ...prev, signature: sig };
    });
  }, [setInspection]);

  const handleSign = useCallback((_idx: number, base64Png: string) => {
    const insp = inspectionRef.current;
    if (!insp) return;
    setInspection({
      ...insp,
      signature: { ...insp.signature, signature: base64Png, date: new Date().toISOString() },
    });
  }, [inspectionRef, setInspection]);

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
    [pickPhotoWithAnnotation, updateDeviceData, toast, inspectionRef],
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
    [pickPhotoWithAnnotation, updateDeviceData, toast, inspectionRef],
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
        signedCount={inspection.signature?.signature ? 1 : 0}
        totalSlots={1}
        attachmentCount={0}
        pdfLocked={pdfLocked}
        downloading={generatingPdf}
        paywallVisible={paywallVisible}
        onPaywallClose={() => setPaywallVisible(false)}
        onDownloadPdf={() => void handlePdf()}
        onSheetSaved={() => void buildPreview()}
        renderSignaturesSheet={({ dismiss, onChanged }) => (
          <SignatureSheet
            onClose={dismiss}
            signatories={[
              {
                role: 'შემომწმებელი პირი',
                name: inspection.signature.name,
                position: inspection.signature.position,
                signature: inspection.signature.signature,
                date: inspection.signature.date,
              },
            ]}
            onChange={handleSignChange}
            onSign={(idx, base64) => {
              handleSign(idx, base64);
              onChanged();
            }}
          />
        )}
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

      {pdfLocked && (
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
