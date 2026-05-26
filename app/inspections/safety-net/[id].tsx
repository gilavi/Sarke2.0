import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { Button } from '../../../components/ui';
import { WizardStepTransition } from '../../../components/wizard/WizardStepTransition';
import { FlowHeader } from '../../../components/FlowHeader';
import { InspectionResultView } from '../../../components/InspectionResultView';
import {
  ChecklistSection,
  DynamicTable,
  VerdictSelector,
  PhotoSection,
  IdentificationGrid,
  QualDoc,
} from '../../../components/inspection-parts';
import { useTheme, type Theme } from '../../../lib/theme';
import { useToast } from '../../../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safetyNetApi } from '../../../lib/safetyNetService';
import { safetyNetSchema } from '../../../lib/inspection/schemas/safetyNet';
import { useInspectionFlow } from '../../../lib/inspection/useInspectionFlow';
import { PaywallModal } from '../../../components/PaywallModal';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import { CelebrationBurst } from '../../../components/animations';
import { usePhotoWithLocation } from '../../../hooks/usePhotoWithLocation';
import {
  SN_VISUAL_ITEMS,
  SN_POST_TEST_ITEMS,
  SN_VERDICT_LABEL,
  SAFETY_NET_TEMPLATE_ID,
  buildDefaultSNLoadTestRow,
  computeSNVerdictSuggestion,
  snTotalWeight,
  type SafetyNetInspection,
  type SNVerdict,
  type SNResult,
  type SNPostResult,
} from '../../../types/safetyNet';

