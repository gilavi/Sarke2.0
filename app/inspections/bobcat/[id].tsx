import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { PlateInput } from '../../../components/inputs/PlateInput';
import { Button } from '../../../components/ui';
import { WizardStepTransition } from '../../../components/wizard/WizardStepTransition';

// checklist list render is inline below
import { FlowHeader } from '../../../components/FlowHeader';
import { InspectionResultView } from '../../../components/InspectionResultView';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bobcatApi } from '../../../lib/bobcatService';
import { projectsApi, signaturesApi, inspectionAttachmentsApi } from '../../../lib/services';
import { signatureAsDataUrl } from '../../../lib/imageUrl';
import { STORAGE_BUCKETS } from '../../../lib/supabase';
import type { SignatureRecord } from '../../../types/models';
import { buildBobcatPdfHtml } from '../../../lib/bobcatPdf';
import { generateAndSharePdf, PdfLimitReachedError } from '../../../lib/pdfOpen';
import { PaywallModal } from '../../../components/PaywallModal';
import { PdfLockedBanner } from '../../../components/PdfLockedBanner';
import { usePdfUsage, useInvalidatePdfUsage } from '../../../lib/usePdfUsage';
import { generatePdfName } from '../../../lib/pdfName';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SuggestionPills } from '../../../components/SuggestionPills';
import { useFieldHistory } from '../../../hooks/useFieldHistory';
import {
  BOBCAT_ITEMS,
  BOBCAT_CATEGORY_LABELS,
  VERDICT_LABEL,
  LARGE_LOADER_TEMPLATE_ID,
  LARGE_LOADER_ITEMS,
  categoryCounts,
  type BobcatInspection,
  type BobcatVerdict,
  type BobcatItemState,
  type BobcatCategory,
  type BobcatChecklistEntry,
} from '../../../types/bobcat';

const CATEGORIES: BobcatCategory[] = ['A', 'B', 'C', 'D'];

