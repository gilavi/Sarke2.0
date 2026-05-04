import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { EquipmentRow } from '../../../components/generalEquipment/EquipmentRow';

import { WizardStepTransition } from '../../../components/wizard/WizardStepTransition';

import { StepSectionLabel } from '../../../components/wizard/StepSectionLabel';
import { ChecklistTour, TOUR_SEEN_KEY } from '../../../components/wizard/ChecklistTour';
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

const STEP_LABELS = ['áƒ˜áƒœáƒ¤áƒ', 'áƒáƒ¦áƒ­.', 'áƒ¨áƒ”áƒ¯áƒáƒ›áƒ”áƒ‘áƒ', 'áƒ®áƒ”áƒšáƒ›áƒáƒ¬.'];
const TOTAL_STEPS = 4;
const SIGNATURE_STEP = 3;
const DONE_STEP = 4;

export default function GeneralEquipmentScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => getstyles(theme), [theme]);
  const insets = useSafeAreaInsets();
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
  const [showTour, setShowTour] = useState(false);

  const [step, setStep] = useState(0);
  const prevStepRef = useRef(0);
  const [animateSteps, setAnimateSteps] = useState(false);
  const inspectionRef = useRef<GeneralEquipmentInspection | null>(null);
  const animateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { inspectionRef.current = inspection; }, [inspection]);

  const persistKey = useMemo(() => `ge-wizard:${id}:step`, [id]);

  const direction: 'next' | 'prev' = step >= prevStepRef.current ? 'next' : 'prev';
  useEffect(() => { prevStepRef.current = step; }, [step]);

  // â”€â”€ Load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

        if (insp.status === 'completed') {
          setStep(4);
        } else {
          const saved = await AsyncStorage.getItem(persistKey);
          if (saved && !cancelled) {
            const s = parseInt(saved, 10);
            if (!isNaN(s) && s >= 0 && s <= 3) setStep(s);
          }
        }

        projectsApi.getById(insp.projectId).then(p => {
          if (cancelled || !p) return;
          setProjectName(p.name);
        }).catch(() => {});

        const tourSeen = await AsyncStorage.getItem(TOUR_SEEN_KEY);
        if (!tourSeen && !cancelled) setShowTour(true);
      } catch (e) {
        console.log('[GE] load error:', e);
        if (!cancelled) {
          toast.error(friendlyError(e, 'áƒ•áƒ”áƒ  áƒ©áƒáƒ˜áƒ¢áƒ•áƒ˜áƒ áƒ—áƒ'));
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
    if (step >= 0 && step <= 3) {
      AsyncStorage.setItem(persistKey, String(step)).catch(() => {});
    }
  }, [step, persistKey]);

  // Clear pending auto-save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // â”€â”€ Auto-save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        toast.error(friendlyError(e, 'áƒ¨áƒ”áƒœáƒáƒ®áƒ•áƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ”áƒ áƒ®áƒ“áƒ'));
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

  // â”€â”€ Equipment row updates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Photo handling â€” equipment rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleAddEquipmentPhoto = useCallback((rowId: string) => {
    Alert.alert('áƒ¤áƒáƒ¢áƒáƒ¡ áƒ¬áƒ§áƒáƒ áƒ', undefined, [
      {
        text: 'áƒ™áƒáƒ›áƒ”áƒ áƒ',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { toast.error('áƒ™áƒáƒ›áƒ”áƒ áƒáƒ–áƒ” áƒ¬áƒ•áƒ“áƒáƒ›áƒ áƒ“áƒáƒ®áƒ£áƒ áƒ£áƒšáƒ˜áƒ'); return; }
          const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadEquipmentPhoto(rowId, res.assets[0].uri);
        },
      },
      {
        text: 'áƒ’áƒáƒšáƒ”áƒ áƒ”áƒ',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { toast.error('áƒ’áƒáƒšáƒ”áƒ áƒ”áƒáƒ–áƒ” áƒ¬áƒ•áƒ“áƒáƒ›áƒ áƒ“áƒáƒ®áƒ£áƒ áƒ£áƒšáƒ˜áƒ'); return; }
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadEquipmentPhoto(rowId, res.assets[0].uri);
        },
      },
      { text: 'áƒ’áƒáƒ£áƒ¥áƒ›áƒ”áƒ‘áƒ', style: 'cancel' },
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadEquipmentPhoto = async (rowId: string, uri: string) => {
    const insp = inspectionRef.current;
    if (!insp) return;
    try {
      const path = await generalEquipmentApi.uploadPhoto(insp.id, 'equipment', rowId, uri);
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
      toast.error(friendlyError(e, 'áƒ¤áƒáƒ¢áƒ áƒ•áƒ”áƒ  áƒáƒ˜áƒ¢áƒ•áƒ˜áƒ áƒ—áƒ'));
    }
  };

  const handleDeleteEquipmentPhoto = useCallback(async (rowId: string, path: string) => {
    try {
      await generalEquipmentApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'áƒ¤áƒáƒ¢áƒáƒ¡ áƒ¬áƒáƒ¨áƒšáƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ”áƒ áƒ®áƒ“áƒ'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const equipment = prev.equipment.map(r =>
        r.id === rowId ? { ...r, photo_paths: r.photo_paths.filter(p => p !== path) } : r,
      );
      const next = { ...prev, equipment };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, toast]);

  // â”€â”€ Photo handling â€” summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleAddSummaryPhoto = useCallback(() => {
    Alert.alert('áƒ¤áƒáƒ¢áƒáƒ¡ áƒ¬áƒ§áƒáƒ áƒ', undefined, [
      {
        text: 'áƒ™áƒáƒ›áƒ”áƒ áƒ',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { toast.error('áƒ™áƒáƒ›áƒ”áƒ áƒáƒ–áƒ” áƒ¬áƒ•áƒ“áƒáƒ›áƒ áƒ“áƒáƒ®áƒ£áƒ áƒ£áƒšáƒ˜áƒ'); return; }
          const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadSummaryPhoto(res.assets[0].uri);
        },
      },
      {
        text: 'áƒ’áƒáƒšáƒ”áƒ áƒ”áƒ',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { toast.error('áƒ’áƒáƒšáƒ”áƒ áƒ”áƒáƒ–áƒ” áƒ¬áƒ•áƒ“áƒáƒ›áƒ áƒ“áƒáƒ®áƒ£áƒ áƒ£áƒšáƒ˜áƒ'); return; }
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!res.canceled && res.assets[0]) await uploadSummaryPhoto(res.assets[0].uri);
        },
      },
      { text: 'áƒ’áƒáƒ£áƒ¥áƒ›áƒ”áƒ‘áƒ', style: 'cancel' },
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
      toast.error(friendlyError(e, 'áƒ¤áƒáƒ¢áƒ áƒ•áƒ”áƒ  áƒáƒ˜áƒ¢áƒ•áƒ˜áƒ áƒ—áƒ'));
    }
  };

  const handleDeleteSummaryPhoto = useCallback(async (path: string) => {
    try {
      await generalEquipmentApi.deletePhoto(path);
    } catch (e) {
      toast.error(friendlyError(e, 'áƒ¤áƒáƒ¢áƒáƒ¡ áƒ¬áƒáƒ¨áƒšáƒ áƒ•áƒ”áƒ  áƒ›áƒáƒ®áƒ”áƒ áƒ®áƒ“áƒ'));
      return;
    }
    setInspection(prev => {
      if (!prev) return prev;
      const next = { ...prev, summaryPhotos: prev.summaryPhotos.filter(p => p !== path) };
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave, toast]);

  // â”€â”€ Signature â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleSignatureConfirm = useCallback((base64Png: string) => {
    setShowSig(false);
    update('inspectorSignature', base64Png);
  }, [update]);

  // â”€â”€ Complete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleComplete = useCallback(async () => {
    if (!inspection || completing) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const missing: string[] = [];
    if (!inspection.objectName?.trim())    missing.push('áƒáƒ‘áƒ˜áƒ”áƒ¥áƒ¢áƒ˜áƒ¡ áƒ“áƒáƒ¡áƒáƒ®áƒ”áƒšáƒ”áƒ‘áƒ');
    if (!inspection.conclusion?.trim())    missing.push('áƒ“áƒáƒ¡áƒ™áƒ•áƒœáƒ');
    if (!inspection.inspectorSignature)    missing.push('áƒ®áƒ”áƒšáƒ›áƒáƒ¬áƒ”áƒ áƒ');
    const hasFilledRow = inspection.equipment.some(r => r.name.trim());
    if (!hasFilledRow)                     missing.push('áƒ›áƒ˜áƒœáƒ˜áƒ›áƒ£áƒ› 1 áƒáƒ¦áƒ­. áƒ¡áƒ¢áƒ .');
    // Validate notes on degraded equipment rows
    const degradedWithoutNote = inspection.equipment.filter(
      r => (r.condition === 'needs_service' || r.condition === 'unusable') && !r.note?.trim(),
    );
    if (degradedWithoutNote.length > 0) {
      missing.push(`áƒ¨áƒ”áƒœáƒ˜áƒ¨áƒ•áƒœáƒ áƒ¡áƒáƒ­áƒ˜áƒ áƒáƒ ${degradedWithoutNote.length} áƒáƒ¦áƒ­áƒ£áƒ áƒ•áƒ˜áƒšáƒáƒ‘áƒáƒ–áƒ”`);
    }
    if (missing.length > 0) {
      Alert.alert('áƒ¨áƒ”áƒáƒ•áƒ¡áƒ”áƒ— áƒ¡áƒáƒ•áƒáƒšáƒ“áƒ”áƒ‘áƒ£áƒšáƒ áƒ•áƒ”áƒšáƒ”áƒ‘áƒ˜', missing.map(m => `â€¢ ${m}`).join('\n'));
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
      setStep(4);
      toast.success('áƒ¨áƒ”áƒ›áƒáƒ¬áƒ›áƒ”áƒ‘áƒ áƒ“áƒáƒ¡áƒ áƒ£áƒšáƒ“áƒ');
    } catch (e) {
      toast.error(friendlyError(e, 'áƒ¨áƒ”áƒªáƒ“áƒáƒ›áƒ'));
    } finally {
      setCompleting(false);
    }
  }, [inspection, toast, persistKey]);

  // â”€â”€ PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handlePdf = useCallback(async () => {
    if (!inspection) return;
    setGeneratingPdf(true);
    try {
      const html = await buildGeneralEquipmentPdfHtml({
        inspection,
        projectName: projectName || 'áƒžáƒ áƒáƒ”áƒ¥áƒ¢áƒ˜',
      });
      const pdfName = generatePdfName(
        projectName || 'project',
        'EquipmentInspection',
        new Date(inspection.inspectionDate),
        inspection.id,
      );
      await generateAndSharePdf(html, pdfName);
    } catch (e) {
      toast.error(friendlyError(e, 'PDF áƒ•áƒ”áƒ  áƒ¨áƒ”áƒ˜áƒ¥áƒ›áƒœáƒ'));
    } finally {
      setGeneratingPdf(false);
    }
  }, [inspection, projectName, toast]);

  // â”€â”€ Step navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    if (step === 4) {
      router.back();
    } else if (step > 0) {
      setStep(s => s - 1);
    }
  }, [step, router]);

  // â”€â”€ Render helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const filledCount = inspection?.equipment.filter(r => r.name.trim()).length ?? 0;
  const totalCount = inspection?.equipment.length ?? 0;

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loading || !inspection) {
    return (
      <View style={[styles.root, styles.centred]}>
        <Stack.Screen options={{ headerShown: true, title: 'áƒ¨áƒ”áƒ›áƒáƒ¬áƒ›áƒ”áƒ‘áƒ' }} />
        <Text style={{ color: theme.colors.inkSoft }}>áƒ˜áƒ¢áƒ•áƒ˜áƒ áƒ—áƒ”áƒ‘áƒâ€¦</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <FlowHeader
        flowTitle="áƒ¢áƒ”áƒ¥. áƒáƒ¦áƒ­."
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
        onBack={step === 0 ? () => router.back() : handlePrev}
        backDisabled={false}
      />



      {saving && (
        <Text style={styles.savingHint}>áƒ¨áƒ”áƒœáƒáƒ®áƒ•áƒâ€¦</Text>
      )}

      <KeyboardSafeArea>
        <WizardStepTransition
          stepKey={step}
          direction={direction}
          animate={animateSteps}
        >
          {/* â”€â”€ Step 0: General info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === 0 && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <StepSectionLabel title="I â€” áƒ–áƒáƒ’áƒáƒ“áƒ˜ áƒ˜áƒœáƒ¤áƒáƒ áƒ›áƒáƒªáƒ˜áƒ" />

              <FloatingLabelInput
                label="áƒáƒ‘áƒ˜áƒ”áƒ¥áƒ¢áƒ˜áƒ¡ áƒ“áƒáƒ¡áƒáƒ®áƒ”áƒšáƒ”áƒ‘áƒ *"
                value={inspection.objectName ?? ''}
                onChangeText={v => update('objectName', v || null)}
                required
              />
              <FloatingLabelInput
                label="áƒ›áƒ˜áƒ¡áƒáƒ›áƒáƒ áƒ—áƒ˜"
                value={inspection.address ?? ''}
                onChangeText={v => update('address', v || null)}
              />
              <FloatingLabelInput
                label="áƒ¡áƒáƒ¥áƒ›áƒ˜áƒáƒœáƒáƒ‘áƒ˜áƒ¡ áƒ¡áƒáƒ®áƒ”"
                value={inspection.activityType ?? ''}
                onChangeText={v => update('activityType', v || null)}
              />

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>áƒ¨áƒ”áƒ›áƒáƒ¬áƒ›áƒ”áƒ‘áƒ˜áƒ¡ áƒ—áƒáƒ áƒ˜áƒ¦áƒ˜</Text>
                <DateTimeField
                  mode="date"
                  value={new Date(inspection.inspectionDate)}
                  onChange={d => update('inspectionDate', d.toLocaleDateString('en-CA'))}
                  maxDate={new Date()}
                />
              </View>

              <FloatingLabelInput
                label="áƒáƒ¥áƒ¢áƒ˜áƒ¡ â„–"
                value={inspection.actNumber ?? ''}
                onChangeText={v => update('actNumber', v || null)}
              />

              <Text style={styles.fieldLabel}>áƒ¨áƒ”áƒ›áƒáƒ¬áƒ›áƒ”áƒ‘áƒ˜áƒ¡ áƒ¡áƒáƒ®áƒ”</Text>
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
                label="áƒ¨áƒ”áƒ›áƒáƒ›áƒ¬áƒ›áƒ”áƒ‘áƒ”áƒšáƒ˜"
                value={inspection.inspectorName ?? ''}
                onChangeText={v => update('inspectorName', v || null)}
              />
            </KeyboardAwareScrollView>
          )}

          {/* â”€â”€ Step 1: Equipment list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === 1 && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <View style={styles.equipHeader}>
                <StepSectionLabel title="II â€” áƒáƒ¦áƒ­áƒ£áƒ áƒ•áƒ˜áƒšáƒáƒ‘áƒ˜áƒ¡ áƒ¡áƒ˜áƒ" />
                <View style={styles.progressPill}>
                  <Text style={styles.progressPillText}>
                    áƒ¨áƒ”áƒ•áƒ¡áƒ”áƒ‘áƒ£áƒšáƒ˜áƒ {filledCount} / {totalCount}
                  </Text>
                </View>
              </View>

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
                {...a11y('áƒáƒ¦áƒ­. áƒ“áƒáƒ›áƒáƒ¢áƒ”áƒ‘áƒ', '+ áƒáƒ¦áƒ­áƒ£áƒ áƒ•áƒ˜áƒšáƒáƒ‘áƒ˜áƒ¡ áƒ¡áƒ¢áƒ áƒ˜áƒ¥áƒáƒœáƒ˜áƒ¡ áƒ“áƒáƒ›áƒáƒ¢áƒ”áƒ‘áƒ', 'button')}
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.accent} />
                <Text style={styles.addRowText}>+ áƒáƒ¦áƒ­áƒ£áƒ áƒ•áƒ˜áƒšáƒáƒ‘áƒ˜áƒ¡ áƒ“áƒáƒ›áƒáƒ¢áƒ”áƒ‘áƒ</Text>
              </Pressable>

              {filledCount === 0 && (
                <View style={styles.emptyHint}>
                  <Ionicons name="information-circle-outline" size={18} color={theme.colors.inkFaint} />
                  <Text style={styles.emptyHintText}>
                    áƒ¨áƒ”áƒáƒ•áƒ¡áƒ”áƒ— áƒ›áƒ˜áƒœáƒ˜áƒ›áƒ£áƒ› áƒ”áƒ áƒ—áƒ˜ áƒáƒ¦áƒ­áƒ£áƒ áƒ•áƒ˜áƒšáƒáƒ‘áƒ˜áƒ¡ áƒ¡áƒ¢áƒ áƒ˜áƒ¥áƒáƒœáƒ˜
                  </Text>
                </View>
              )}
            </KeyboardAwareScrollView>
          )}

          {/* â”€â”€ Step 2: Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === 2 && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <StepSectionLabel title="III â€” áƒ¨áƒ”áƒ¯áƒáƒ›áƒ”áƒ‘áƒ" />

              <FloatingLabelInput
                label="áƒ“áƒáƒ¡áƒ™áƒ•áƒœáƒ *"
                value={inspection.conclusion ?? ''}
                onChangeText={v => update('conclusion', v || null)}
                multiline
                numberOfLines={4}
                required
              />

              <Text style={[styles.fieldLabel, { marginTop: 8 }]}>áƒ¤áƒáƒ¢áƒáƒ”áƒ‘áƒ˜ (áƒ¡áƒ£áƒ áƒ•.)</Text>

              <SummaryPhotoStrip
                paths={inspection.summaryPhotos}
                onAdd={handleAddSummaryPhoto}
                onDelete={handleDeleteSummaryPhoto}
                styles={styles}
              />
            </KeyboardAwareScrollView>
          )}

          {/* â”€â”€ Step 3: Signature â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === 3 && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <StepSectionLabel title="IV â€” áƒ®áƒ”áƒšáƒ›áƒáƒ¬áƒ”áƒ áƒ" />

              <FloatingLabelInput
                label="áƒ¡áƒáƒ®áƒ”áƒšáƒ˜ / áƒ’áƒ•áƒáƒ áƒ˜"
                value={inspection.signerName ?? ''}
                onChangeText={v => update('signerName', v || null)}
              />

              <Text style={styles.fieldLabel}>áƒ—áƒáƒœáƒáƒ›áƒ“áƒ”áƒ‘áƒáƒ‘áƒ</Text>
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
                  label="áƒ¡áƒ®áƒ•áƒ áƒ—áƒáƒœáƒáƒ›áƒ“áƒ”áƒ‘áƒáƒ‘áƒ"
                  value={inspection.signerRoleCustom ?? ''}
                  onChangeText={v => update('signerRoleCustom', v || null)}
                  autoFocus
                />
              )}

              <Pressable
                style={[styles.sigArea, inspection.inspectorSignature && styles.sigAreaSigned]}
                onPress={() => setShowSig(true)}
                {...a11y('áƒ®áƒ”áƒšáƒ›áƒáƒ¬áƒ”áƒ áƒ', 'áƒ¨áƒ”áƒ›áƒáƒ›áƒ¬áƒ›áƒ”áƒ‘áƒšáƒ˜áƒ¡ áƒ®áƒ”áƒšáƒ›áƒáƒ¬áƒ”áƒ áƒ˜áƒ¡ áƒ“áƒáƒ›áƒáƒ¢áƒ”áƒ‘áƒ', 'button')}
              >
                {inspection.inspectorSignature ? (
                  <View style={styles.sigContent}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.semantic.success} />
                    <Text style={[styles.sigHint, { color: theme.colors.semantic.success }]}>áƒ®áƒ”áƒšáƒ›áƒáƒ¬áƒ”áƒ áƒ áƒ“áƒáƒ§áƒ”áƒœáƒ”áƒ‘áƒ£áƒšáƒ˜áƒ</Text>
                    <Pressable
                      onPress={() => update('inspectorSignature', null)}
                      hitSlop={10}
                      {...a11y('áƒ®áƒ”áƒšáƒ›áƒáƒ¬áƒ”áƒ áƒ˜áƒ¡ áƒ¬áƒáƒ¨áƒšáƒ', undefined, 'button')}
                    >
                      <Text style={styles.sigClear}>áƒ’áƒáƒ¡áƒ£áƒ¤áƒ—áƒáƒ•áƒ”áƒ‘áƒ</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.sigContent}>
                    <Ionicons name="pencil-outline" size={20} color={theme.colors.accent} />
                    <Text style={styles.sigHint}>áƒ¨áƒ”áƒ”áƒ®áƒ”áƒ— áƒ®áƒ”áƒšáƒ›áƒáƒ¬áƒ”áƒ áƒ˜áƒ¡áƒ—áƒ•áƒ˜áƒ¡</Text>
                  </View>
                )}
              </Pressable>

              {!inspection.inspectorSignature && (
                <Text style={styles.sigRequiredHint}>
                  áƒ®áƒ”áƒšáƒ›áƒáƒ¬áƒ”áƒ áƒ áƒ¡áƒáƒ•áƒáƒšáƒ“áƒ”áƒ‘áƒ£áƒšáƒáƒ áƒ“áƒáƒ¡áƒáƒ¡áƒ áƒ£áƒšáƒ”áƒ‘áƒšáƒáƒ“
                </Text>
              )}

              {completing && (
                <View style={styles.completingRow}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                  <Text style={styles.completingText}>áƒ›áƒ˜áƒ›áƒ“áƒ˜áƒœáƒáƒ áƒ”áƒáƒ‘áƒ¡â€¦</Text>
                </View>
              )}
            </KeyboardAwareScrollView>
          )}

          {/* â”€â”€ Step 4: Done â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {step === 4 && (
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              bottomOffset={120}
            >
              <View style={styles.doneHero}>
                <Ionicons name="checkmark-circle" size={72} color={theme.colors.semantic.success} />
                <Text style={styles.doneTitle}>áƒ¨áƒ”áƒ›áƒáƒ¬áƒ›áƒ”áƒ‘áƒ áƒ“áƒáƒ¡áƒ áƒ£áƒšáƒ“áƒ!</Text>
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
                title="PDF áƒ’áƒ”áƒœáƒ”áƒ áƒ˜áƒ áƒ”áƒ‘áƒ / áƒ’áƒáƒ–áƒ˜áƒáƒ áƒ”áƒ‘áƒ"
                onPress={handlePdf}
                loading={generatingPdf}
                style={{ marginBottom: 12 }}
              />
              <Button
                title="áƒžáƒ áƒáƒ”áƒ¥áƒ¢áƒ–áƒ” áƒ“áƒáƒ‘áƒ áƒ£áƒœáƒ”áƒ‘áƒ"
                variant="secondary"
                onPress={() => router.back()}
              />
            </KeyboardAwareScrollView>
          )}
        </WizardStepTransition>

        {step < DONE_STEP && (
          <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
            {step === SIGNATURE_STEP ? (
              <Button
                title="áƒ¨áƒ”áƒœáƒáƒ®áƒ•áƒ áƒ“áƒ áƒ“áƒáƒ¡áƒ áƒ£áƒšáƒ”áƒ‘áƒ"
                style={{ paddingVertical: 14 }}
                iconRight={<Ionicons name="checkmark" size={20} color={theme.colors.white} />}
                loading={completing}
                disabled={completing}
                onPress={handleComplete}
              />
            ) : (
              <Button
                title={canGoNext ? 'áƒ¨áƒ”áƒ›áƒ“áƒ”áƒ’áƒ˜' : 'áƒ’áƒáƒ’áƒ áƒ«áƒ”áƒšáƒ”áƒ‘áƒ'}
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
        personName={inspection.signerName ?? 'áƒ¨áƒ”áƒ›áƒáƒ›áƒ¬áƒ›áƒ”áƒ‘áƒ”áƒšáƒ˜'}
        onCancel={() => setShowSig(false)}
        onConfirm={handleSignatureConfirm}
      />

      <ChecklistTour
        visible={showTour}
        onClose={() => {
          setShowTour(false);
          AsyncStorage.setItem(TOUR_SEEN_KEY, '1').catch(() => {});
        }}
      />
    </View>
  );
}

// â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        {...a11y('áƒ¤áƒáƒ¢áƒáƒ¡ áƒ“áƒáƒ›áƒáƒ¢áƒ”áƒ‘áƒ', 'áƒ¤áƒáƒ¢áƒáƒ¡ áƒ’áƒáƒ“áƒáƒ¦áƒ”áƒ‘áƒ áƒáƒœ áƒ‘áƒ˜áƒ‘áƒšáƒ˜áƒáƒ—áƒ”áƒ™áƒ˜áƒ“áƒáƒœ', 'button')}
      >
        <Ionicons name="camera-outline" size={20} color={theme.colors.inkSoft} />
        <Text style={styles.addPhotoLabel}>+ áƒ¤áƒáƒ¢áƒ</Text>
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
      <Pressable style={styles.thumbDelete} onPress={onDelete} hitSlop={8} {...a11y('áƒ¤áƒáƒ¢áƒáƒ¡ áƒ¬áƒáƒ¨áƒšáƒ', undefined, 'button')}>
        <Ionicons name="close-circle" size={18} color={theme.colors.white} />
      </Pressable>
    </View>
  );
});

// â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getstyles(theme: Theme) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: theme.colors.card },
    footer: {
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      backgroundColor: theme.colors.card,
    },
    centred: { alignItems: 'center', justifyContent: 'center' },
    savingHint: { fontSize: 11, color: theme.colors.inkFaint, textAlign: 'right', paddingHorizontal: 16, paddingTop: 4 },
    stepBody: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 12 },

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

    equipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
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
      padding: 12,
      borderRadius: 10,
      backgroundColor: theme.colors.warnSoft,
      borderWidth: 1,
      borderColor: theme.colors.warn,
      marginTop: 8,
    },
    emptyHintText: {
      fontSize: 13,
      color: theme.colors.inkSoft,
      flex: 1,
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
