import { useCallback, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
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
import {
  ChecklistSection,
  DynamicTable,
  VerdictSelector,
  PhotoSection,
} from '../../../components/inspection-parts';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cargoPlatformApi } from '../../../lib/cargoPlatformService';
import { cargoPlatformSchema } from '../../../lib/inspection/schemas/cargoPlatform';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
import { PaywallModal } from '../../../components/PaywallModal';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import { haptic } from '../../../lib/haptics';
import { CelebrationBurst } from '../../../components/animations';
import { usePhotoWithLocation } from '../../../hooks/usePhotoWithLocation';

import {
  CP_ITEMS,
  CP_SECTION_LABELS,
  CP_VERDICT_LABEL,
  CARGO_PLATFORM_TEMPLATE_ID,
  buildDefaultCargoRow,
  computeCPVerdictSuggestion,
  cpTotalWeight,
  type CargoPlatformInspection,
  type CPVerdict,
  type CPResult,
  type CPItemState,
  type CPSection,
} from '../../../types/cargoPlatform';

// ── Step constants ────────────────────────────────────────────────────────────
const INFO_STEP       = 0;
const PLATFORM_STEP   = 1;
const CARGO_STEP      = 2;
const CHECKLIST_STEP  = 3;
const CONCLUSION_STEP = 4;
const TOTAL_STEPS     = 5;