export default function BobcatInspectionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const insets = useSafeAreaInsets();

  const [paywallVisible, setPaywallVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  const userId = session?.state?.status === 'signedIn' ? session.state.session.user.id : null;

  // ── Field suggestion histories ────────────────────────────────────────────
  const equipmentModelHistory = useFieldHistory(userId, 'bobcat:equipmentModel');
  const registrationNumberHistory = useFieldHistory(userId, 'bobcat:registrationNumber');

  const INFO_STEP = 0;
  const CHECKLIST_STEP = 1;
  const CONCLUSION_STEP = 2;
  const DONE_STEP = 3;
  const TOTAL_STEPS = 3;
  const STEP_LABELS = ['ინფო', 'შემოწმება', 'დასკვნა'];

  const [inspection, setInspection] = useState<BobcatInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [attachmentCount, setAttachmentCount] = useState(0);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Step state: 0=info, 1=checklist list, 2=conclusion
  const [step, setStep] = useState(INFO_STEP);
  const prevStepRef = useRef(INFO_STEP);
  const [animateSteps, setAnimateSteps] = useState(false);
  const inspectionRef = useRef<BobcatInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  const catalog: BobcatChecklistEntry[] = useMemo(
    () => inspection?.templateId === LARGE_LOADER_TEMPLATE_ID ? LARGE_LOADER_ITEMS : BOBCAT_ITEMS,
    [inspection?.templateId],
  );

  const isLargeLoader = inspection?.templateId === LARGE_LOADER_TEMPLATE_ID;
  const screenTitle = isLargeLoader ? 'დიდი ციცხვიანი დამტვირთველი' : 'ციცხვიანი დამტვირთველი';



  const persistKey = useMemo(() => `bobcat-wizard:${id}:step`, [id]);
  const summaryPhotosKey = useMemo(() => `bobcat-wizard:${id}:summaryPhotos`, [id]);

  // Direction for animations
  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) {
      console.log('[Bobcat] no id, skipping load');
      return;
    }
    console.log('[Bobcat] loading inspection:', id);
    let cancelled = false;
    (async () => {
      try {
        const insp = await bobcatApi.getById(id);
        console.log('[Bobcat] loaded:', insp ? 'found' : 'null', 'cancelled:', cancelled);
        if (cancelled) return;
        if (!insp) { console.log('[Bobcat] inspection not found, going back'); router.back(); return; }

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

        if (patched.inspectorName && patched.inspectorName !== insp.inspectorName) {
          bobcatApi.patch(patched.id, { inspectorName: patched.inspectorName }).catch(() => {});
        }

        // Compute correct step constants based on the loaded inspection's template
        const loadedCatalog = insp.templateId === LARGE_LOADER_TEMPLATE_ID ? LARGE_LOADER_ITEMS : BOBCAT_ITEMS;
        const loadedChecklistCount = loadedCatalog.length;
        const loadedSummaryStep = 1 + loadedChecklistCount;
        const loadedSignatureStep = loadedSummaryStep + 1;
        const loadedDoneStep = loadedSignatureStep + 1;

        if (insp.status === 'completed') {
          // Will render result view instead of wizard
        } else {
          // Restore saved step
          const saved = await AsyncStorage.getItem(persistKey);
          if (saved && !cancelled) {
            const s = parseInt(saved, 10);
            if (!isNaN(s) && s >= INFO_STEP && s <= CONCLUSION_STEP) {
              setStep(s);
            }
          }
        }

        projectsApi.getById(insp.projectId).then(p => {
          if (cancelled || !p) return;
          setProjectName(p.company_name || p.name);
          setInspection(prev => {
            if (!prev) return prev;
            const companyFill = !prev.company?.trim() ? (p.company_name || p.name) : null;
            const addressFill = !prev.address?.trim() && p.address ? p.address : null;
            if (!companyFill && !addressFill) return prev;
            const next = {
              ...prev,
              ...(companyFill ? { company: companyFill } : {}),
              ...(addressFill ? { address: addressFill } : {}),
            };
            bobcatApi.patch(next.id, {
              ...(companyFill ? { company: next.company } : {}),
              ...(addressFill ? { address: next.address } : {}),
            }).catch(() => {});
            return next;
          });
        }).catch(() => {});


      } catch (e) {
        console.log('[Bobcat] load error:', e);
        if (!cancelled) {
          toast.error(friendlyError(e, 'ვერ ჩაიტვირთა'));
          router.back();
        }
      } finally {
        if (!cancelled) {
          console.log('[Bobcat] load complete, setting loading=false');
          setLoading(false);
          // Enable animations after load to avoid animation on restored step
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

  // Persist step when in checklist range
  useEffect(() => {
    if (step >= INFO_STEP && step <= CONCLUSION_STEP) {
      AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
    }
  }, [step, persistKey, INFO_STEP, CONCLUSION_STEP]);

  // ── Auto-save (debounced) ──────────────────────────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback((insp: BobcatInspection) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      bobcatApi.patch(insp.id, {
        company: insp.company,
        address: insp.address,
        equipmentModel: insp.equipmentModel,
        registrationNumber: insp.registrationNumber,
        inspectionDate: insp.inspectionDate,
        inspectionType: insp.inspectionType,
        inspectorName: insp.inspectorName,
        items: insp.items,
        verdict: insp.verdict,
        notes: insp.notes,
        inspectorSignature: insp.inspectorSignature,
      }).catch(e => {
        toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
      }).finally(() => setSaving(false));
    }, 700);
  }, [toast]);

  const update = useCallback(<K extends keyof BobcatInspection>(
    key: K,
    value: BobcatInspection[K],
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateItem = useCallback((
    itemId: number,
    patch: Partial<Pick<BobcatItemState, 'result' | 'comment'>>,
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i =>
        i.id === itemId ? { ...i, ...patch } : i,
      );
      const next = { ...prev, items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Photo handling ─────────────────────────────────────────────────────────

  const pendingPhotoItemId = useRef<number | null>(null);

  const handleAddPhoto = useCallback((itemId: number) => {
    pendingPhotoItemId.current = itemId;
    Alert.alert('ფოტოს წყარო', undefined, [
      {
        text: 'კამერა',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { toast.error('კამერაზე წვდომა დახურულია'); return; }
          const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadPhoto(itemId, res.assets[0].uri);
        },
      },
      {
        text: 'გალერეა',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { toast.error('გალერეაზე წვდომა დახურულია'); return; }
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadPhoto(itemId, res.assets[0].uri);
        },
      },
      { text: 'გაუქმება', style: 'cancel' },
    ]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const uploadPhoto = async (itemId: number, uri: string) => {
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await bobcatApi.uploadPhoto(insp.id, itemId, uri);
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
  };

  const handleDeletePhoto = useCallback(async (itemId: number, path: string) => {
    try {
      await bobcatApi.deletePhoto(path);
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
  }, [scheduleSave, toast]);

  // ── Load signatures/attachments when completed ────────────────────────────

  useEffect(() => {
    if (inspection?.status !== 'completed') return;
    signaturesApi.list(inspection.id).then(setSignatures).catch(() => {});
    inspectionAttachmentsApi.listByInspection(inspection.id)
      .then(a => setAttachmentCount(a.length)).catch(() => {});
  }, [inspection?.status, inspection?.id]);

  // ── Complete ───────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!inspection) return;
    const missing: string[] = [];
    if (!inspection.equipmentModel?.trim())     missing.push('დამტვირთველის მარკა / მოდელი');
    if (!inspection.registrationNumber?.trim()) missing.push('სახელმწიფო / ს.ნ ნომერი');
    if (!inspection.verdict)                    missing.push('შეჯამება: დასკვნა');

    if (missing.length > 0) {
      Alert.alert('შეავსეთ სავალდებულო ველები', missing.map(m => `• ${m}`).join('\n'));
      return;
    }
    setCompleting(true);
    try {
      await bobcatApi.patch(inspection.id, {
        company: inspection.company,
        address: inspection.address,
        equipmentModel: inspection.equipmentModel,
        registrationNumber: inspection.registrationNumber,
        inspectionDate: inspection.inspectionDate,
        inspectionType: inspection.inspectionType,
        inspectorName: inspection.inspectorName,
        items: inspection.items,
        verdict: inspection.verdict,
        notes: inspection.notes,
        inspectorSignature: inspection.inspectorSignature,
      });
      await bobcatApi.complete(inspection.id);
      const completedAt = new Date().toISOString();
      await recordCompletion(
        'inspections',
        inspection.id,
        completedAt,
        `${inspection.projectId}:bobcat`,
      ).catch(() => {});
      setInspection(prev => prev ? { ...prev, status: 'completed', completedAt } : prev);
      await AsyncStorage.removeItem(persistKey);
      toast.success('შემოწმება დასრულდა');
    } catch (e) {
      toast.error(friendlyError(e, 'შეცდომა'));
    } finally {
      setCompleting(false);
    }
  }, [inspection, toast, persistKey]);

  // ── PDF ────────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    if (!inspection) return;
    if (pdfUsage?.isLocked) { setPaywallVisible(true); return; }
    setGeneratingPdf(true);
    try {
      const html = await buildBobcatPdfHtml({
        inspection,
        projectName: projectName || 'პროექტი',
        catalog,
      });
      const pdfName = generatePdfName(
        projectName || 'project',
        isLargeLoader ? 'LargeLoaderInspection' : 'BobcatInspection',
        new Date(inspection.inspectionDate),
        inspection.id,
      );
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      await generateAndSharePdf(html, pdfName, undefined, userId);
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setPaywallVisible(true); return; }
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setGeneratingPdf(false);
    }
  }, [inspection, projectName, catalog, isLargeLoader, session.state, invalidatePdfUsage, toast]);

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
      const path = await bobcatApi.uploadSummaryPhoto(insp.id, uri);
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
      await bobcatApi.deletePhoto(path);
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

  const buildPreview = useCallback(async (sigs: SignatureRecord[] = signatures) => {
    if (!inspection) return;
    setPreviewBusy(true);
    try {
      const sigsEmbedded = await Promise.all(
        sigs.map(async sig => {
          if (!sig.signature_png_url || sig.signature_png_url.startsWith('data:')) return sig;
          const dataUrl = await signatureAsDataUrl(STORAGE_BUCKETS.signatures, sig.signature_png_url)
            .catch(() => sig.signature_png_url ?? '');
          return { ...sig, signature_png_url: dataUrl };
        }),
      );
      const html = await buildBobcatPdfHtml({
        inspection,
        projectName: projectName || 'პროექტი',
        catalog,
        signatures: sigsEmbedded,
      });
      setPreviewHtml(html);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setPreviewBusy(false);
    }
  }, [inspection, projectName, catalog, signatures, toast]);

  useEffect(() => {
    if (inspection?.status === 'completed') {
      void buildPreview();
    }
  }, [inspection?.status, buildPreview]);

  // ── Step navigation ────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection) return false;
    if (step === INFO_STEP) {
      return !!inspection.equipmentModel?.trim() && !!inspection.registrationNumber?.trim();
    }
    if (step === CONCLUSION_STEP) return !!inspection.verdict && !completing;
    return true;
  }, [step, inspection, completing, CONCLUSION_STEP]);

  const handleNext = useCallback(async () => {
    if (step === CONCLUSION_STEP) {
      await handleComplete();
      router.push(`/inspections/bobcat/${id}/done` as any);
    } else if (step < CONCLUSION_STEP) {
      setStep(s => s + 1);
    }
  }, [step, CONCLUSION_STEP, handleComplete, id, router]);

  const handlePrev = useCallback(() => {
    if (step === INFO_STEP) {
      router.back();
    } else if (step > INFO_STEP) {
      setStep(s => s - 1);
    }
  }, [step, router]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderChecklistList = () => {
    if (!inspection) return null;
    return (
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bottomOffset={120}
      >
        {catalog.map((entry, idx) => {
          const state = inspection.items.find(i => i.id === entry.id)
            ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
          const active = state.result;
          return (
            <View key={entry.id} style={styles.listRow}>
              <View style={styles.listRowInfo}>
                <Text style={[styles.listRowLabel, { fontSize: 13, fontWeight: '400', color: theme.colors.ink }]} numberOfLines={2}>
                  {entry.description}
                </Text>
              </View>
              <View style={styles.listRowActions}>
                <Pressable
                  style={[
                    styles.statusBtn,
                    active === 'good' ? styles.statusBtnGoodActive : styles.statusBtnGood,
                  ]}
                  onPress={() => updateItem(entry.id, { result: active === 'good' ? null : 'good' })}
                  hitSlop={6}
                >
                  <Text style={[
                    styles.statusBtnText,
                    active === 'good' ? styles.statusBtnTextActive : styles.statusBtnTextGood,
                  ]}>✓</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.statusBtn,
                    active === 'deficient' ? styles.statusBtnWarnActive : styles.statusBtnWarn,
                  ]}
                  onPress={() => updateItem(entry.id, { result: active === 'deficient' ? null : 'deficient' })}
                  hitSlop={6}
                >
                  <Text style={[
                    styles.statusBtnText,
                    active === 'deficient' ? styles.statusBtnTextActive : styles.statusBtnTextWarn,
                  ]}>⚠</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.statusBtn,
                    active === 'unusable' ? styles.statusBtnBadActive : styles.statusBtnBad,
                  ]}
                  onPress={() => updateItem(entry.id, { result: active === 'unusable' ? null : 'unusable' })}
                  hitSlop={6}
                >
                  <Text style={[
                    styles.statusBtnText,
                    active === 'unusable' ? styles.statusBtnTextActive : styles.statusBtnTextBad,
                  ]}>✗</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </KeyboardAwareScrollView>
    );
  };

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
    const signedCount = signatures.filter(s => s.status === 'signed' && !!s.signature_png_url).length;
    return (
      <InspectionResultView
        inspectionId={inspection.id}
        templateName={screenTitle}
        requiredSignerRoles={[]}
        previewHtml={previewHtml}
        previewBusy={previewBusy}
        previewError={null}
        signedCount={signedCount}
        totalSlots={signatures.length}
        attachmentCount={attachmentCount}
        pdfLocked={pdfUsage?.isLocked}
        downloading={generatingPdf}
        paywallVisible={paywallVisible}
        onPaywallClose={() => setPaywallVisible(false)}
        onDownloadPdf={() => void handlePdf()}
        onSheetSaved={() => {
          signaturesApi.list(inspection.id).then(sigs => {
            setSignatures(sigs);
            void buildPreview(sigs);
          }).catch(() => {});
          inspectionAttachmentsApi.listByInspection(inspection.id)
            .then(a => setAttachmentCount(a.length)).catch(() => {});
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle={screenTitle}
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
        onBack={step === 0 ? async () => { await AsyncStorage.removeItem(persistKey); router.back(); } : handlePrev}
        backDisabled={false}
      />


      {saving && (
        <Text style={styles.savingHint}>შენახვა…</Text>
      )}

      <View style={{ flex: 1 }}>
        <WizardStepTransition
          stepKey={step}
          direction={direction}
          animate={animateSteps}
        >
          {/* ── Step 0: General Info ────────────────────────────────────── */}
          {step === 0 && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <FloatingLabelInput
                label="დამტვირთველის მარკა / მოდელი *"
                value={inspection.equipmentModel ?? ''}
                onChangeText={v => update('equipmentModel', v)}
                onFocus={() => setFocusedField('equipmentModel')}
                onBlur={() => {
                  setFocusedField(null);
                  if (inspection.equipmentModel?.trim()) {
                    equipmentModelHistory.addToHistory(inspection.equipmentModel.trim());
                  }
                }}
                required
              />
              {equipmentModelHistory.suggestions.length > 0 && (
                <SuggestionPills
                  suggestions={equipmentModelHistory.suggestions}
                  onSelect={v => {
                    update('equipmentModel', v);
                    setFocusedField(null);
                  }}
                  visible={focusedField === 'equipmentModel' || (!inspection.equipmentModel?.trim() && equipmentModelHistory.suggestions.length > 0)}
                />
              )}

              <PlateInput
                label="სახელმწიფო / ს.ნ ნომერი"
                value={inspection.registrationNumber ?? ''}
                onChangeText={v => {
                  update('registrationNumber', v);
                  if (v.trim()) registrationNumberHistory.addToHistory(v.trim());
                }}
                required
              />
              {equipmentModelHistory.suggestions.length > 0 && (
                <SuggestionPills
                  suggestions={equipmentModelHistory.suggestions}
                  onSelect={v => {
                    update('equipmentModel', v);
                    setFocusedField(null);
                  }}
                  visible={focusedField === 'equipmentModel' || (!inspection.equipmentModel?.trim() && equipmentModelHistory.suggestions.length > 0)}
                />
              )}
            </KeyboardAwareScrollView>
          )}

          {/* ── Step 1: Checklist list ──────────────────────────────────── */}
          {step === CHECKLIST_STEP && renderChecklistList()}

          {/* ── Step 2: Conclusion (summary + verdict + notes + signature) ─ */}
          {step === CONCLUSION_STEP && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <Text style={styles.fieldLabel}>დასკვნა *</Text>
              <View style={styles.chipRow}>
                {(['approved', 'limited', 'rejected'] as BobcatVerdict[]).map(v => {
                  const active = inspection.verdict === v;
                  return (
                    <Pressable
                      key={v}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                      onPress={() => update('verdict', active ? null : v)}
                      {...a11y(VERDICT_LABEL[v], undefined, 'radio')}
                    >
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {VERDICT_LABEL[v]}
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

              {completing && (
                <View style={styles.completingRow}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.completingText}>მიმდინარეობს…</Text>
                </View>
              )}
            </KeyboardAwareScrollView>
          )}
        </WizardStepTransition>

        {step !== DONE_STEP && (
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
                  canGoNext ? (
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.white} />
                  ) : undefined
                }
                onPress={handleNext}
              />
            )}
          </View>
        )}
      </View>

    </View>
  );
}

