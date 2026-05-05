import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../../components/DateTimeField';
import { Button } from '../../../components/ui';
import { KeyboardSafeArea } from '../../../components/layout/KeyboardSafeArea';
import { SignatureCanvas } from '../../../components/SignatureCanvas';

import { WizardStepTransition } from '../../../components/wizard/WizardStepTransition';

import { FlowHeader } from '../../../components/FlowHeader';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { generalEquipmentApi } from '../../../lib/generalEquipmentService';
import { projectsApi } from '../../../lib/services';
import { buildGeneralEquipmentPdfHtml } from '../../../lib/generalEquipmentPdf';
import { generateAndSharePdf } from '../../../lib/pdfOpen';
import { generatePdfName } from '../../../lib/pdfName';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import { imageForDisplay } from '../../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SuggestionPills } from '../../../components/SuggestionPills';
import { useFieldHistory } from '../../../hooks/useFieldHistory';
import {
  buildDefaultEquipmentRow,
  INSPECTION_TYPE_LABEL,
  type GeneralEquipmentInspection,
  type EquipmentItem,
  type GEInspectionType,
} from '../../../types/generalEquipment';

const INFO_STEP = 0;
const CHECKLIST_STEP = 1;
const CONCLUSION_STEP = 2;
const DONE_STEP = 3;
const TOTAL_STEPS = 3;

