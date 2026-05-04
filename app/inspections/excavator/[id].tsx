import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../../components/DateTimeField';
import { Button } from '../../../components/ui';
import { KeyboardSafeArea } from '../../../components/layout/KeyboardSafeArea';
import { SignatureCanvas } from '../../../components/SignatureCanvas';
import { ExcavatorMaintenanceItem } from '../../../components/excavator/ExcavatorMaintenanceItem';

import { WizardStepTransition } from '../../../components/wizard/WizardStepTransition';

import { StepSectionLabel } from '../../../components/wizard/StepSectionLabel';
import { FlowHeader } from '../../../components/FlowHeader';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { useBottomSheet } from '../../../components/BottomSheet';
import { excavatorApi } from '../../../lib/excavatorService';
import { projectsApi } from '../../../lib/services';
import { buildExcavatorPdfHtml } from '../../../lib/excavatorPdf';
import { generateAndSharePdf } from '../../../lib/pdfOpen';
import { generatePdfName } from '../../../lib/pdfName';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ENGINE_ITEMS,
  UNDERCARRIAGE_ITEMS,
  CABIN_ITEMS,
  SAFETY_ITEMS,
  MAINTENANCE_ITEMS,
  EXCAVATOR_VERDICT_LABEL,
  EXCAVATOR_MACHINE_SPECS,
  computeExcavatorVerdictSuggestion,
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