// ── Binary pill selector ──────────────────────────────────────────────────────
function BinaryPills<T extends string>({
  value,
  options,
  onSelect,
  styles,
  theme,
}: {
  value: T | null;
  options: { value: T; label: string }[];
  onSelect: (v: T | null) => void;
  styles: ReturnType<typeof getstyles>;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <View style={styles.pillRow}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => {
              haptic.light();
              onSelect(active ? null : opt.value);
            }}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CargoPlatformInspectionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { pickPhotoWithAnnotation } = usePhotoWithLocation();

  // Shared orchestration: loading, step+persist, autosave, complete, celebration,
  // PDF preview/download, paywall. Type-specific bits are passed as callbacks so
  // behaviour matches the pre-refactor screen exactly.
  const {
    inspection, setInspection, inspectionRef,
    projectName, saving, loading, completing, celebrating, generatingPdf,
    previewHtml, previewBusy,
    step, setStep, direction, animateSteps,
    paywallVisible, setPaywallVisible, pdfLocked,
    update, scheduleSave,
    complete, handlePdf, buildPreview, exit,
  } = useInspectionFlow<CargoPlatformInspection>({
    id,
    firstStep: PLATFORM_STEP,
    lastStep: CONCLUSION_STEP,
    persistPrefix: 'cargo-platform-wizard',
    templateId: CARGO_PLATFORM_TEMPLATE_ID,
    schema: cargoPlatformSchema,
    api: cargoPlatformApi,
    toPatch: (insp) => ({
      company: insp.company,
      address: insp.address,
      inspectorName: insp.inspectorName,
      floorZone: insp.floorZone,
      inspectionDate: insp.inspectionDate,
      platformTypeModel: insp.platformTypeModel,
      platformLength: insp.platformLength,
      platformWidth: insp.platformWidth,
      platformColorDesc: insp.platformColorDesc,
      sideGuardrail: insp.sideGuardrail,
      frontGuardrail: insp.frontGuardrail,
      guardrailHeight: insp.guardrailHeight,
      cargo: insp.cargo,
      items: insp.items,
      verdict: insp.verdict,
      verdictComment: insp.verdictComment,
      summaryPhotos: insp.summaryPhotos,
    }),
    validateMissing: (insp) => {
      const missing: string[] = [];
      if (!insp.verdict)                missing.push('დასკვნა');
      if (!insp.verdictComment?.trim()) missing.push('კომენტარი');
      return missing;
    },
    autofill: (insp, { inspectorName, project }) => {
      let next = insp;
      const patch: Record<string, unknown> = {};
      if (!insp.inspectorName && inspectorName) {
        next = { ...next, inspectorName };
        const sigs = [...next.signatures];
        if (!sigs[0].name) sigs[0] = { ...sigs[0], name: inspectorName };
        next = { ...next, signatures: sigs };
        patch.inspectorName = inspectorName;
      }
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
      nameLabel: 'CargoPlatformInspection',
      title: 'ტვირთის მიმღები პლატფორმის შემოწმება',
      subject: 'შრომის უსაფრთხოება',
    },
    loadingTitle: 'პლატფორმის შემოწმება',
  });

  // ── Cargo rows ─────────────────────────────────────────────────────────────

  const handleCargoChange = useCallback((rows: Record<string, any>[]) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, cargo: rows as typeof prev.cargo };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, setInspection]);

  // ── Checklist items ─────────────────────────────────────────────────────────

  const updateItem = useCallback((
    itemId: number,
    patch: Partial<Pick<CPItemState, 'result' | 'comment'>>,
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i => i.id === itemId ? { ...i, ...patch } : i);
      const next = { ...prev, items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, setInspection]);

  // ── Photos ──────────────────────────────────────────────────────────────────

  const handleAddItemPhoto = useCallback(async (itemId: number) => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await cargoPlatformApi.uploadPhoto(insp.id, itemId, result.uri);
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
  }, [pickPhotoWithAnnotation, scheduleSave, toast, inspectionRef, setInspection]);

  const handleDeleteItemPhoto = useCallback(async (itemId: number, path: string) => {
    try {
      await cargoPlatformApi.deletePhoto(path);
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
  }, [scheduleSave, toast, setInspection]);

  const handleAddSummaryPhoto = useCallback(async () => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await cargoPlatformApi.uploadPhoto(insp.id, 'summary', result.uri);
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
      await cargoPlatformApi.deletePhoto(path);
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

  // ── Signatories ─────────────────────────────────────────────────────────────

  const handleSignatoryChange = useCallback((idx: number, field: string, value: string) => {
    setInspection(prev => {
      if (!prev) return prev;
      const sigs = [...prev.signatures];
      sigs[idx] = { ...sigs[idx], [field]: field === 'signature' ? (value || null) : value };
      return { ...prev, signatures: sigs };
    });
  }, [setInspection]);

  const handleSignatorySign = useCallback((idx: number, base64Png: string) => {
    const insp = inspectionRef.current;
    if (!insp) return;
    const sigs = [...insp.signatures];
    sigs[idx] = { ...sigs[idx], signature: base64Png, date: new Date().toISOString() };
    setInspection({ ...insp, signatures: sigs });
  }, [inspectionRef, setInspection]);

  // ── Verdict auto-suggest ────────────────────────────────────────────────────

  const suggestedVerdict = useMemo(
    () => inspection ? computeCPVerdictSuggestion(inspection.items) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inspection?.items],
  );

  // ── Step navigation ─────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === INFO_STEP) return !!(inspection.company?.trim() && inspection.address?.trim());
    if (step === CONCLUSION_STEP) return !!inspection.verdict && !!inspection.verdictComment?.trim() && !completing;
    return true;
  }, [step, inspection, completing]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      await complete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, complete, setStep]);

  const handlePrev = useCallback(async () => {
    if (step === PLATFORM_STEP) {
      await exit();
    } else {
      setStep(s => s - 1);
    }
  }, [step, exit, setStep]);

  // ── Section grouping for checklist ──────────────────────────────────────────

  const checklistSections = useMemo(() => {
    const sections: CPSection[] = ['A', 'B'];
    return sections.map(sec => ({
      section: sec,
      label: CP_SECTION_LABELS[sec],
      entries: CP_ITEMS.filter(e => e.section === sec),
    }));
  }, []);

  // ── Loading & completed ─────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'პლატფორმის შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
    );
  }

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="ტვირთის მიმღები პლატფორმა"
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        attachmentCount={0}
        pdfLocked={pdfLocked}
        downloading={generatingPdf}
        paywallVisible={paywallVisible}
        onPaywallClose={() => setPaywallVisible(false)}
        onDownloadPdf={() => void handlePdf()}
        onSheetSaved={() => void buildPreview()}
      />
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle="პლატფორმის შემოწმება"
        project={projectName ? { name: projectName } : null}
        step={step}
        totalSteps={TOTAL_STEPS - 1}
        leading="back"
        trailing="close"
        onClose={() => router.back()}
        trailingElement={
          step > INFO_STEP ? (
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

      {saving && <Text style={styles.savingHint}>შენახვა…</Text>}

      {pdfLocked && <PdfLockedBanner onSubscribe={() => setPaywallVisible(true)} />}

      <View style={{ flex: 1 }}>
        <WizardStepTransition stepKey={step} direction={direction} animate={animateSteps}>

          {/* ── Step 1: Platform ID ──────────────────────────────────────────── */}
          {step === PLATFORM_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <FloatingLabelInput
                label="სართული / ზონა"
                value={inspection.floorZone}
                onChangeText={v => update('floorZone', v)}
              />

              <DateTimeField
                label="შემოწმების თარიღი"
                value={new Date(inspection.inspectionDate)}
                onChange={d => update('inspectionDate', d.toISOString().slice(0, 10))}
                mode="date"
              />

              <FloatingLabelInput
                label="პლატფორმის ტიპი / მოდელი"
                value={inspection.platformTypeModel}
                onChangeText={v => update('platformTypeModel', v)}
              />

              <FloatingLabelInput
                label="სიგრძე (მ)"
                value={inspection.platformLength != null ? String(inspection.platformLength) : ''}
                onChangeText={v => {
                  const n = parseFloat(v);
                  update('platformLength', isNaN(n) ? null : n);
                }}
                keyboardType="decimal-pad"
              />
              <FloatingLabelInput
                label="სიგანე (მ)"
                value={inspection.platformWidth != null ? String(inspection.platformWidth) : ''}
                onChangeText={v => {
                  const n = parseFloat(v);
                  update('platformWidth', isNaN(n) ? null : n);
                }}
                keyboardType="decimal-pad"
              />

              <FloatingLabelInput
                label="ვიზუალური აღწერა / ფერი"
                value={inspection.platformColorDesc}
                onChangeText={v => update('platformColorDesc', v)}
              />

              <View style={styles.binaryGroup}>
                <Text style={styles.fieldLabel}>გვერდის დამცავი მოაჯირი</Text>
                <BinaryPills
                  value={inspection.sideGuardrail}
                  options={[{ value: 'none', label: 'არ გააჩნია' }, { value: 'complete', label: 'მოაჯირი სრულია' }]}
                  onSelect={v => update('sideGuardrail', v)}
                  styles={styles}
                  theme={theme}
                />
              </View>

              <View style={styles.binaryGroup}>
                <Text style={styles.fieldLabel}>წინა დამცავი მოაჯირი</Text>
                <BinaryPills
                  value={inspection.frontGuardrail}
                  options={[{ value: 'none', label: 'არ გააჩნია' }, { value: 'complete', label: 'მოაჯირი სრულია' }]}
                  onSelect={v => update('frontGuardrail', v)}
                  styles={styles}
                  theme={theme}
                />
              </View>

              <View style={styles.binaryGroup}>
                <Text style={styles.fieldLabel}>მოაჯირის სიმაღლე (სტანდ. 90–120 სმ)</Text>
                <BinaryPills
                  value={inspection.guardrailHeight}
                  options={[
                    { value: 'non_standard', label: 'ვერ აკმ. სტანდარტს' },
                    { value: 'standard', label: 'სტანდარტს აკმ.' },
                  ]}
                  onSelect={v => update('guardrailHeight', v)}
                  styles={styles}
                  theme={theme}
                />
              </View>
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Cargo table ──────────────────────────────────────────── */}
          {step === CARGO_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[styles.stepBody, { paddingHorizontal: 16 }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <Text style={styles.sectionHint}>
                ყველა ტვირთი, რომელიც განთავსდება პლატფორმაზე, ექვემდებარება იდენტიფიკაციას და წინასწარ წონის დადასტურებას
              </Text>

              <DynamicTable
                columns={[
                  { key: 'name', label: 'ტვირთის დასახელება', type: 'text' },
                  { key: 'total_weight_kg', label: 'სრული წონა (კგ)', type: 'number', keyboardType: 'decimal-pad' },
                ]}
                rows={inspection.cargo}
                onChange={handleCargoChange}
                onBuildDefaultRow={buildDefaultCargoRow}
                minRows={0}
                footer={
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.totalLabel}>სულ:</Text>
                    <Text style={styles.totalValue}>{cpTotalWeight(inspection.cargo)} კგ</Text>
                  </View>
                }
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 3: Checklist ────────────────────────────────────────────── */}
          {step === CHECKLIST_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 4 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              {checklistSections.map(({ section, label, entries }) => (
                <ChecklistSection
                  key={section}
                  title={label}
                  items={entries.map(e => {
                    const state = inspection.items.find(i => i.id === e.id)
                      ?? { id: e.id, result: null, comment: null, photo_paths: [] };
                    return {
                      id: e.id,
                      label: e.label,
                      description: e.description,
                      type: 'three_state' as const,
                      options: { a: 'good', b: 'fix', c: 'N/A', cIsNeutral: true },
                      value: state.result === 'na' ? 'N/A' : state.result,
                      comment: state.comment,
                      photoPaths: state.photo_paths ?? [],
                    };
                  })}
                  onItemChange={(id, field, val) => {
                    if (field === 'value') {
                      const result: CPResult | null = val === 'N/A' ? 'na' : val as CPResult | null;
                      updateItem(id, { result });
                    } else {
                      updateItem(id, { comment: val });
                    }
                  }}
                  onAddPhoto={handleAddItemPhoto}
                  onDeletePhoto={handleDeleteItemPhoto}
                />
              ))}
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
                    შემოთავაზება: {CP_VERDICT_LABEL[suggestedVerdict]}
                  </Text>
                </Pressable>
              )}

              <Text style={styles.fieldLabel}>დასკვნა *</Text>
              <VerdictSelector
                options={[
                  { value: 'approved', label: CP_VERDICT_LABEL.approved, type: 'success' },
                  { value: 'conditional', label: CP_VERDICT_LABEL.conditional, type: 'warning' },
                  { value: 'rejected', label: CP_VERDICT_LABEL.rejected, type: 'danger' },
                ]}
                value={inspection.verdict}
                onChange={v => update('verdict', v as CPVerdict)}
                note={inspection.verdictComment}
                onNoteChange={v => update('verdictComment', v)}
                notePlaceholder="კომენტარი *"
              />

              <Text style={styles.fieldLabel}>ფოტო / ვიდეო მასალა (სურვ.)</Text>
              <PhotoSection
                photoPaths={inspection.summaryPhotos}
                onAdd={handleAddSummaryPhoto}
                onDelete={handleDeleteSummaryPhoto}
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
              title={canGoNext ? 'შემდეგი' : 'გაგრძელება'}
              variant={canGoNext ? 'primary' : 'secondary'}
              size="lg"
              style={{ alignSelf: 'stretch', paddingVertical: 16, justifyContent: 'center' }}
              iconRight={
                canGoNext
                  ? <Ionicons name="chevron-forward" size={18} color={theme.colors.white} />
                  : undefined
              }
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
    root: { flex: 1, backgroundColor: theme.colors.background },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 24, paddingTop: 4 },
    stepBody: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 },
    footer: { gap: 10, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, backgroundColor: theme.colors.card },


    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    sectionHint: { fontSize: 12, color: theme.colors.inkSoft, fontStyle: 'italic', lineHeight: 18 },

    // Binary pills (platform guardrail selectors)
    binaryGroup: { gap: 6 },
    pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    pill: {
      paddingHorizontal: 16, paddingVertical: 10,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: theme.colors.hairline, backgroundColor: theme.colors.card,
    },
    pillActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
    pillText: { fontSize: 13, color: theme.colors.inkSoft },
    pillTextActive: { color: theme.colors.accent, fontWeight: '700' },

    // Cargo total
    totalLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.ink },
    totalValue: { fontSize: 18, fontWeight: '800', color: theme.colors.accent },

    // Verdict suggestion banner
    suggestBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.colors.warnSoft,
      padding: 10, borderRadius: 8,
    },
    suggestText: { fontSize: 12, color: theme.colors.inkSoft, flex: 1 },
  });
}