export default function GeneralEquipmentScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();

  const userId = session?.state?.status === 'signedIn' ? session.state.session.user.id : null;

  // ── Field suggestion histories ────────────────────────────────────────────
  const objectNameHistory = useFieldHistory(userId, 'ge:objectName');
  const addressHistory = useFieldHistory(userId, 'ge:address');
  const activityTypeHistory = useFieldHistory(userId, 'ge:activityType');
  const actNumberHistory = useFieldHistory(userId, 'ge:actNumber');
  const inspectorNameHistory = useFieldHistory(userId, 'ge:inspectorName');
  const conclusionHistory = useFieldHistory(userId, 'ge:conclusion');
  const signerNameHistory = useFieldHistory(userId, 'ge:signerName');

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [inspection, setInspection] = useState<GeneralEquipmentInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showSig, setShowSig] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

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
      console.log('[GE] no id, skipping load');
      return;
    }
    console.log('[GE] loading inspection:', id);
    let cancelled = false;
    (async () => {
      try {
        const insp = await generalEquipmentApi.getById(id);
        console.log('[GE] loaded:', insp ? 'found' : 'null', 'cancelled:', cancelled);
        if (cancelled) return;
        if (!insp) { console.log('[GE] inspection not found, going back'); router.back(); return; }

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
          if (!isNaN(s) && s >= 0 && s <= 2) setStep(s);
        }

        projectsApi.getById(insp.projectId).then(p => {
          if (cancelled || !p) return;
          setProjectName(p.company_name || p.name);
        }).catch(() => {});
      } catch (e) {
        console.log('[GE] load error:', e);
        if (!cancelled) {
          toast.error(friendlyError(e, 'ვერ ჩაიტვირთა'));
          router.back();
        }
      } finally {
        if (!cancelled) {
          console.log('[GE] load complete, setting loading=false');
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

  const handleAddSummaryPhoto = useCallback(() => {
    Alert.alert('ფოტოს წყარო', undefined, [
      {
        text: 'კამერა',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { toast.error('კამერაზე წვდომა დაუშვებულია'); return; }
          const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadSummaryPhoto(res.assets[0].uri);
        },
      },
      {
        text: 'გალერეა',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { toast.error('გალერეაზე წვდომა დაუშვებულია'); return; }
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadSummaryPhoto(res.assets[0].uri);
        },
      },
      { text: 'გაუქმება', style: 'cancel' },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadSummaryPhoto = async (uri: string) => {
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await generalEquipmentApi.uploadPhoto(insp.id, 'summary', 'summary', uri);
      setInspection(prev => {
        if (!prev) return prev;
        const next = { ...prev, summaryPhotos: [...prev.summaryPhotos, path] };
        scheduleSave(next);
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  };

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

  // ── Signature ────────────────────────────────────────────────────────────────

  const handleSignatureConfirm = useCallback((base64Png: string) => {
    setShowSig(false);
    update('inspectorSignature', base64Png);
  }, [update]);

  // ── Complete ─────────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!inspection || completing) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const missing: string[] = [];
    if (!inspection.objectName?.trim())    missing.push('ობიექტის დასახელება');
    if (!inspection.conclusion?.trim())    missing.push('დასკვნა');
    if (!inspection.inspectorSignature)    missing.push('ხელმოწერა');
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
      await generateAndSharePdf(html, pdfName);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setGeneratingPdf(false);
    }
  }, [inspection, projectName, toast]);

  // ── PDF Preview ──────────────────────────────────────────────────────────────

  const buildPreview = useCallback(async () => {
    if (!inspection) return;
    setPreviewBusy(true);
    try {
      const html = await buildGeneralEquipmentPdfHtml({
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
    if (inspection?.status === 'completed') {
      buildPreview();
    }
  }, [inspection, buildPreview]);

  // ── Step navigation ──────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection || step >= TOTAL_STEPS) return false;
    if (step === INFO_STEP) return !!inspection.objectName?.trim();
    if (step === CHECKLIST_STEP) {
      return inspection.equipment.length > 0 && inspection.equipment.every(r => !!r.condition);
    }
    if (step === CONCLUSION_STEP) return !!inspection.conclusion?.trim() && !!inspection.inspectorSignature && !completing;
    return true;
  }, [step, inspection, completing, CONCLUSION_STEP]);

  const handleNext = useCallback(() => {
    if (step === CONCLUSION_STEP) {
      handleComplete();
    } else if (step < CONCLUSION_STEP) {
      setStep(s => s + 1);
    }
  }, [step, CONCLUSION_STEP, handleComplete]);

  const handlePrev = useCallback(() => {
    if (step > 0) {
      setStep(s => s - 1);
    } else {
      router.back();
    }
  }, [step, router]);

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
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <FlowHeader
          flowTitle="ტექ. აღჭ."
          project={projectName ? { name: projectName } : null}
          leading="back"
          onBack={() => router.back()}
          trailingElement={
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
          }
        />
        <View style={{ flex: 1, backgroundColor: theme.colors.subtleSurface }}>
          {previewBusy && !previewHtml ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={{ color: theme.colors.inkSoft }}>PDF-ის მომზადება…</Text>
            </View>
          ) : previewHtml ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: previewHtml }}
              style={{ flex: 1, backgroundColor: '#fff' }}
              scalesPageToFit
              javaScriptEnabled={false}
              domStorageEnabled={false}
            />
          ) : null}
        </View>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.hairline }}>
          <View style={{ paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8 }}>
            <Button
              title="PDF გენერირება / გაზიარება"
              onPress={handlePdf}
              loading={generatingPdf}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle="ტექ. აღჭ."
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
        onBack={step === INFO_STEP ? async () => { await AsyncStorage.removeItem(persistKey); router.back(); } : handlePrev}
        backDisabled={false}
      />

      {saving && (
        <Text style={styles.savingHint}>შენახვა…</Text>
      )}

      <KeyboardSafeArea>
        <WizardStepTransition
          stepKey={step}
          direction={direction}
          animate={animateSteps}
        >
          {/* ── Step 0: General info ───────────────────────────────────────── */}
          {step === INFO_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 8, paddingTop: 16, paddingBottom: 24, gap: 12 }}
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
                label="მისამართი"
                value={inspection.address ?? ''}
                onChangeText={v => update('address', v || null)}
                onFocus={() => setFocusedField('address')}
                onBlur={() => {
                  setFocusedField(null);
                  if (inspection.address?.trim()) addressHistory.addToHistory(inspection.address.trim());
                }}
              />
              <SuggestionPills
                suggestions={addressHistory.suggestions}
                onSelect={v => update('address', v)}
                visible={focusedField === 'address' || (!inspection.address?.trim() && addressHistory.suggestions.length > 0)}
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

              <FloatingLabelInput
                label="შემომწმებელი"
                value={inspection.inspectorName ?? ''}
                onChangeText={v => update('inspectorName', v || null)}
                onFocus={() => setFocusedField('inspectorName')}
                onBlur={() => {
                  setFocusedField(null);
                  if (inspection.inspectorName?.trim()) inspectorNameHistory.addToHistory(inspection.inspectorName.trim());
                }}
              />
              <SuggestionPills
                suggestions={inspectorNameHistory.suggestions}
                onSelect={v => update('inspectorName', v)}
                visible={focusedField === 'inspectorName' || (!inspection.inspectorName?.trim() && inspectorNameHistory.suggestions.length > 0)}
              />
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 1: Equipment list ─────────────────────────────────────── */}
          {step === CHECKLIST_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
                <View style={styles.progressPill}>
                  <Text style={styles.progressPillText}>
                    შევსებულია {filledCount} / {totalCount}
                  </Text>
                </View>
              </View>

              {inspection.equipment.map((item, index) => (
                <View key={item.id} style={styles.listRow}>
                  <View style={styles.listRowText}>
                    <Text style={styles.listRowNumber}>{index + 1}.</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listRowLabel, { fontSize: 13, fontWeight: '400' }]} numberOfLines={2}>{item.model} · {item.serialNumber}</Text>
                    </View>
                  </View>
                  <View style={styles.listRowActions}>
                    <Pressable style={[styles.statusBtn, item.condition==='good' ? styles.statusBtnGoodActive : styles.statusBtnGood]} onPress={() => updateCondition(index, 'good')}>
                      <Ionicons name="checkmark" size={22} color={item.condition==='good' ? '#fff' : theme.colors.semantic.success} />
                    </Pressable>
                    <Pressable style={[styles.statusBtn, item.condition==='needs_service' ? styles.statusBtnDefActive : styles.statusBtnDef]} onPress={() => updateCondition(index, 'needs_service')}>
                      <Ionicons name="warning" size={20} color={item.condition==='needs_service' ? '#fff' : theme.colors.warn} />
                    </Pressable>
                    <Pressable style={[styles.statusBtn, item.condition==='unusable' ? styles.statusBtnBadActive : styles.statusBtnBad]} onPress={() => updateCondition(index, 'unusable')}>
                      <Ionicons name="close" size={20} color={item.condition==='unusable' ? '#fff' : theme.colors.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}

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
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Conclusion ─────────────────────────────────────────── */}
          {step === CONCLUSION_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <FloatingLabelInput
                label="დასკვნა *"
                value={inspection.conclusion ?? ''}
                onChangeText={v => update('conclusion', v || null)}
                onFocus={() => setFocusedField('conclusion')}
                onBlur={() => {
                  setFocusedField(null);
                  if (inspection.conclusion?.trim()) conclusionHistory.addToHistory(inspection.conclusion.trim());
                }}
                multiline
                numberOfLines={4}
                required
              />
              <SuggestionPills
                suggestions={conclusionHistory.suggestions}
                onSelect={v => update('conclusion', v)}
                visible={focusedField === 'conclusion' || (!inspection.conclusion?.trim() && conclusionHistory.suggestions.length > 0)}
              />

              <Pressable
                style={[styles.sigRow, inspection.inspectorSignature && styles.sigRowActive]}
                onPress={() => setShowSig(true)}
                {...a11y('ხელმოწერა', 'შემომწმებლის ხელმოწერის დამატება', 'button')}
              >
                <Text style={styles.sigRowText}>
                  {inspection.inspectorSignature ? '✓ ხელმოწერა დაყენებულია' : 'ხელმოწერა *'}
                </Text>
                {inspection.inspectorSignature && (
                  <Pressable
                    onPress={() => update('inspectorSignature', null)}
                    hitSlop={10}
                    {...a11y('ხელმოწერის წაშლა', undefined, 'button')}
                  >
                    <Text style={styles.sigRowClear}>წაშლა</Text>
                  </Pressable>
                )}
              </Pressable>

              {completing && (
                <View style={styles.completingRow}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.completingText}>მიმდინარეობს…</Text>
                </View>
              )}
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 3: Done ────────────────────────────────────────────── */}
          {step === DONE_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 4, paddingTop: 16, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <Text style={styles.doneTitle}>შემოწმება დასრულდა!</Text>
              {inspection.completedAt && (
                <Text style={styles.doneDate}>
                  {new Date(inspection.completedAt).toLocaleDateString('ka-GE', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </Text>
              )}

              <Button
                title="PDF გენერირება / გაზიარება"
                onPress={handlePdf}
                loading={generatingPdf}
                style={{ marginBottom: 12 }}
              />
              <Button
                title="პროექტზე დაბრუნება"
                variant="secondary"
                onPress={() => router.back()}
              />
            </KeyboardAwareScrollView>
          )}
        </WizardStepTransition>

        {step !== DONE_STEP && (
          <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
            {step === CONCLUSION_STEP ? (
              <Button
                title="დასრულება"
                style={{ paddingVertical: 14 }}
                iconRight={<Ionicons name="checkmark" size={20} color={theme.colors.white} />}
                loading={completing}
                disabled={!canGoNext || completing}
                onPress={handleComplete}
              />
            ) : (
              <Button
                title={canGoNext ? 'შემდეგი' : 'გაგრძელება'}
                variant={canGoNext ? 'primary' : 'secondary'}
                size="lg"
                style={{ alignSelf: 'stretch', paddingVertical: 16, justifyContent: 'center' }}
                iconRight={
                  canGoNext ? (
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.white} />
                  ) : undefined
                }
                onPress={handleNext}
              />
            )}
          </View>
        )}
      </KeyboardSafeArea>

      <SignatureCanvas
        visible={showSig}
        personName={inspection.signerName ?? 'შემომწმებელი'}
        onCancel={() => setShowSig(false)}
        onConfirm={handleSignatureConfirm}
      />
    </View>
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
    root:    { flex: 1, backgroundColor: theme.colors.card },
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
      paddingHorizontal: 12, paddingVertical: 8,
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
