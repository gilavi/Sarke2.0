import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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
import { EquipmentRow } from '../../../components/generalEquipment/EquipmentRow';
import { WizardNav } from '../../../components/wizard/WizardNav';
import { StepBar } from '../../../components/wizard/StepBar';
import { StepSectionLabel } from '../../../components/wizard/StepSectionLabel';
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
import {
  buildDefaultEquipmentRow,
  INSPECTION_TYPE_LABEL,
  SIGNER_ROLE_LABEL,
  resolveSignerPosition,
  type GeneralEquipmentInspection,
  type EquipmentItem,
  type GEInspectionType,
  type GESignerRole,
} from '../../../types/generalEquipment';

// Steps: 0=ინფო  1=აღჭ.  2=შეჯამება  3=ხელმოწ.  4=done
const STEP_LABELS = ['ინფო', 'აღჭ.', 'შეჯამება', 'ხელმოწ.'];
const TOTAL_STEPS = 4;

export default function GeneralEquipmentScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();

  const [inspection, setInspection] = useState<GeneralEquipmentInspection | null>(null);
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
        const insp = await generalEquipmentApi.getById(id);
        if (cancelled) return;
        if (!insp) { router.back(); return; }

        let patched = insp;
        if (session.state.status === 'signedIn') {
          const u = session.state.user;
          const name = `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim();
          if (name && !insp.inspectorName) patched = { ...patched, inspectorName: name };
          if (name && !insp.signerName)    patched = { ...patched, signerName: name };
        }
        setInspection(patched);

        if (insp.status === 'completed') setStep(4);

        projectsApi.getById(insp.projectId).then(p => {
          if (cancelled || !p) return;
          setProjectName(p.name);
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

  const updateEquipmentRow = useCallback((rowId: string, patch: Partial<EquipmentItem>) => {
    setInspection(prev => {
      if (!prev) return prev;
      const equipment = prev.equipment.map(r =>
        r.id === rowId ? { ...r, ...patch } : r,
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

  const deleteEquipmentRow = useCallback((rowId: string) => {
    setInspection(prev => {
      if (!prev) return prev;
      if (prev.equipment.length <= 1) return prev;
      const equipment = prev.equipment.filter(r => r.id !== rowId);
      const next = { ...prev, equipment };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Photo handling — equipment rows ─────────────────────────────────────────

  const handleAddEquipmentPhoto = useCallback((rowId: string) => {
    Alert.alert('ფოტოს წყარო', undefined, [
      {
        text: 'კამერა',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { toast.error('კამერაზე წვდომა დახურულია'); return; }
          const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadEquipmentPhoto(rowId, res.assets[0].uri);
        },
      },
      {
        text: 'გალერეა',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { toast.error('გალერეაზე წვდომა დახურულია'); return; }
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadEquipmentPhoto(rowId, res.assets[0].uri);
        },
      },
      { text: 'გაუქმება', style: 'cancel' },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadEquipmentPhoto = async (rowId: string, uri: string) => {
    if (!inspection) return;
    try {
      const path = await generalEquipmentApi.uploadPhoto(inspection.id, 'equipment', rowId, uri);
      setInspection(prev => {
        if (!prev) return prev;
        const equipment = prev.equipment.map(r =>
          r.id === rowId ? { ...r, photo_paths: [...r.photo_paths, path] } : r,
        );
        const next = { ...prev, equipment };
        scheduleSave(next);
        return next;
      });
    } catch (e) {
      toast.error(friendlyError(e, 'ფოტო ვერ აიტვირთა'));
    }
  };

  const handleDeleteEquipmentPhoto = useCallback((rowId: string, path: string) => {
    generalEquipmentApi.deletePhoto(path).catch(() => {});
    setInspection(prev => {
      if (!prev) return prev;
      const equipment = prev.equipment.map(r =>
        r.id === rowId ? { ...r, photo_paths: r.photo_paths.filter(p => p !== path) } : r,
      );
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
          if (!perm.granted) { toast.error('კამერაზე წვდომა დახურულია'); return; }
          const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadSummaryPhoto(res.assets[0].uri);
        },
      },
      {
        text: 'გალერეა',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { toast.error('გალერეაზე წვდომა დახურულია'); return; }
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadSummaryPhoto(res.assets[0].uri);
        },
      },
      { text: 'გაუქმება', style: 'cancel' },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadSummaryPhoto = async (uri: string) => {
    if (!inspection) return;
    try {
      const path = await generalEquipmentApi.uploadPhoto(inspection.id, 'summary', 'summary', uri);
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

  const handleDeleteSummaryPhoto = useCallback((path: string) => {
    generalEquipmentApi.deletePhoto(path).catch(() => {});
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, summaryPhotos: prev.summaryPhotos.filter(p => p !== path) };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // ── Signature ────────────────────────────────────────────────────────────────

  const handleSignatureConfirm = useCallback((base64Png: string) => {
    setShowSig(false);
    update('inspectorSignature', base64Png);
  }, [update]);

  // ── Complete ─────────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!inspection) return;
    const missing: string[] = [];
    if (!inspection.objectName?.trim())    missing.push('ობიექტის დასახელება');
    if (!inspection.conclusion?.trim())    missing.push('დასკვნა');
    if (!inspection.inspectorSignature)    missing.push('ხელმოწერა');
    const hasFilledRow = inspection.equipment.some(r => r.name.trim());
    if (!hasFilledRow)                     missing.push('მინიმუმ 1 აღჭ. სტრ.');
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
      setStep(4);
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

  // ── Step navigation ──────────────────────────────────────────────────────────

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
        flowTitle="ტექ. აღჭ."
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

      {step < 4 && <StepBar step={step} stepLabels={STEP_LABELS} />}

      {saving && (
        <Text style={styles.savingHint}>შენახვა…</Text>
      )}

      <KeyboardSafeArea>

        {/* ── Step 0: General info ──────────────────────────────────────────── */}
        {step === 0 && (
          <>
            <StepSectionLabel title="I — ზოგადი ინფორმაცია" />

            <FloatingLabelInput
              label="ობიექტის დასახელება *"
              value={inspection.objectName ?? ''}
              onChangeText={v => update('objectName', v || null)}
              required
            />
            <FloatingLabelInput
              label="მისამართი"
              value={inspection.address ?? ''}
              onChangeText={v => update('address', v || null)}
            />
            <FloatingLabelInput
              label="საქმიანობის სახე"
              value={inspection.activityType ?? ''}
              onChangeText={v => update('activityType', v || null)}
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
              label="აქტის №"
              value={inspection.actNumber ?? ''}
              onChangeText={v => update('actNumber', v || null)}
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
            />
          </>
        )}

        {/* ── Step 1: Equipment list ────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <StepSectionLabel title="II — აღჭურვილობის სია" />

            {inspection.equipment.map((item, idx) => (
              <EquipmentRow
                key={item.id}
                index={idx}
                item={item}
                canDelete={inspection.equipment.length > 1}
                onChange={patch => updateEquipmentRow(item.id, patch)}
                onDelete={() => deleteEquipmentRow(item.id)}
                onAddPhoto={() => handleAddEquipmentPhoto(item.id)}
                onDeletePhoto={path => handleDeleteEquipmentPhoto(item.id, path)}
              />
            ))}

            <Pressable
              style={styles.addRowBtn}
              onPress={addEquipmentRow}
              {...a11y('აღჭ. დამატება', '+ აღჭურვილობის სტრიქონის დამატება', 'button')}
            >
              <Ionicons name="add-circle-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.addRowText}>+ აღჭურვილობის დამატება</Text>
            </Pressable>
          </>
        )}

        {/* ── Step 2: Summary ───────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <StepSectionLabel title="III — შეჯამება" />

            <FloatingLabelInput
              label="დასკვნა *"
              value={inspection.conclusion ?? ''}
              onChangeText={v => update('conclusion', v || null)}
              multiline
              numberOfLines={4}
              required
            />

            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>ფოტოები (სურვ.)</Text>

            <SummaryPhotoStrip
              paths={inspection.summaryPhotos}
              onAdd={handleAddSummaryPhoto}
              onDelete={handleDeleteSummaryPhoto}
              styles={styles}
            />
          </>
        )}

        {/* ── Step 3: Signature ─────────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <StepSectionLabel title="IV — ხელმოწერა" />

            <FloatingLabelInput
              label="სახელი / გვარი"
              value={inspection.signerName ?? ''}
              onChangeText={v => update('signerName', v || null)}
            />

            <Text style={styles.fieldLabel}>თანამდებობა</Text>
            <View style={styles.typeChips}>
              {(['electrician', 'technician', 'safety_specialist', 'other'] as GESignerRole[]).map(r => {
                const active = inspection.signerRole === r;
                return (
                  <Pressable
                    key={r}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => update('signerRole', active ? null : r)}
                    {...a11y(SIGNER_ROLE_LABEL[r], undefined, 'radio')}
                  >
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                      {SIGNER_ROLE_LABEL[r]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {inspection.signerRole === 'other' && (
              <FloatingLabelInput
                label="სხვა თანამდებობა"
                value={inspection.signerRoleCustom ?? ''}
                onChangeText={v => update('signerRoleCustom', v || null)}
                autoFocus
              />
            )}

            <Pressable
              style={[styles.sigArea, inspection.inspectorSignature && styles.sigAreaSigned]}
              onPress={() => setShowSig(true)}
              {...a11y('ხელმოწერა', 'შემომწმებლის ხელმოწერის დამატება', 'button')}
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

        {/* ── Step 4: Done ──────────────────────────────────────────────────── */}
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
              {inspection.signerRole && (
                <View style={styles.doneRole}>
                  <Text style={styles.doneRoleText}>
                    {resolveSignerPosition(inspection.signerRole, inspection.signerRoleCustom)}
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
        personName={inspection.signerName ?? 'შემომწმებელი'}
        onCancel={() => setShowSig(false)}
        onConfirm={handleSignatureConfirm}
      />
    </View>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────────

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
    imageForDisplay(STORAGE_BUCKETS.answerPhotos, path).then(setUri).catch(() => {});
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

// ── Styles ───────────────────────────────────────────────────────────────────────

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: theme.colors.background },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 16, paddingTop: 4 },

    fieldRow:   { marginBottom: 12, gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.inkSoft, marginBottom: 6 },

    typeChips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    typeChip: {
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: theme.colors.hairline,
      backgroundColor: theme.colors.card,
    },
    typeChipActive:     { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentSoft },
    typeChipText:       { fontSize: 13, color: theme.colors.inkSoft, fontWeight: '500' },
    typeChipTextActive: { color: theme.colors.accent, fontWeight: '700' },

    addRowBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 14, paddingHorizontal: 12,
      borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed',
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
      marginTop: 4,
    },
    addRowText: { fontSize: 14, fontWeight: '600', color: theme.colors.accent },

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

    sigArea: {
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.hairline,
      borderRadius: 12, padding: 24, alignItems: 'center', justifyContent: 'center',
      minHeight: 80, marginBottom: 12, marginTop: 8,
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
    doneRole: {
      paddingHorizontal: 16, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentSoft,
      marginTop: 8,
    },
    doneRoleText: { fontSize: 13, fontWeight: '700', color: theme.colors.accent },
  });
}
