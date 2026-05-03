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
import { ExcavatorChecklistItem } from '../../../components/excavator/ExcavatorChecklistItem';
import { ExcavatorMaintenanceItem } from '../../../components/excavator/ExcavatorMaintenanceItem';
import { WizardNav } from '../../../components/wizard/WizardNav';
import { StepBar } from '../../../components/wizard/StepBar';
import { StepSectionLabel } from '../../../components/wizard/StepSectionLabel';
import { FlowHeader } from '../../../components/FlowHeader';
import { useTheme, type Theme } from '../../../lib/theme';
import { useSession } from '../../../lib/session';
import { useToast } from '../../../lib/toast';
import { excavatorApi } from '../../../lib/excavatorService';
import { projectsApi } from '../../../lib/services';
import { buildExcavatorPdfHtml } from '../../../lib/excavatorPdf';
import { generateAndSharePdf } from '../../../lib/pdfOpen';
import { generatePdfName } from '../../../lib/pdfName';
import { recordCompletion } from '../../../lib/calendarSchedule';
import { friendlyError } from '../../../lib/errorMap';
import { a11y } from '../../../lib/accessibility';
import {
  ENGINE_ITEMS,
  UNDERCARRIAGE_ITEMS,
  CABIN_ITEMS,
  SAFETY_ITEMS,
  MAINTENANCE_ITEMS,
  EXCAVATOR_VERDICT_LABEL,
  computeExcavatorVerdictSuggestion,
  type ExcavatorInspection,
  type ExcavatorVerdict,
  type ExcavatorChecklistItemState,
  type ExcavatorMaintenanceItemState,
} from '../../../types/excavator';

type Section = 'engine' | 'undercarriage' | 'cabin' | 'safety';

// Steps: 0=info  1=engine  2=undercarriage  3=cabin+safety  4=maintenance+verdict  5=signature  6=done
const STEP_LABELS = ['ინფო', 'ძრავი', 'სავალი ნ.', 'კაბინა', 'ტ.მომს.', 'ხელმოწ.'];
const TOTAL_STEPS = 6;