export default function ExcavatorInspectionScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const showSheet = useBottomSheet();

  const [inspection, setInspection] = useState<ExcavatorInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showSig, setShowSig] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  // Step state
  const [step, setStep] = useState(0);
  const prevStepRef = useRef(0);
  const [animateSteps, setAnimateSteps] = useState(false);
  const inspectionRef = useRef<ExcavatorInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  const INFO_STEP = 0;
  const CHECKLIST_STEP = 1;
  const CONCLUSION_STEP = 2;
  const SIGNATURE_STEP = 3;
  const DONE_STEP = 4;
  const TOTAL_STEPS = 4;

  const persistKey = useMemo(() => `excavator-wizard:${id}:step`, [id]);
  const summaryPhotosKey = useMemo(() => `excavator-wizard:${id}:summaryPhotos`, [id]);

  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) {
      console.log('[Excavator] no id, skipping load');
      return;
    }
    console.log('[Excavator] loading inspection:', id);
    let cancelled = false;
    (async () => {
      try {
        const insp = await excavatorApi.getById(id);
        console.log('[Excavator] loaded:', insp ? 'found' : 'null', 'cancelled:', cancelled);
        if (cancelled) return;
        if (!insp) { console.log('[Excavator] inspection not found, going back'); router.back(); return; }

        if (insp.status === 'completed') {
          // Will render result view instead of wizard
        }

        let patched = insp;
        if (!insp.inspectorName && session.state.status === 'signedIn') {
          const u = session.state.user;
          const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
          if (name) patched = { ...patched, inspectorName: name };
        }
        setInspection(patched);

        // Load summary photos from AsyncStorage
        const savedPhotos = await AsyncStorage.getItem(summaryPhotosKey);
        if (savedPhotos && !cancelled) {
          try {
            const parsed = JSON.parse(savedPhotos);
            if (Array.isArray(parsed)) {
              setInspection(prev => prev ? { ...prev, summaryPhotos: parsed } : prev);
            }
          } catch {}
        }

        const saved = await AsyncStorage.getItem(persistKey);
        if (saved && !cancelled) {
          const s = parseInt(saved, 10);
          if (!isNaN(s) && s >= 0 && s <= DONE_STEP) {
            setStep(s);
          }
        }

        projectsApi.getById(insp.projectId).then(p => {
          if (cancelled || !p) return;
          setProjectName(p.company_name || p.name);
          setInspection(prev => {
            if (!prev) return prev;
            const projectNameFill = !prev.projectName?.trim() ? (p.company_name || p.name) : null;
            if (!projectNameFill) return prev;
            const next = { ...prev, projectName: projectNameFill };
            excavatorApi.patch(next.id, { projectName: next.projectName }).catch(() => {});
            return next;
          });
        }).catch(() => {});

      } catch (e) {
        console.log('[Excavator] load error:', e);
        if (!cancelled) {
          toast.error(friendlyError(e, 'ვერ ჩაიტვირთა'));
          router.back();
        }
      } finally {
        if (!cancelled) {
          console.log('[Excavator] load complete, setting loading=false');
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
    AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
  }, [step, persistKey]);

  // ── Auto-save (debounced) ──────────────────────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((insp: ExcavatorInspection) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      excavatorApi.patch(insp.id, {
        serialNumber: insp.serialNumber,
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
        inspectorPosition: insp.inspectorPosition,
        inspectorSignature: insp.inspectorSignature,
      }).catch(e => {
        toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      }).finally(() => setSaving(false));
    }, 700);
  }, [toast]);

  const update = useCallback(<K extends keyof ExcavatorInspection>(
    key: K,
    value: ExcavatorInspection[K],
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

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
  }, [scheduleSave]);

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
  }, [scheduleSave]);

  // ── Photo handling ─────────────────────────────────────────────────────────

  const handleAddPhoto = useCallback((section: Section, itemId: number) => {
    Alert.alert('ფოტოს წყარო', undefined, [
      {
        text: 'კამერა',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { toast.error('კამერაზე წვდომა დახურულია'); return; }
          const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadPhoto(section, itemId, res.assets[0].uri);
        },
      },
      {
        text: 'გალერეა',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { toast.error('გალერეაზე წვდომა დახურულია'); return; }
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadPhoto(section, itemId, res.assets[0].uri);
        },
      },
      { text: 'გაუქმება', style: 'cancel' },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadPhoto = async (section: Section, itemId: number, uri: string) => {
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await excavatorApi.uploadPhoto(insp.id, section, itemId, uri);
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
  };

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
  }, [scheduleSave, toast]);

  // ── Signature ──────────────────────────────────────────────────────────────

  const handleSignatureConfirm = useCallback((base64Png: string) => {
    setShowSig(false);
    update('inspectorSignature', base64Png);
  }, [update]);

  // ── Verdict auto-suggestion ────────────────────────────────────────────────

  const verdictSuggestion = useMemo(
    () => inspection ? computeExcavatorVerdictSuggestion(inspection) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inspection?.engineItems, inspection?.undercarriageItems, inspection?.cabinItems, inspection?.safetyItems],
  );

  const showVerdictBanner = verdictSuggestion !== null && inspection?.verdict !== verdictSuggestion;

  // ── Complete ───────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!inspection || completing) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const missing: string[] = [];
    if (!inspection.serialNumber?.trim()) missing.push('სერიული ნომერი');
    if (!inspection.verdict)              missing.push('დასკვნა');
    if (!inspection.inspectorSignature)   missing.push('ხელმოწერა');
    if (missing.length > 0) {
      Alert.alert('შეავსეთ სავალდებულო ველები', missing.map(m => `• ${m}`).join('\n'));
      return;
    }
    setCompleting(true);
    try {
      await excavatorApi.patch(inspection.id, {
        serialNumber: inspection.serialNumber,
        inventoryNumber: inspection.inventoryNumber,
        projectName: inspection.projectName,
        department: inspection.department,
        inspectionDate: inspection.inspectionDate,
        motoHours: inspection.motoHours,
        inspectorName: inspection.inspectorName,
        lastInspectionDate: inspection.lastInspectionDate,
        engineItems: inspection.engineItems,
        undercarriageItems: inspection.undercarriageItems,
        cabinItems: inspection.cabinItems,
        safetyItems: inspection.safetyItems,
        maintenanceItems: inspection.maintenanceItems,
        verdict: inspection.verdict,
        notes: inspection.notes,
        inspectorPosition: inspection.inspectorPosition,
        inspectorSignature: inspection.inspectorSignature,
      });
      await excavatorApi.complete(inspection.id);
      const completedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        inspection.id,
        completedAt,
        `${inspection.projectId}:excavator`,
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

  // ── PDF ────────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    if (!inspection) return;
    setGeneratingPdf(true);
    try {
      const html = await buildExcavatorPdfHtml({
        inspection,
        projectName: projectName || 'პროექტი',
      });
      const pdfName = generatePdfName(
        projectName || 'project',
        'ExcavatorInspection',
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

  // ── Summary Photos ─────────────────────────────────────────────────────────

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
      const path = await excavatorApi.uploadSummaryPhoto(insp.id, uri);
      setInspection(prev => {
        if (!prev) return prev;
        const next = { ...prev, summaryPhotos: [...(prev.summaryPhotos ?? []), path] };
        AsyncStorage.setItem(summaryPhotosKey, JSON.stringify(next.summaryPhotos)).catch(() => {});
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  };

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
  }, [summaryPhotosKey, toast]);

  // ── PDF Preview ────────────────────────────────────────────────────────────

  const buildPreview = useCallback(async () => {
    if (!inspection) return;
    setPreviewBusy(true);
    try {
      const html = await buildExcavatorPdfHtml({
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

  const counts = useMemo(() => {
    const good = flatState.filter(s => s.result === 'good').length;
    const deficient = flatState.filter(s => s.result === 'deficient').length;
    const unusable = flatState.filter(s => s.result === 'unusable').length;
    return { good, deficient, unusable, total: FLAT_CATALOG.length };
  }, [flatState]);

  // ── Step navigation ────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === INFO_STEP) return !!inspection.projectName?.trim() && !!inspection.inspectorName?.trim();
    if (step === CHECKLIST_STEP) return flatState.every(s => s.result !== null);
    if (step === CONCLUSION_STEP) return !!inspection.verdict;
    if (step === SIGNATURE_STEP) return !!inspection.inspectorSignature && !completing;
    return false;
  }, [step, inspection, flatState, completing, SIGNATURE_STEP, CONCLUSION_STEP]);

  const handleNext = useCallback(() => {
    if (step === SIGNATURE_STEP) {
      handleComplete();
    } else if (step < SIGNATURE_STEP) {
      setStep(s => s + 1);
    }
  }, [step, SIGNATURE_STEP, handleComplete]);

  const handlePrev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  // ── List item update helper ────────────────────────────────────────────────

  const updateItem = useCallback((itemId: number, result: 'good' | 'deficient' | 'unusable') => {
    const flatIndex = FLAT_CATALOG.findIndex(e => e.entry.id === itemId);
    if (flatIndex >= 0) updateFlatItem(flatIndex, { result });
  }, [updateFlatItem]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
    );
  }

  // ── Completed inspection result view ───────────────────────────────────────
  if (inspection.status === 'completed') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
        <FlowHeader
          flowTitle="ექსკავატორი"
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
          <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
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
        flowTitle="ექსკავატორი"
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
          ) : undefined
        }
        onBack={step === 0 ? () => router.back() : handlePrev}
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
          {/* ── Step 0: Document Info ───────────────────────────────────── */}
          {step === 0 && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <MachineSpecsCard insp={inspection} styles={styles} />

              <StepSectionLabel title="II — დოკუმენტის ინფორმაცია" />
              <FloatingLabelInput
                label="სერიული ნომერი *"
                value={inspection.serialNumber ?? ''}
                onChangeText={v => update('serialNumber', v || null)}
                required
              />
              <FloatingLabelInput
                label="საინვენტარო ნომერი"
                value={inspection.inventoryNumber ?? ''}
                onChangeText={v => update('inventoryNumber', v || null)}
              />
              <FloatingLabelInput
                label="ობიექტი / პროექტი"
                value={inspection.projectName ?? ''}
                onChangeText={v => update('projectName', v || null)}
              />
              <FloatingLabelInput
                label="განყოფილება"
                value={inspection.department ?? ''}
                onChangeText={v => update('department', v || null)}
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
                label="მოტო საათები"
                value={inspection.motoHours != null ? String(inspection.motoHours) : ''}
                onChangeText={v => update('motoHours', v ? Number(v) : null)}
                keyboardType="numeric"
              />
              <FloatingLabelInput
                label="შემომწმებელი"
                value={inspection.inspectorName ?? ''}
                onChangeText={v => update('inspectorName', v || null)}
              />
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>ბოლო შემოწმების თარიღი</Text>
                <DateTimeField
                  mode="date"
                  value={inspection.lastInspectionDate ? new Date(inspection.lastInspectionDate) : new Date()}
                  onChange={d => update('lastInspectionDate', d.toLocaleDateString('en-CA'))}
                  maxDate={new Date()}
                />
              </View>
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 1: Checklist list + Maintenance ────────────────────── */}
          {step === CHECKLIST_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <StepSectionLabel title="III — ჩეკლისტი" />
              {FLAT_CATALOG.map((entry, index) => {
                const state = flatState[index];
                const result = state.result;
                const isFirstInSection = index === 0 || FLAT_CATALOG[index - 1].section !== entry.section;
                return (
                  <View key={entry.entry.id}>
                    {isFirstInSection && (
                      <Text style={styles.sectionHeader}>{entry.sectionLabel}</Text>
                    )}
                    <View style={styles.listRow}>
                      <View style={styles.listRowText}>
                        <Text style={styles.listRowNumber}>{index + 1}.</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.listRowLabel}>{entry.entry.label}</Text>
                          <Text style={styles.listRowDesc}>{entry.entry.description}</Text>
                        </View>
                      </View>
                      <View style={styles.listRowActions}>
                        <Pressable
                          style={[styles.statusBtn, result === 'good' && styles.statusBtnGoodActive]}
                          onPress={() => updateItem(entry.entry.id, 'good')}
                        >
                          <Ionicons name="checkmark" size={22} color={result === 'good' ? '#fff' : theme.colors.semantic.success} />
                        </Pressable>
                        <Pressable
                          style={[styles.statusBtn, result === 'deficient' && styles.statusBtnDefActive]}
                          onPress={() => updateItem(entry.entry.id, 'deficient')}
                        >
                          <Ionicons name="warning" size={20} color={result === 'deficient' ? '#fff' : theme.colors.warn} />
                        </Pressable>
                        <Pressable
                          style={[styles.statusBtn, result === 'unusable' && styles.statusBtnBadActive]}
                          onPress={() => updateItem(entry.entry.id, 'unusable')}
                        >
                          <Ionicons name="close" size={20} color={result === 'unusable' ? '#fff' : theme.colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                    {(state.photo_paths?.length ?? 0) > 0 && (
                      <View style={styles.photoRow}>
                        {state.photo_paths.map(path => (
                          <View key={path} style={styles.photoThumbWrap}>
                            <Image source={{ uri: path }} style={styles.photoThumb} />
                            <Pressable
                              onPress={() => handleDeletePhoto(entry.section, entry.entry.id, path)}
                              style={styles.photoDelete}
                            >
                              <Ionicons name="close" size={10} color="#fff" />
                            </Pressable>
                          </View>
                        ))}
                        <Pressable
                          onPress={() => handleAddPhoto(entry.section, entry.entry.id)}
                          style={styles.photoAddBtn}
                        >
                          <Ionicons name="camera-outline" size={16} color={theme.colors.accent} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}

              <StepSectionLabel title="VI — ტექნიკური მომსახურება" />
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
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 2: Conclusion ──────────────────────────────────────── */}
          {step === CONCLUSION_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <StepSectionLabel title="IV — დასკვნა" />

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>ჩეკლისტის შედეგები</Text>
                <View style={styles.summaryCounts}>
                  <View style={styles.countBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.semantic.success} />
                    <Text style={[styles.countNumber, { color: theme.colors.semantic.success }]}>{counts.good}</Text>
                    <Text style={styles.countLabel}>კარგი</Text>
                  </View>
                  <View style={styles.countBadge}>
                    <Ionicons name="warning" size={18} color={theme.colors.warn} />
                    <Text style={[styles.countNumber, { color: theme.colors.warn }]}>{counts.deficient}</Text>
                    <Text style={styles.countLabel}>დეფიციტი</Text>
                  </View>
                  <View style={styles.countBadge}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.danger} />
                    <Text style={[styles.countNumber, { color: theme.colors.danger }]}>{counts.unusable}</Text>
                    <Text style={styles.countLabel}>გამოუსადეგარი</Text>
                  </View>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>ტექნიკური მომსახურება</Text>
                {inspection.maintenanceItems.map(item => {
                  const entry = MAINTENANCE_ITEMS.find(e => e.id === item.id);
                  if (!entry) return null;
                  return (
                    <View key={item.id} style={styles.maintenanceSummaryRow}>
                      <Text style={styles.maintenanceSummaryLabel}>{entry.label}</Text>
                      <Text style={[
                        styles.maintenanceSummaryValue,
                        item.answer === 'yes' && { color: theme.colors.semantic.success },
                        item.answer === 'no' && { color: theme.colors.danger },
                      ]}>
                        {item.answer === 'yes' ? 'კი' : item.answer === 'no' ? 'არა' : '—'}
                      </Text>
                      {item.date ? (
                        <Text style={styles.maintenanceSummaryDate}>{item.date}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {showVerdictBanner && verdictSuggestion && (
                <View style={styles.suggestionBanner}>
                  <Ionicons name="information-circle-outline" size={16} color={theme.colors.warn} />
                  <Text style={styles.suggestionText}>
                    ავტომატური რეკომენდაცია:{' '}
                    <Text style={{ fontWeight: '700' }}>
                      {EXCAVATOR_VERDICT_LABEL[verdictSuggestion].split(' — ')[0]}
                    </Text>
                  </Text>
                </View>
              )}

              <View style={styles.verdictBlock}>
                {(['approved', 'conditional', 'rejected'] as ExcavatorVerdict[]).map(v => {
                  const active = inspection.verdict === v;
                  const isSuggested = verdictSuggestion === v && !inspection.verdict;
                  return (
                    <Pressable
                      key={v}
                      style={[
                        styles.verdictOption,
                        active && styles.verdictOptionActive,
                        isSuggested && styles.verdictOptionSuggested,
                      ]}
                      onPress={() => update('verdict', active ? null : v)}
                      {...a11y(EXCAVATOR_VERDICT_LABEL[v], undefined, 'radio')}
                    >
                      <View style={[styles.verdictCheck, active && styles.verdictCheckActive]}>
                        {active && <Ionicons name="checkmark" size={12} color={theme.colors.white} />}
                      </View>
                      <Text style={[styles.verdictLabel, active && styles.verdictLabelActive]}>
                        {EXCAVATOR_VERDICT_LABEL[v]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <FloatingLabelInput
                label="შენიშვნები / ხარვეზები"
                value={inspection.notes ?? ''}
                onChangeText={v => update('notes', v || null)}
                multiline
                numberOfLines={4}
              />

              <StepSectionLabel title="ფოტოები" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {(inspection.summaryPhotos ?? []).map(path => (
                  <View key={path} style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden' }}>
                    <Image source={{ uri: path }} style={{ width: 64, height: 64 }} />
                    <Pressable
                      onPress={() => handleDeleteSummaryPhoto(path)}
                      style={{ position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 }}
                      hitSlop={6}
                    >
                      <Ionicons name="close-circle" size={16} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
              <Pressable
                onPress={handleAddSummaryPhoto}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.hairline, borderRadius: 8, alignSelf: 'flex-start' }}
              >
                <Ionicons name="camera-outline" size={18} color={theme.colors.accent} />
                <Text style={{ fontSize: 13, color: theme.colors.accent }}>ფოტოს დამატება</Text>
              </Pressable>
            </KeyboardAwareScrollView>
          )}

          {/* ── Step N+2: Signature ─────────────────────────────────────── */}
          {step === SIGNATURE_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <StepSectionLabel title="V — შემომწმებელი" />

              <FloatingLabelInput
                label="სახელი / გვარი"
                value={inspection.inspectorName ?? ''}
                onChangeText={v => update('inspectorName', v || null)}
              />
              <FloatingLabelInput
                label="თანამდებობა"
                value={inspection.inspectorPosition ?? ''}
                onChangeText={v => update('inspectorPosition', v || null)}
              />

              <Pressable
                style={[styles.sigArea, inspection.inspectorSignature && styles.sigAreaSigned]}
                onPress={() => setShowSig(true)}
                {...a11y('ხელმოწერა', 'ინსპექტორის ხელმოწერის დამატება', 'button')}
              >
                {inspection.inspectorSignature ? (
                  <View style={styles.sigContent}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.semantic.success} />
                    <Text style={[styles.sigHint, { color: theme.colors.semantic.success }]}>ხელმოწერა დაყენებულია</Text>
                    <Pressable
                      onPress={() => update('inspectorSignature', null)}
                      hitSlop={10}
                      {...a11y('ხელმოწერის წაშლა', undefined, 'button')}
                    >
                      <Text style={styles.sigClear}>გასუფთავება</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.sigContent}>
                    <Ionicons name="pencil-outline" size={20} color={theme.colors.accent} />
                    <Text style={styles.sigHint}>შეეხეთ ხელმოწერისთვის</Text>
                  </View>
                )}
              </Pressable>

              {!inspection.inspectorSignature && (
                <Text style={styles.sigRequiredHint}>
                  ხელმოწერა სავალდებულოა დასასრულებლად
                </Text>
              )}

              {completing && (
                <View style={styles.completingRow}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.completingText}>მიმდინარეობს…</Text>
                </View>
              )}
            </KeyboardAwareScrollView>
          )}

          {/* ── Step N+3: Done ──────────────────────────────────────────── */}
          {step === DONE_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <View style={styles.doneHero}>
                <Ionicons name="checkmark-circle" size={72} color={theme.colors.semantic.success} />
                <Text style={styles.doneTitle}>შემოწმება დასრულდა!</Text>
                {inspection.completedAt && (
                  <Text style={styles.doneDate}>
                    {new Date(inspection.completedAt).toLocaleDateString('ka-GE', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </Text>
                )}
                {inspection.verdict && (
                  <View style={[
                    styles.doneVerdict,
                    inspection.verdict === 'approved'    && styles.doneVerdictGreen,
                    inspection.verdict === 'conditional' && styles.doneVerdictAmber,
                    inspection.verdict === 'rejected'    && styles.doneVerdictRed,
                  ]}>
                    <Text style={[
                      styles.doneVerdictText,
                      inspection.verdict === 'approved'    && { color: theme.colors.semantic.success },
                      inspection.verdict === 'conditional' && { color: theme.colors.warn },
                      inspection.verdict === 'rejected'    && { color: theme.colors.danger },
                    ]}>
                      {EXCAVATOR_VERDICT_LABEL[inspection.verdict].split(' — ')[0]}
                    </Text>
                  </View>
                )}
              </View>

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
            {step === SIGNATURE_STEP ? (
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
                title="შემდეგი"
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
        personName={inspection.inspectorName ?? 'ინსპექტორი'}
        onCancel={() => setShowSig(false)}
        onConfirm={handleSignatureConfirm}
      />
    </View>
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

function MachineSpecsCard({ insp, styles }: { insp: ExcavatorInspection; styles: ReturnType<typeof getstyles> }) {
  const sp = insp.machineSpecs ?? EXCAVATOR_MACHINE_SPECS;
  const { theme } = useTheme();
  return (
    <View style={styles.specsCard}>
      <Text style={styles.specsTitle}>I — მანქანის ტექნიკური მახასიათებლები</Text>
      <View style={styles.specsGrid}>
        {[
          ['წონა', sp.weight],
          ['ძრავა', sp.engine],
          ['სიმძლავრე', sp.power],
          ['სიღრმე', sp.depth],
          ['სვლა', sp.travel],
          ['მაქს. გამბარი', sp.maxReach],
        ].map(([label, value]) => (
          <View key={label} style={styles.specsCell}>
            <Text style={[styles.specsLabel, { color: theme.colors.inkSoft }]}>{label}</Text>
            <Text style={[styles.specsValue, { color: theme.colors.ink }]}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: theme.colors.card },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 24, paddingTop: 4 },
    stepBody: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, gap: 12 },
    footer: {
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      backgroundColor: theme.colors.card,
    },

    specsCard: {
      borderWidth: 1, borderColor: theme.colors.hairline,
      borderRadius: 10, overflow: 'hidden', marginBottom: 16,
      backgroundColor: theme.colors.card,
    },
    specsTitle: {
      fontSize: 10, fontWeight: '700', color: theme.colors.inkSoft,
      textTransform: 'uppercase', letterSpacing: 0.5,
      paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8,
      borderBottomWidth: 0.5, borderBottomColor: theme.colors.hairline,
      backgroundColor: theme.colors.subtleSurface,
    },
    specsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    specsCell: {
      width: '33.33%',
      padding: 10,
      borderRightWidth: 0.5, borderBottomWidth: 0.5,
      borderColor: theme.colors.hairline,
    },
    specsLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
    specsValue: { fontSize: 11, fontWeight: '700' },

    fieldRow:   { marginBottom: 4, gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },

    sectionHeader: {
      fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginTop: 16, marginBottom: 4, paddingHorizontal: 4,
    },

    listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 8 },
    listRowText: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    listRowNumber: { fontSize: 12, color: theme.colors.inkFaint, marginTop: 2, minWidth: 18 },
    listRowLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.ink, lineHeight: 18 },
    listRowDesc: { fontSize: 11, color: theme.colors.inkSoft, lineHeight: 15, marginTop: 1 },
    listRowActions: { flexDirection: 'row', gap: 6 },
    statusBtn: {
      width: 44, height: 44, borderRadius: 10, borderWidth: 1.5,
      borderColor: theme.colors.hairline, alignItems: 'center', justifyContent: 'center',
    },
    statusBtnGoodActive: { backgroundColor: theme.colors.semantic.success, borderColor: theme.colors.semantic.success },
    statusBtnDefActive:  { backgroundColor: theme.colors.warn, borderColor: theme.colors.warn },
    statusBtnBadActive:  { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger },

    photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 32, paddingBottom: 8 },
    photoThumbWrap: { position: 'relative', width: 44, height: 44, borderRadius: 6, overflow: 'hidden' },
    photoThumb: { width: 44, height: 44 },
    photoDelete: {
      position: 'absolute', top: 2, right: 2,
      backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
      width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    },
    photoAddBtn: {
      width: 44, height: 44, borderRadius: 6,
      borderWidth: 1, borderColor: theme.colors.hairline, borderStyle: 'dashed',
      alignItems: 'center', justifyContent: 'center',
    },

    summaryCard: {
      borderWidth: 1, borderColor: theme.colors.hairline,
      borderRadius: 10, padding: 12, gap: 10, marginBottom: 12,
    },
    summaryTitle: {
      fontSize: 12, fontWeight: '700', color: theme.colors.inkSoft,
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
    summaryCounts: { flexDirection: 'row', gap: 10, justifyContent: 'space-around' },
    countBadge: { alignItems: 'center', gap: 2 },
    countNumber: { fontSize: 18, fontWeight: '800', color: theme.colors.ink },
    countLabel: { fontSize: 11, color: theme.colors.inkSoft },

    maintenanceSummaryRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: theme.colors.hairline,
    },
    maintenanceSummaryLabel: { flex: 1, fontSize: 12, color: theme.colors.inkSoft },
    maintenanceSummaryValue: { fontSize: 12, fontWeight: '700', color: theme.colors.ink },
    maintenanceSummaryDate: { fontSize: 11, color: theme.colors.inkFaint, marginLeft: 8 },

    suggestionBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.colors.warnSoft,
      padding: 10, borderRadius: 8, marginBottom: 8,
    },
    suggestionText: { fontSize: 12, color: theme.colors.inkSoft, flex: 1 },

    verdictBlock: { gap: 6, marginBottom: 12 },
    verdictOption: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      padding: 10, borderRadius: 10, borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    verdictOptionActive:    { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
    verdictOptionSuggested: { borderColor: theme.colors.warn,   backgroundColor: theme.colors.warnSoft },
    verdictCheck: {
      width: 20, height: 20, borderRadius: 5,
      borderWidth: 1.5, borderColor: theme.colors.hairline,
      alignItems: 'center', justifyContent: 'center', marginTop: 1,
    },
    verdictCheckActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
    verdictLabel:       { flex: 1, fontSize: 12, color: theme.colors.inkSoft, lineHeight: 18 },
    verdictLabelActive: { color: theme.colors.accent, fontWeight: '600' },

    sigArea: {
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.hairline,
      borderRadius: 12, padding: 24, alignItems: 'center', justifyContent: 'center',
      minHeight: 80, marginBottom: 12,
    },
    sigAreaSigned: { borderStyle: 'solid', borderColor: theme.colors.semantic.success, backgroundColor: theme.colors.semantic.successSoft },
    sigContent:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sigHint:          { fontSize: 14, color: theme.colors.accent },
    sigClear:         { fontSize: 12, color: theme.colors.danger, marginLeft: 8 },
    sigRequiredHint:  { fontSize: 12, color: theme.colors.inkFaint, textAlign: 'center', marginTop: 4 },
    completingRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
    completingText:   { fontSize: 13, color: theme.colors.inkSoft },

    doneHero:  { alignItems: 'center', paddingVertical: 32, gap: 10 },
    doneTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.ink, textAlign: 'center' },
    doneDate:  { fontSize: 13, color: theme.colors.inkSoft, marginTop: 2 },
    doneVerdict: {
      paddingHorizontal: 16, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1.5, marginTop: 8,
    },
    doneVerdictGreen: { borderColor: theme.colors.semantic.success,              backgroundColor: theme.colors.semantic.successSoft },
    doneVerdictAmber: { borderColor: theme.colors.warn,        backgroundColor: theme.colors.warnSoft },
    doneVerdictRed:   { borderColor: theme.colors.dangerBorder, backgroundColor: theme.colors.dangerTint },
    doneVerdictText:  { fontSize: 13, fontWeight: '700' },
  });
}