// ── Step constants ────────────────────────────────────────────────────────────
const NET_ID_STEP     = 1;
const INSPECTION_STEP = 2;
const CONCLUSION_STEP = 3;
const DOCS_STEP       = 4;
const TOTAL_STEPS     = 4;

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SafetyNetInspectionScreen() {
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
  } = useInspectionFlow<SafetyNetInspection>({
    id,
    firstStep: NET_ID_STEP,
    lastStep: DOCS_STEP,
    persistPrefix: 'safety-net-wizard',
    templateId: SAFETY_NET_TEMPLATE_ID,
    schema: safetyNetSchema,
    api: safetyNetApi,
    toPatch: (insp) => ({
      company: insp.company,
      address: insp.address,
      inspectorName: insp.inspectorName,
      inspectionDate: insp.inspectionDate,
      manufacturer: insp.manufacturer,
      netSize: insp.netSize,
      postSize: insp.postSize,
      postCount: insp.postCount,
      postAnchorCount: insp.postAnchorCount,
      anchorPointCount: insp.anchorPointCount,
      edgeRopeCount: insp.edgeRopeCount,
      cellSide: insp.cellSide,
      workingDistance: insp.workingDistance,
      certificate: insp.certificate,
      items: insp.items,
      loadTestRows: insp.loadTestRows,
      postTestItems: insp.postTestItems,
      verdict: insp.verdict,
      verdictComment: insp.verdictComment,
      qualDocPath: insp.qualDocPath,
      summaryPhotos: insp.summaryPhotos,
    }),
    validateMissing: (insp) => (insp.verdict ? [] : ['დასკვნა']),
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
      nameLabel: 'SafetyNetInspection',
      title: 'უსაფრთხოების ბადის შემოწმების აქტი',
      subject: 'შრომის უსაფრთხოება',
    },
    loadingTitle: 'ბადის შემოწმება',
  });

  // ── Items ───────────────────────────────────────────────────────────────────

  const updateItem = useCallback((itemId: number, patch: { result?: SNResult | null; comment?: string | null }) => {
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i => i.id === itemId ? { ...i, ...patch } : i);
      const next = { ...prev, items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, setInspection]);

  const updatePostTestItem = useCallback((itemId: number, result: SNPostResult | null) => {
    setInspection(prev => {
      if (!prev) return prev;
      const postTestItems = prev.postTestItems.map(i => i.id === itemId ? { ...i, result } : i);
      const next = { ...prev, postTestItems };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, setInspection]);

  // ── Load test rows ──────────────────────────────────────────────────────────

  const handleLoadTestChange = useCallback((rows: Record<string, any>[]) => {
    setInspection(prev => {
      if (!prev) return prev;
      const loadTestRows = rows.map(r => ({
        ...r,
        totalWeightKg: (r.unitWeightKg != null && r.quantity != null)
          ? r.unitWeightKg * r.quantity
          : null,
      })) as typeof prev.loadTestRows;
      const next = { ...prev, loadTestRows };
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
      const path = await safetyNetApi.uploadPhoto(insp.id, itemId, result.uri);
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
      await safetyNetApi.deletePhoto(path);
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

  const handleAddQualDoc = useCallback(async () => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await safetyNetApi.uploadPhoto(insp.id, 'qual-doc', result.uri);
      setInspection(prev => {
        if (!prev) return prev;
        const next = { ...prev, qualDocPath: path };
        scheduleSave(next);
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  }, [pickPhotoWithAnnotation, scheduleSave, toast, inspectionRef, setInspection]);

  const handleDeleteQualDoc = useCallback(async () => {
    const insp = inspectionRef.current;
    if (!insp?.qualDocPath) return;
    try {
      await safetyNetApi.deletePhoto(insp.qualDocPath);
    } catch {
      // best-effort
    }
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, qualDocPath: null };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, inspectionRef, setInspection]);

  const handleAddSummaryPhoto = useCallback(async () => {
    const result = await pickPhotoWithAnnotation();
    if (!result) return;
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await safetyNetApi.uploadPhoto(insp.id, 'summary', result.uri);
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
      await safetyNetApi.deletePhoto(path);
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
    () => inspection ? computeSNVerdictSuggestion(inspection.items, inspection.postTestItems) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inspection?.items, inspection?.postTestItems],
  );

  // ── Step navigation ─────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === CONCLUSION_STEP) return !!inspection.verdict;
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, inspection]);

  const handleNext = useCallback(async () => {
    if (step === DOCS_STEP) {
      await complete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, complete, setStep]);

  const handlePrev = useCallback(async () => {
    if (step === NET_ID_STEP) {
      await exit();
    } else {
      setStep(s => s - 1);
    }
  }, [step, exit, setStep]);

  // ── Loading & completed ─────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'ბადის შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
    );
  }

  if (inspection.status === 'completed' && !celebrating) {
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName="უსაფრთხოების ბადე"
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle="ბადის შემოწმება"
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

      {pdfLocked && <PdfLockedBanner onSubscribe={() => setPaywallVisible(true)} />}

      <View style={{ flex: 1 }}>
        <WizardStepTransition stepKey={step} direction={direction} animate={animateSteps}>

          {/* ── Step 1: Net ID ───────────────────────────────────────────────── */}
          {step === NET_ID_STEP && (
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
                  { label: 'მწარმოებელი', value: inspection.manufacturer, onChange: v => update('manufacturer', v) },
                  { label: 'ბადის ზომა მ×მ', value: inspection.netSize, onChange: v => update('netSize', v) },
                  { label: 'დგარის ზომა', value: inspection.postSize, onChange: v => update('postSize', v) },
                  { label: 'დგარების რ-ბა', value: inspection.postCount != null ? String(inspection.postCount) : '', type: 'number', onChange: v => { const n = parseInt(v, 10); update('postCount', isNaN(n) ? null : n); } },
                  { label: 'დგარის სამაგრების რ-ბა', value: inspection.postAnchorCount != null ? String(inspection.postAnchorCount) : '', type: 'number', onChange: v => { const n = parseInt(v, 10); update('postAnchorCount', isNaN(n) ? null : n); } },
                  { label: 'სამაგრი წერტილების რ-ბა', value: inspection.anchorPointCount != null ? String(inspection.anchorPointCount) : '', type: 'number', onChange: v => { const n = parseInt(v, 10); update('anchorPointCount', isNaN(n) ? null : n); } },
                  { label: 'კიდის ბაგირების რ-ბა', value: inspection.edgeRopeCount != null ? String(inspection.edgeRopeCount) : '', type: 'number', onChange: v => { const n = parseInt(v, 10); update('edgeRopeCount', isNaN(n) ? null : n); } },
                  { label: 'უჯრედის მხარე', value: inspection.cellSide, onChange: v => update('cellSide', v) },
                  { label: 'სამუშაო მანძილი', value: inspection.workingDistance, onChange: v => update('workingDistance', v) },
                  {
                    label: 'ბადის სერტიფიკატი',
                    value: inspection.certificate ?? '',
                    type: 'chips',
                    options: ['none', 'active', 'expired'],
                    optionLabels: ['სერტ. არ გააჩნია', 'მოქმედი სერტ.', 'ვადაგასული'],
                    onChange: v => update('certificate', v as SafetyNetInspection['certificate']),
                    isProblematic: inspection.certificate === 'expired' || inspection.certificate === 'none',
                  },
                ]}
                columns={1}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Inspection ───────────────────────────────────────────── */}
          {step === INSPECTION_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 8 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <ChecklistSection
                title="ვიზუალური შემოწმება"
                items={SN_VISUAL_ITEMS.map(e => {
                  const state = inspection.items.find(i => i.id === e.id)
                    ?? { id: e.id, result: null, comment: null, photo_paths: [] };
                  return {
                    id: e.id,
                    label: e.label,
                    description: e.description || undefined,
                    type: 'three_state' as const,
                    options: { a: 'good', b: 'fix', c: 'N/A', cIsNeutral: true },
                    value: state.result === 'na' ? 'N/A' : state.result,
                    comment: state.comment,
                    photoPaths: state.photo_paths ?? [],
                  };
                })}
                onItemChange={(itemId, field, val) => {
                  if (field === 'value') {
                    const result: SNResult | null = val === 'N/A' ? 'na' : val as SNResult | null;
                    updateItem(itemId, { result });
                  } else {
                    updateItem(itemId, { comment: val });
                  }
                }}
                onAddPhoto={handleAddItemPhoto}
                onDeletePhoto={handleDeleteItemPhoto}
              />

              <Text style={styles.loadInstruction}>
                180კგ-ის სიმძიმე 1მ სიმაღლიდან — №477 დადგენილება
              </Text>

              <DynamicTable
                columns={[
                  { key: 'name', label: 'დასახელება', type: 'text' },
                  { key: 'unitWeightKg', label: 'ერთ.წ.(კგ)', type: 'number', keyboardType: 'decimal-pad' },
                  { key: 'quantity', label: 'რ-ბა', type: 'number', keyboardType: 'numeric' },
                  { key: 'totalWeightKg', label: 'სულ(კგ)', type: 'readonly' },
                  { key: 'comment', label: 'კომ.', type: 'text' },
                ]}
                rows={inspection.loadTestRows}
                onChange={handleLoadTestChange}
                onBuildDefaultRow={buildDefaultSNLoadTestRow}
                minRows={0}
                footer={
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.totalLabel}>სულ:</Text>
                    <Text style={styles.totalValue}>{snTotalWeight(inspection.loadTestRows)} კგ</Text>
                  </View>
                }
              />

              <ChecklistSection
                title="ტვირთის ჩაგდების შემდეგ შემოწმება"
                items={SN_POST_TEST_ITEMS.map(e => {
                  const state = inspection.postTestItems.find(i => i.id === e.id)
                    ?? { id: e.id, result: null };
                  return {
                    id: e.id,
                    label: e.label,
                    type: 'binary' as const,
                    options: { a: 'pass', b: 'fail' },
                    value: state.result,
                  };
                })}
                onItemChange={(itemId, field, val) => {
                  if (field === 'value') {
                    updatePostTestItem(itemId, val as SNPostResult | null);
                  }
                }}
                onAddPhoto={() => {}}
                onDeletePhoto={() => {}}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 3: Conclusion ───────────────────────────────────────────── */}
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
                    შემოთავაზება: {SN_VERDICT_LABEL[suggestedVerdict]}
                  </Text>
                </Pressable>
              )}

              <Text style={styles.fieldLabel}>დასკვნა *</Text>
              <VerdictSelector
                options={[
                  { value: 'pass', label: SN_VERDICT_LABEL.pass, type: 'success' },
                  { value: 'fail', label: SN_VERDICT_LABEL.fail, type: 'danger' },
                ]}
                value={inspection.verdict}
                onChange={v => update('verdict', v as SNVerdict)}
                note={inspection.verdictComment}
                onNoteChange={v => update('verdictComment', v)}
                notePlaceholder="კომენტარი"
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 4: Documents & Photos ──────────────────────────────────── */}
          {step === DOCS_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.stepBody}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <Text style={styles.fieldLabel}>კვალიფიკაციის / სერტიფიკატის დოკუმენტი</Text>
              <QualDoc
                photoPath={inspection.qualDocPath}
                onAdd={handleAddQualDoc}
                onDelete={handleDeleteQualDoc}
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
          {step === DOCS_STEP ? (
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

    loadInstruction: {
      fontSize: 11, color: theme.colors.inkSoft, fontStyle: 'italic',
      backgroundColor: theme.colors.warnSoft,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 6, borderLeftWidth: 3, borderLeftColor: theme.colors.warn,
    },

    totalLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.ink },
    totalValue: { fontSize: 18, fontWeight: '800', color: theme.colors.accent },

    suggestBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.colors.warnSoft,
      padding: 10, borderRadius: 8,
    },
    suggestText: { fontSize: 12, color: theme.colors.inkSoft, flex: 1 },
  });
}
