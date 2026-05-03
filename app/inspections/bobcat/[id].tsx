import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { A11yText as Text } from '../../../components/primitives/A11yText';
import { FloatingLabelInput } from '../../../components/inputs/FloatingLabelInput';
import { DateTimeField } from '../../../components/DateTimeField';
import { Button } from '../../../components/ui';
import { KeyboardSafeArea } from '../../../components/layout/KeyboardSafeArea';
import { SignatureCanvas } from '../../../components/SignatureCanvas';
import { BobcatChecklistItem } from '../../../components/bobcat/BobcatChecklistItem';
import { WizardNav } from '../../../components/wizard/WizardNav';
import { StepBar } from '../../../components/wizard/StepBar';
import { StepSectionLabel } from '../../../components/wizard/StepSectionLabel';
import { FlowHeader } from '../../../components/FlowHeader';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { bobcatApi } from '../../../lib/bobcatService';
import { projectsApi } from '../../../lib/services';
import { buildBobcatPdfHtml } from '../../../lib/bobcatPdf';
import { generateAndSharePdf } from '../../../lib/pdfOpen';
import { generatePdfName } from '../../../lib/pdfName';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import {
  BOBCAT_ITEMS,
  BOBCAT_CATEGORY_LABELS,
  INSPECTION_TYPE_LABEL,
  VERDICT_LABEL,
  LARGE_LOADER_TEMPLATE_ID,
  LARGE_LOADER_ITEMS,
  categoryCounts,
  computeVerdictSuggestion,
  type BobcatInspection,
  type BobcatInspectionType,
  type BobcatVerdict,
  type BobcatItemState,
  type BobcatCategory,
  type BobcatChecklistEntry,
} from '../../../types/bobcat';

const CATEGORIES: BobcatCategory[] = ['A', 'B', 'C', 'D'];
const INSPECTION_TYPES: BobcatInspectionType[] = ['pre_work', 'scheduled', 'other'];
const STEP_LABELS = ['ინფო', 'ჩეკლისტი', 'შეჯამება', 'ხელმოწერა'];
const TOTAL_STEPS = 4;