export default function ExcavatorInspectionScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();

  const [inspection, setInspection] = useState<ExcavatorInspection | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showSig, setShowSig] = useState(false);
  const [step, setStep] = useState(0);

  // ── Load ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const insp = await excavatorApi.getById(id);
        if (cancelled) return;
        if (!insp) { router.back(); return; }

        let patched = insp;
        if (!insp.inspectorName && session.state.status === 'signedIn') {
          const u = session.state.user;
          const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
          if (name) patched = { ...patched, inspectorName: name };
        }
        setInspection(patched);

        if (insp.status === 'completed') setStep(6);

        projectsApi.getById(insp.projectId).then(p => {
          if (cancelled || !p) return;
          setProjectName(p.name);
          setInspection(prev => {
            if (!prev) return prev;
            const projectNameFill = !prev.projectName?.trim() ? p.name : null;
            if (!projectNameFill) return prev;
            const next = { ...prev, projectName: projectNameFill };
            excavatorApi.patch(next.id, { projectName: projectNameFill }).catch(() => {});
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

  // ── Auto-save ───────────────────────────────────────────────────────────────

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

  // ── Checklist item update ────────────────────────────────────────────────────

  const updateChecklistItem = useCallback((
    section: Section,
    itemId: number,
    patch: Partial<Pick<ExcavatorChecklistItemState, 'result' | 'comment'>>,
  ) => {
    setInspection(prev => {
      if (!prev) return prev;
      const key = sectionKey(section);
      const items = (prev[key] as ExcavatorChecklistItemState[]).map(i =>
        i.id === itemId ? { ...i, ...patch } : i,
      );
      const next = { ...prev, [key]: items };
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

  // ── Photo handling ──────────────────────────────────────────────────────────

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
    if (!inspection) return;
    try {
      const path = await excavatorApi.uploadPhoto(inspection.id, section, itemId, uri);
      setInspection(prev => {
        if (!prev) return prev;
        const key = sectionKey(section);
        const items = (prev[key] as ExcavatorChecklistItemState[]).map(i =>
          i.id === itemId ? { ...i, photo_paths: [...(i.photo_paths ?? []), path] } : i,
        );
        const next = { ...prev, [key]: items };
        scheduleSave(next);
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  };

  const handleDeletePhoto = useCallback((section: Section, itemId: number, path: string) => {
    excavatorApi.deletePhoto(path).catch(() => {});
    setInspection(prev => {
      if (!prev) return prev;
      const key = sectionKey(section);
      const items = (prev[key] as ExcavatorChecklistItemState[]).map(i =>
        i.id === itemId ? { ...i, photo_paths: i.photo_paths.filter(p => p !== path) } : i,
      );
      const next = { ...prev, [key]: items };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Signature ────────────────────────────────────────────────────────────────

  const handleSignatureConfirm = useCallback((base64Png: string) => {
    setShowSig(false);
    update('inspectorSignature', base64Png);
  }, [update]);

  // ── Verdict auto-suggestion ──────────────────────────────────────────────────

  const verdictSuggestion = useMemo(
    () => inspection ? computeExcavatorVerdictSuggestion(inspection) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inspection?.engineItems, inspection?.undercarriageItems, inspection?.cabinItems, inspection?.safetyItems],
  );

  const showVerdictBanner = verdictSuggestion !== null && inspection?.verdict !== verdictSuggestion;

  // ── Complete ─────────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!inspection) return;
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
      setStep(6);
      toast.success('შემოწმება დასრულდა');
    } catch (e) {
      toast.error(friendlyError(e, 'შეცდომა'));
    } finally {
      setCompleting(false);
    }
  }, [inspection, toast]);

  // ── PDF ──────────────────────────────────────────────────────────────────────

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

  // ── Step navigation ──────────────────────────────────────────────────────────

  const canGoNext = useMemo(() => {
    if (!inspection || step >= 6) return false;
    if (step === 5) return !!inspection.inspectorSignature && !completing;
    return true;
  }, [step, inspection, completing]);

  const handleNext = useCallback(() => {
    if (step === 5) {
      handleComplete();
    } else {
      setStep(s => s + 1);
    }
  }, [step, handleComplete]);

  const handlePrev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  // ── Render ───────────────────────────────────────────────────────────────────

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
        flowTitle="ექსკავატორი"
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

      {step < 6 && <StepBar step={step} stepLabels={STEP_LABELS} />}

      {saving && (
        <Text style={styles.savingHint}>შენახვა…</Text>
      )}

      <KeyboardSafeArea>

        {/* ── Step 0: Document Info ──────────────────────────────────────────── */}
        {step === 0 && (
          <>
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
                onChange={d => update('inspectionDate', d.toISOString().slice(0, 10))}
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
                onChange={d => update('lastInspectionDate', d.toISOString().slice(0, 10))}
                maxDate={new Date()}
              />
            </View>
          </>
        )}

        {/* ── Step 1: Engine ────────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <ChecklistLegend styles={styles} />
            <SectionHeader title="1. ძრავი (Engine)" styles={styles} />
            {ENGINE_ITEMS.map((entry, idx) => {
              const state = inspection.engineItems.find(i => i.id === entry.id)
                ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
              return (
                <ExcavatorChecklistItem
                  key={entry.id}
                  globalIndex={idx}
                  entry={entry}
                  state={state}
                  onChange={patch => updateChecklistItem('engine', entry.id, patch)}
                  onAddPhoto={() => handleAddPhoto('engine', entry.id)}
                  onDeletePhoto={path => handleDeletePhoto('engine', entry.id, path)}
                />
              );
            })}
          </>
        )}

        {/* ── Step 2: Undercarriage ─────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <ChecklistLegend styles={styles} />
            <SectionHeader title="2. სავალი ნაწილი (Undercarriage)" styles={styles} />
            {UNDERCARRIAGE_ITEMS.map((entry, idx) => {
              const state = inspection.undercarriageItems.find(i => i.id === entry.id)
                ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
              return (
                <ExcavatorChecklistItem
                  key={entry.id}
                  globalIndex={idx}
                  entry={entry}
                  state={state}
                  onChange={patch => updateChecklistItem('undercarriage', entry.id, patch)}
                  onAddPhoto={() => handleAddPhoto('undercarriage', entry.id)}
                  onDeletePhoto={path => handleDeletePhoto('undercarriage', entry.id, path)}
                />
              );
            })}
          </>
        )}

        {/* ── Step 3: Cabin + Safety ────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <ChecklistLegend styles={styles} />
            <SectionHeader title="4. კაბინა (Cabin)" styles={styles} />
            {CABIN_ITEMS.map((entry, idx) => {
              const state = inspection.cabinItems.find(i => i.id === entry.id)
                ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
              return (
                <ExcavatorChecklistItem
                  key={`cabin-${entry.id}`}
                  globalIndex={idx}
                  entry={entry}
                  state={state}
                  onChange={patch => updateChecklistItem('cabin', entry.id, patch)}
                  onAddPhoto={() => handleAddPhoto('cabin', entry.id)}
                  onDeletePhoto={path => handleDeletePhoto('cabin', entry.id, path)}
                />
              );
            })}
            <SectionHeader title="5. უსაფრთხოება (Safety)" styles={styles} />
            {SAFETY_ITEMS.map((entry, idx) => {
              const state = inspection.safetyItems.find(i => i.id === entry.id)
                ?? { id: entry.id, result: null, comment: null, photo_paths: [] };
              return (
                <ExcavatorChecklistItem
                  key={`safety-${entry.id}`}
                  globalIndex={idx}
                  entry={entry}
                  state={state}
                  onChange={patch => updateChecklistItem('safety', entry.id, patch)}
                  onAddPhoto={() => handleAddPhoto('safety', entry.id)}
                  onDeletePhoto={path => handleDeletePhoto('safety', entry.id, path)}
                />
              );
            })}
          </>
        )}

        {/* ── Step 4: Maintenance + Verdict ─────────────────────────────────── */}
        {step === 4 && (
          <>
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

            <StepSectionLabel title="IV — დასკვნა *" />

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
          </>
        )}

        {/* ── Step 5: Signature ─────────────────────────────────────────────── */}
        {step === 5 && (
          <>
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
          </>
        )}

        {/* ── Step 6: Done ──────────────────────────────────────────────────── */}
        {step === 6 && (
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
          </>
        )}

        {step < 6 && (
          <WizardNav
            isLast={step === 5}
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

// ── Helpers ─────────────────────────────────────────────────────────────────────

function sectionKey(s: Section): keyof ExcavatorInspection {
  const map: Record<Section, keyof ExcavatorInspection> = {
    engine:        'engineItems',
    undercarriage: 'undercarriageItems',
    cabin:         'cabinItems',
    safety:        'safetyItems',
  };
  return map[s];
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function MachineSpecsCard({ insp, styles }: { insp: ExcavatorInspection; styles: ReturnType<typeof getstyles> }) {
  const sp = insp.machineSpecs;
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

function ChecklistLegend({ styles }: { styles: ReturnType<typeof getstyles> }) {
  const { theme } = useTheme();
  return (
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
  );
}

function SectionHeader({ title, styles }: { title: string; styles: ReturnType<typeof getstyles> }) {
  return (
    <View style={styles.catHeader}>
      <Text style={styles.catHeaderText}>{title}</Text>
    </View>
  );
}


// ── Styles ──────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: theme.colors.background },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 16, paddingTop: 4 },

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

    fieldRow:   { marginBottom: 12, gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft },

    legend:     { flexDirection: 'row', gap: 12, marginBottom: 8, flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot:  { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: theme.colors.inkSoft },
    catHeader: {
      paddingHorizontal: 10, paddingVertical: 7,
      borderRadius: 6, marginTop: 10, marginBottom: 4,
      backgroundColor: theme.colors.subtleSurface,
    },
    catHeaderText: { fontSize: 11, fontWeight: '700', color: theme.colors.inkSoft },

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