// ── Screen styles ────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 24, paddingTop: 4 },
    stepBody: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, gap: 12 },
    footer: {
      gap: 10,
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 16,
      backgroundColor: theme.colors.card,
    },

    fieldRow: { marginBottom: 4, gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    typeChip: {
      paddingHorizontal: 14, paddingVertical: 16,
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

    sumTable: {
      marginBottom: 12,
    },
    sumRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.hairline },
    sumHeaderRow: { backgroundColor: theme.colors.subtleSurface },
    sumCell: { flex: 1, padding: 8, fontSize: 11 },
    sumCatCell: { flex: 3, color: theme.colors.ink },
    sumCountCell: { width: 40, textAlign: 'center', padding: 8, fontSize: 13, color: theme.colors.inkSoft },
    sumHeaderText: { fontWeight: '700', color: theme.colors.inkSoft, fontSize: 10, textTransform: 'uppercase' },

    suggestionBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.colors.warnSoft,
      padding: 10, marginBottom: 8,
    },
    suggestionText: { fontSize: 12, color: theme.colors.inkSoft, flex: 1 },
    verdictBlock: { gap: 0, marginBottom: 12 },
    verdictOption: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      paddingVertical: 10, paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
    },
    verdictOptionActive: {
      borderBottomColor: theme.colors.accent,
    },
    verdictOptionSuggested: {
      borderBottomColor: theme.colors.warn,
    },
    verdictCheck: {
      width: 20, height: 20, borderRadius: 5,
      borderWidth: 1.5, borderColor: theme.colors.hairline,
      alignItems: 'center', justifyContent: 'center',
      marginTop: 1,
    },
    verdictCheckActive: {
      backgroundColor: theme.colors.accent, borderColor: theme.colors.accent,
    },
    verdictLabel: { flex: 1, fontSize: 12, color: theme.colors.inkSoft, lineHeight: 18 },
    verdictLabelActive: { color: theme.colors.accent, fontWeight: '600' },

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

    completingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
    completingText: { fontSize: 13, color: theme.colors.inkSoft },

    doneHero: { paddingVertical: 16, gap: 6 },
    doneTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.ink, textAlign: 'center' },
    doneDate: { fontSize: 13, color: theme.colors.inkSoft, marginTop: 2 },
    doneVerdict: {
      paddingHorizontal: 16, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1.5,
      marginTop: 8,
    },
    doneVerdictGreen: { borderColor: theme.colors.semantic.success, backgroundColor: theme.colors.semantic.successSoft },
    doneVerdictAmber: { borderColor: theme.colors.warn, backgroundColor: theme.colors.warnSoft },
    doneVerdictRed:   { borderColor: theme.colors.dangerBorder, backgroundColor: theme.colors.dangerTint },
    doneVerdictText:  { fontSize: 13, fontWeight: '700' },

    // List row styles
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.hairline,
      gap: 8,
    },
    listRowInfo: { flex: 1, gap: 2 },
    listRowLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.ink },
    listRowActions: { flexDirection: 'row', gap: 6 },
    statusBtn: {
      width: 44, height: 44,
      borderRadius: 8,
      borderWidth: 1.5,
      alignItems: 'center', justifyContent: 'center',
    },
    statusBtnGood:       { borderColor: theme.colors.semantic.success },
    statusBtnGoodActive: { backgroundColor: theme.colors.semantic.success, borderColor: theme.colors.semantic.success },
    statusBtnWarn:       { borderColor: theme.colors.warn },
    statusBtnWarnActive: { backgroundColor: theme.colors.warn, borderColor: theme.colors.warn },
    statusBtnBad:        { borderColor: theme.colors.dangerBorder },
    statusBtnBadActive:  { backgroundColor: theme.colors.danger, borderColor: theme.colors.danger },
    statusBtnText:       { fontSize: 18 },
    statusBtnTextGood:   { color: theme.colors.semantic.success },
    statusBtnTextWarn:   { color: theme.colors.warn },
    statusBtnTextBad:    { color: theme.colors.danger },
    statusBtnTextActive: { color: theme.colors.white, fontWeight: '700' },
  });
}