export default function BobcatInspectionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();

  const [inspection, setInspection] = useState<BobcatInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showSig, setShowSig] = useState(false);
  // 0=info  1=checklist  2=summary  3=signature  4=done
  const [step, setStep] = useState(0);

  const pendingPhotoItemId = useRef<number | null>(null);

  const catalog: BobcatChecklistEntry[] = useMemo(
    () => inspection?.templateId === LARGE_LOADER_TEMPLATE_ID ? LARGE_LOADER_ITEMS : BOBCAT_ITEMS,
    [inspection?.templateId],
  );

  const isLargeLoader = inspection?.templateId === LARGE_LOADER_TEMPLATE_ID;
  const screenTitle = isLargeLoader ? 'დიდი ციცხვიანი დამტვირთველი' : 'ციცხვიანი დამტვირთველი';

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const insp = await bobcatApi.getById(id);
        if (cancelled) return;
        if (!insp) { router.back(); return; }

        // Auto-fill inspector name from signed-in user
        let patched = insp;
        if (!insp.inspectorName && session.state.status === 'signedIn') {
          const u = session.state.user;
          const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
          if (name) patched = { ...patched, inspectorName: name };
        }
        setInspection(patched);

        // Already completed → jump straight to done screen
        if (insp.status === 'completed') setStep(4);

        // Fetch project for display name + auto-fill company / address if blank
        projectsApi.getById(insp.projectId).then(p => {
          if (cancelled || !p) return;
          setProjectName(p.name);
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
        if (!cancelled) {
          toast.error(friendlyError(e, 'ვერ ჩაიტვირთა'));
          router.back();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Auto-save (debounced) ─────────────────────────────────────────────────

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

  // ── Photo handling ────────────────────────────────────────────────────────

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
    if (!inspection) return;
    try {
      const path = await bobcatApi.uploadPhoto(inspection.id, itemId, uri);
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

  const handleDeletePhoto = useCallback((itemId: number, path: string) => {
    bobcatApi.deletePhoto(path).catch(() => {});
    setInspection(prev => {
      if (!prev) return prev;
      const items = prev.items.map(i =>
        i.id === itemId ? { ...i, photo_paths: i.photo_paths.filter(p => p !== path) } : i,
      );
      const next = { ...prev, items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Signature ─────────────────────────────────────────────────────────────

  const handleSignatureConfirm = useCallback((base64Png: string) => {
    setShowSig(false);
    update('inspectorSignature', base64Png);
  }, [update]);

  // ── Verdict auto-suggestion ───────────────────────────────────────────────

  const verdictSuggestion = useMemo(
    () => inspection ? computeVerdictSuggestion(inspection.items, catalog) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inspection?.items, catalog],
  );

  const showVerdictBanner = verdictSuggestion !== null && inspection?.verdict !== verdictSuggestion;

  // ── Complete ──────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!inspection) return;
    const missing: string[] = [];
    if (!inspection.company?.trim())            missing.push('ობიექტი / კომპანია');
    if (!inspection.equipmentModel?.trim())     missing.push('დამტვირთველის მარკა / მოდელი');
    if (!inspection.registrationNumber?.trim()) missing.push('სახელმწიფო / ს.ნ ნომერი');
    if (!inspection.verdict)                    missing.push('შეჯამება: დასკვნა');
    if (!inspection.inspectorSignature)         missing.push('ინსპექტორის ხელმოწერა');
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
      setStep(4);
      toast.success('შემოწმება დასრულდა');
    } catch (e) {
      toast.error(friendlyError(e, 'შეცდომა'));
    } finally {
      setCompleting(false);
    }
  }, [inspection, toast]);

  // ── PDF ───────────────────────────────────────────────────────────────────

  const handlePdf = useCallback(async () => {
    if (!inspection) return;
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
      await generateAndSharePdf(html, pdfName);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF ვერ შეიქმნა'));
    } finally {
      setGeneratingPdf(false);
    }
  }, [inspection, projectName, catalog, isLargeLoader, toast]);

  // ── Step navigation ───────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection || step >= 4) return false;
    if (step === 3) return !!inspection.inspectorSignature && !completing;
    return true;
  }, [step, inspection, completing]);

  const handleNext = useCallback(() => {
    if (step === 3) {
      handleComplete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, handleComplete]);

  const handlePrev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'შემოწმება' }} />
        <Text style={{ color: theme.colors.inkSoft }}>იტვირთება…</Text>
      </View>
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
        trailing="none"
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
        onBack={step === 0 ? () => router.back() : handlePrev}
        backDisabled={false}
      />

      {/* Step indicator bar (hidden on done screen) */}
      {step < 4 && <StepBar step={step} stepLabels={STEP_LABELS} />}

      {saving && (
        <Text style={styles.savingHint}>შენახვა…</Text>
      )}

      <KeyboardSafeArea>

        {/* ── Step 0: General Info ────────────────────────────────────────── */}
        {step === 0 && (
          <>
            <FloatingLabelInput
              label="ობიექტი / კომპანია *"
              value={inspection.company ?? ''}
              onChangeText={v => update('company', v)}
              required
            />
            <FloatingLabelInput
              label="მისამართი"
              value={inspection.address ?? ''}
              onChangeText={v => update('address', v || null)}
            />
            <FloatingLabelInput
              label="დამტვირთველის მარკა / მოდელი *"
              value={inspection.equipmentModel ?? ''}
              onChangeText={v => update('equipmentModel', v)}
              required
            />
            <FloatingLabelInput
              label="სახელმწიფო / ს.ნ ნომერი *"
              value={inspection.registrationNumber ?? ''}
              onChangeText={v => update('registrationNumber', v)}
              required
            />
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>შემოწმების თარიღი</Text>
              <DateTimeField
                mode="date"
                value={new Date(inspection.inspectionDate)}
                onChange={d => update('inspectionDate', d.toISOString().slice(0, 10))}
                maxDate={new Date()}
              />
            </View>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>შემოწმების სახე</Text>
              <View style={styles.chipRow}>
                {INSPECTION_TYPES.map(type => {
                  const active = inspection.inspectionType === type;
                  return (
                    <Pressable
                      key={type}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                      onPress={() => update('inspectionType', active ? null : type)}
                      {...a11y(INSPECTION_TYPE_LABEL[type], undefined, 'radio')}
                    >
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {INSPECTION_TYPE_LABEL[type]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <FloatingLabelInput
              label="ინსპექტორი"
              value={inspection.inspectorName ?? ''}
              onChangeText={v => update('inspectorName', v || null)}
            />
          </>
        )}

        {/* ── Step 1: Checklist ───────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.semantic.success }]} />
                <Text style={styles.legendText}>✓ კარგია</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.warn }]} />
                <Text style={styles.legendText}>⚠ ნაკლი</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
                <Text style={styles.legendText}>✗ გამოუსადეგ.</Text>
              </View>
            </View>

            {CATEGORIES.map(cat => {
              const catItems = catalog.filter(e => e.category === cat);
              return (
                <View key={cat}>
                  <View style={styles.catHeader}>
                    <Text style={styles.catHeaderText}>{BOBCAT_CATEGORY_LABELS[cat]}</Text>
                  </View>
                  <View style={styles.catItems}>
                    {catItems.map(entry => {
                      const state = inspection.items.find(i => i.id === entry.id)
                        ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
                      return (
                        <BobcatChecklistItem
                          key={entry.id}
                          index={catalog.indexOf(entry)}
                          entry={entry}
                          state={state}
                          onChange={patch => updateItem(entry.id, patch)}
                          onAddPhoto={() => handleAddPhoto(entry.id)}
                          onDeletePhoto={path => handleDeletePhoto(entry.id, path)}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── Step 2: Summary + Verdict ───────────────────────────────────── */}
        {step === 2 && (
          <>
            <View style={styles.sumTable}>
              <View style={[styles.sumRow, styles.sumHeaderRow]}>
                <Text style={[styles.sumCell, styles.sumCatCell, styles.sumHeaderText]}>კატეგორია</Text>
                <Text style={[styles.sumCountCell, styles.sumHeaderText]}>✓</Text>
                <Text style={[styles.sumCountCell, styles.sumHeaderText]}>⚠</Text>
                <Text style={[styles.sumCountCell, styles.sumHeaderText]}>✗</Text>
              </View>
              {CATEGORIES.map(cat => {
                const c = categoryCounts(inspection.items, cat, catalog);
                return (
                  <View key={cat} style={styles.sumRow}>
                    <Text style={[styles.sumCell, styles.sumCatCell]} numberOfLines={1}>
                      {BOBCAT_CATEGORY_LABELS[cat]}
                    </Text>
                    <Text style={[styles.sumCountCell, { color: theme.colors.semantic.success, fontWeight: '700' }]}>{c.good}</Text>
                    <Text style={[styles.sumCountCell, { color: theme.colors.warn, fontWeight: '700' }]}>{c.deficient}</Text>
                    <Text style={[styles.sumCountCell, { color: theme.colors.danger, fontWeight: '700' }]}>{c.unusable}</Text>
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
                    {VERDICT_LABEL[verdictSuggestion].split(' — ')[0]}
                  </Text>
                </Text>
              </View>
            )}

            <StepSectionLabel title="დასკვნა *" />
            <View style={styles.verdictBlock}>
              {(['approved', 'limited', 'rejected'] as BobcatVerdict[]).map(v => {
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
                    {...a11y(VERDICT_LABEL[v], undefined, 'radio')}
                  >
                    <View style={[styles.verdictCheck, active && styles.verdictCheckActive]}>
                      {active && <Ionicons name="checkmark" size={12} color={theme.colors.white} />}
                    </View>
                    <Text style={[styles.verdictLabel, active && styles.verdictLabelActive]}>
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
          </>
        )}

        {/* ── Step 3: Signature ───────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <StepSectionLabel title="ინსპექტორის ხელმოწერა" />
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
          </>
        )}

        {/* ── Step 4: Done ────────────────────────────────────────────────── */}
        {step === 4 && (
          <>
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
                  inspection.verdict === 'approved' && styles.doneVerdictGreen,
                  inspection.verdict === 'limited'  && styles.doneVerdictAmber,
                  inspection.verdict === 'rejected' && styles.doneVerdictRed,
                ]}>
                  <Text style={[
                    styles.doneVerdictText,
                    inspection.verdict === 'approved' && { color: theme.colors.semantic.success },
                    inspection.verdict === 'limited'  && { color: theme.colors.warn },
                    inspection.verdict === 'rejected' && { color: theme.colors.danger },
                  ]}>
                    {VERDICT_LABEL[inspection.verdict].split(' — ')[0]}
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
          </>
        )}

        {/* WizardNav — last child of scroll, not rendered on done screen */}
        {step < 4 && (
          <WizardNav
            isLast={step === 3}
            canGoNext={canGoNext}
            canGoPrev={step > 0}
            onNext={handleNext}
            onPrev={handlePrev}
          />
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

// ── Sub-components ─────────────────────────────────────────────────────────────

// ── Styles ─────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 16, paddingTop: 4 },

    fieldRow: { marginBottom: 12, gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    typeChip: {
      paddingHorizontal: 14, paddingVertical: 7,
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

    legend: { flexDirection: 'row', gap: 12, marginBottom: 8, flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: theme.colors.inkSoft },
    catHeader: {
      paddingHorizontal: 10, paddingVertical: 7,
      backgroundColor: theme.colors.subtleSurface,
      borderRadius: 6, marginTop: 10, marginBottom: 4,
    },
    catHeaderText: { fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft },
    catItems: { gap: 4, marginBottom: 4 },

    sumTable: {
      borderWidth: 0.5, borderColor: theme.colors.hairline,
      borderRadius: 10, overflow: 'hidden', marginBottom: 12,
    },
    sumRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: theme.colors.hairline },
    sumHeaderRow: { backgroundColor: theme.colors.subtleSurface },
    sumCell: { flex: 1, padding: 8, fontSize: 11 },
    sumCatCell: { flex: 3, color: theme.colors.ink },
    sumCountCell: { width: 40, textAlign: 'center', padding: 8, fontSize: 13, color: theme.colors.inkSoft },
    sumHeaderText: { fontWeight: '700', color: theme.colors.inkSoft, fontSize: 10, textTransform: 'uppercase' },

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
    verdictOptionActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
    },
    verdictOptionSuggested: {
      borderColor: theme.colors.warn,
      backgroundColor: theme.colors.warnSoft,
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

    sigArea: {
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.hairline,
      borderRadius: 12, padding: 24, alignItems: 'center', justifyContent: 'center',
      minHeight: 80, marginBottom: 12,
    },
    sigAreaSigned: {
      borderStyle: 'solid', borderColor: theme.colors.semantic.success,
      backgroundColor: theme.colors.semantic.successSoft,
    },
    sigContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sigHint: { fontSize: 14, color: theme.colors.accent },
    sigClear: { fontSize: 12, color: theme.colors.danger, marginLeft: 8 },
    sigRequiredHint: { fontSize: 12, color: theme.colors.inkFaint, textAlign: 'center', marginTop: 4 },

    completingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
    completingText: { fontSize: 13, color: theme.colors.inkSoft },

    doneHero: { alignItems: 'center', paddingVertical: 32, gap: 10 },
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
  });
}

