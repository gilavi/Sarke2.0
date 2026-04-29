// Generate a PDF report from an existing completed inspection.
//
// Reached from the done screen or the inspection detail CTA. Lets the
// inspector review/pick qualification certs, manage participants
// (project crew — same widget as the project screen), and generate the PDF.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { loadPdfLanguage, savePdfLanguage, type PdfLanguage } from '../../lib/pdfLanguagePref';
import { A11yText as Text } from '../../components/primitives/A11yText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useBottomSheet } from '../../components/BottomSheet';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Screen } from '../../components/ui';
import { SkeletonCard, SkeletonListCard } from '../../components/Skeleton';
import { RoleSlotList, type InspectorRow } from '../../components/RoleSlotList';
import { useTheme } from '../../lib/theme';
import { useTranslation } from 'react-i18next';

import {
  answersApi,
  certificatesApi,
  inspectionsApi,
  projectsApi,
  qualificationsApi,
  signaturesApi,
  storageApi,
  templatesApi,
} from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  getStorageImageDataUrl,
  getStorageImageDataUrlStrict,
} from '../../lib/imageUrl';
import { flushPendingSignatures } from '../../lib/signatures';
import { buildPdfHtml } from '../../lib/pdf';
import { pickProjectLogo } from '../../lib/projectLogo';
import { useToast } from '../../lib/toast';
import { logError } from '../../lib/logError';
import { friendlyError } from '../../lib/errorMap';
import type {
  Answer,
  AnswerPhoto,
  CrewMember,
  Inspection,
  Project,
  Qualification,
  Question,
  SignatureRecord,
  SignerRole,
  Template,
} from '../../types/models';
import { a11y } from '../../lib/accessibility';

// ── Constants ────────────────────────────────────────────────────────────────

const STAGGER_MS = 50;

// `CrewMember.roleKey` values match `SignerRole` 1:1 since migration 0016
// added 'other' to the signer_role enum.
const crewRoleToSigner = (key: CrewMember['roleKey']): SignerRole => key;

// ── Screen ───────────────────────────────────────────────────────────────────

export default function GenerateCertificateScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const s = useMemo(() => gets(theme), [theme]);
  const urlParams = useLocalSearchParams<{ inspectionId?: string }>();
  const inspectionId = urlParams.inspectionId ?? null;
  const router = useRouter();
  const toast = useToast();
  const showActionSheetWithOptions = useBottomSheet();
  const session = useSession();
  const user = session.state.status === 'signedIn' ? session.state.user : null;

  // Core data
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [photosByAnswer, setPhotosByAnswer] = useState<Record<string, AnswerPhoto[]>>({});
  const [quals, setQuals] = useState<Qualification[]>([]);

  const [selectedQuals, setSelectedQuals] = useState<Record<string, string>>({});
  const [extraQualIds, setExtraQualIds] = useState<string[]>([]);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pdfPhase, setPdfPhase] = useState<string | null>(null);
  const [pdfLanguage, setPdfLanguage] = useState<PdfLanguage>('ka');

  const btnScale = useSharedValue(1);

  // ── PDF language persistence ────────────────────────────────────────────────
  useEffect(() => {
    void loadPdfLanguage().then(setPdfLanguage);
  }, []);

  const setPdfLang = async (lang: PdfLanguage) => {
    setPdfLanguage(lang);
    await savePdfLanguage(lang);
  };

  // ── Inspector row (locked top of RoleSlotList; never persisted to crew) ─────
  const inspector: InspectorRow | null = useMemo(() => {
    if (session.state.status !== 'signedIn') return null;
    const u = session.state.user;
    const fallback = session.state.session.user.email ?? 'ინსპექტორი';
    const name = u
      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || fallback
      : fallback;
    return { name, role: 'ინსპექტორი' };
  }, [session.state]);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!inspectionId) {
      toast.error(t('errors.inspectionNotSpecified'));
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const insp = await inspectionsApi.getById(inspectionId);
      if (!insp) {
        toast.error(t('errors.notFoundInspection'));
        setLoading(false);
        return;
      }
      setInspection(insp);
      const tpl = await templatesApi.getById(insp.template_id).catch((e) => { logError(e, 'certNew.template'); return null; });
      setTemplate(tpl);
      const [proj, qs, ans, qualsList] = await Promise.all([
        projectsApi.getById(insp.project_id).catch((e) => { logError(e, 'certNew.project'); return null; }),
        tpl ? templatesApi.questions(tpl.id).catch((e) => { logError(e, 'certNew.questions'); return [] as Question[]; }) : Promise.resolve([] as Question[]),
        answersApi.list(insp.id).catch((e) => { logError(e, 'certNew.answers'); return [] as Answer[]; }),
        qualificationsApi.list().catch((e) => { logError(e, 'certNew.qualifications'); return [] as Qualification[]; }),
      ]);
      setProject(proj);
      setQuestions(qs);
      setAnswers(ans);
      setQuals(qualsList);

      const initial: Record<string, string> = {};
      for (const tt of tpl?.required_qualifications ?? []) {
        const first = qualsList.find(q => q.type === tt);
        if (first) initial[tt] = first.id;
      }
      setSelectedQuals(initial);

      const photoMap = await answersApi
        .photosByAnswerIds(ans.map(a => a.id))
        .catch((e) => { logError(e, 'certNew.photos'); return {} as Record<string, AnswerPhoto[]>; });
      setPhotosByAnswer(photoMap);
    } finally {
      setLoading(false);
    }
  }, [inspectionId, toast, t]);

  useEffect(() => { void load(); }, [load]);

  // ── Crew persistence (same source of truth as projects/[id].tsx) ────────────
  const persistCrew = useCallback(
    async (next: CrewMember[]) => {
      if (!project) return;
      const prev = project;
      setProject({ ...project, crew: next });
      try {
        const saved = await projectsApi.update(project.id, { crew: next });
        setProject(saved);
      } catch (e) {
        setProject(prev);
        toast.error(friendlyError(e, t('projects.memberSaveError')));
      }
    },
    [project, toast, t],
  );

  // ── Derived ─────────────────────────────────────────────────────────────────

  // Dedupe — some templates have the same qualification listed twice in
  // `required_qualifications`, which would render two list rows sharing the
  // cert-type as React key and warn "Encountered two children with the same key".
  const requiredCertTypes = useMemo(
    () => Array.from(new Set(template?.required_qualifications ?? [])),
    [template?.required_qualifications],
  );

  const missingQualTypes = useMemo(
    () => requiredCertTypes.filter(tt => !selectedQuals[tt]),
    [requiredCertTypes, selectedQuals],
  );

  const usedQualIds = useMemo(() => {
    const ids = new Set(Object.values(selectedQuals));
    extraQualIds.forEach(id => ids.add(id));
    return ids;
  }, [selectedQuals, extraQualIds]);

  // ── Cert actions ─────────────────────────────────────────────────────────────

  const pickQual = (certType: string) => {
    const matches = quals.filter(q => q.type === certType);
    if (matches.length === 0) {
      Alert.alert(
        t('certificates.qualificationMissingTitle'),
        t('certificates.qualificationMissingDesc'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('certificates.uploadAction'), onPress: () => void uploadQual(certType) },
        ],
      );
      return;
    }
    const options = matches.map(m => `${m.type}${m.number ? ` · №${m.number}` : ''}`);
    options.push(t('common.cancel'));
    showActionSheetWithOptions(
      { title: certType, options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setSelectedQuals(prev => ({ ...prev, [certType]: matches[idx].id }));
      },
    );
  };

  const uploadQual = async (certType: string) => {
    if (!user) { toast.error(t('errors.authRequired')); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.error(t('errors.photoPermission')); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    setUploadingFor(certType);
    try {
      const asset = result.assets[0];
      const mime = asset.mimeType ?? 'image/jpeg';
      const ext = mime.split('/')[1] ?? 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      await storageApi.uploadFromUri(STORAGE_BUCKETS.certificates, path, asset.uri, mime);
      const qual = await qualificationsApi.upsert({
        id: crypto.randomUUID(),
        user_id: user.id,
        type: certType,
        number: null,
        issued_at: new Date().toISOString().slice(0, 10),
        expires_at: null,
        file_url: path,
      });
      setQuals(prev => [qual, ...prev.filter(q => q.id !== qual.id)]);
      setSelectedQuals(prev => ({ ...prev, [certType]: qual.id }));
      toast.success(t('certificates.uploaded'));
    } catch (e) {
      toast.error(friendlyError(e, t('errors.uploadFailed')));
    } finally {
      setUploadingFor(null);
    }
  };

  const addExtraQual = () => {
    const available = quals.filter(q => !usedQualIds.has(q.id));
    if (available.length === 0) {
      toast.info(t('certificates.noOtherQualifications'));
      return;
    }
    const options = available.map(q => `${q.type}${q.number ? ` · №${q.number}` : ''}`);
    options.push(t('common.cancel'));
    showActionSheetWithOptions(
      { title: t('certificates.additionalCerts'), options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setExtraQualIds(prev => [...prev, available[idx].id]);
      },
    );
  };

  const removeExtraQual = (id: string) => {
    setExtraQualIds(prev => prev.filter(x => x !== id));
  };

  // ── Generate ─────────────────────────────────────────────────────────────────

  const buildExpertRecord = async (): Promise<{ rec: SignatureRecord; expertName: string }> => {
    const expertName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ექსპერტი';
    if (!user?.saved_signature_url) {
      throw new Error('ექსპერტის ხელმოწერა საჭიროა — დაამატეთ "ჩემი ხელმოწერა" ეკრანიდან');
    }
    const expertDataUrl = await getStorageImageDataUrlStrict(
      STORAGE_BUCKETS.signatures,
      user.saved_signature_url,
    );
    const rec: SignatureRecord = {
      id: 'expert-auto',
      inspection_id: inspection!.id,
      signer_role: 'expert',
      full_name: expertName,
      phone: null,
      position: 'შრომის უსაფრთხოების სპეციალისტი',
      signature_png_url: expertDataUrl,
      signed_at: new Date().toISOString(),
      status: 'signed',
      person_name: expertName,
    };
    return { rec, expertName };
  };

  // Bridge each signed crew member from `project.crew` into the `signatures`
  // table for this inspection. The in-memory record carries a data URL for
  // PDF embedding; the DB row stores the storage path. The expert slot is
  // handled by buildExpertRecord/persistExpertSignature, so skip it here.
  const persistCrewSignatures = async (): Promise<SignatureRecord[]> => {
    const recs: SignatureRecord[] = [];
    const crew = project?.crew ?? [];

    const existingSigs = await signaturesApi.list(inspection!.id).catch(() => [] as SignatureRecord[]);
    const idForRole = (role: SignerRole): string => {
      const hit = existingSigs.find(x => x.signer_role === role);
      return hit?.id ?? crypto.randomUUID();
    };

    for (const member of crew) {
      if (member.roleKey === 'expert') continue;
      if (!member.signature || !member.name?.trim()) continue;

      let dataUrl: string;
      try {
        dataUrl = await getStorageImageDataUrl(STORAGE_BUCKETS.signatures, member.signature);
      } catch (e) {
        logError(e, 'certNew.crewSigLoad');
        continue;
      }

      const role = crewRoleToSigner(member.roleKey);
      const rowId = idForRole(role);
      const positionLabel = member.role || null;

      recs.push({
        id: rowId,
        inspection_id: inspection!.id,
        signer_role: role,
        full_name: member.name.trim(),
        phone: null,
        position: positionLabel,
        signature_png_url: dataUrl,
        signed_at: new Date().toISOString(),
        status: 'signed',
        person_name: member.name.trim(),
      });
      await signaturesApi.upsert({
        id: rowId,
        inspection_id: inspection!.id,
        signer_role: role,
        full_name: member.name.trim(),
        phone: null,
        position: positionLabel,
        signature_png_url: member.signature,
        status: 'signed',
        person_name: member.name.trim(),
      });
    }

    return recs;
  };

  const persistExpertSignature = async (expertName: string): Promise<void> => {
    await signaturesApi.upsert({
      id: crypto.randomUUID(),
      inspection_id: inspection!.id,
      signer_role: 'expert',
      full_name: expertName,
      phone: null,
      position: 'შრომის უსაფრთხოების სპეციალისტი',
      signature_png_url: user?.saved_signature_url ?? null,
      status: 'signed',
      person_name: expertName,
    });
  };

  const buildPdfAssets = async (): Promise<{
    photosForPdf: Record<string, AnswerPhoto[]>;
    attachedQuals: Array<Qualification & { file_data_url?: string }>;
    failedAssetCount: number;
  }> => {
    let failedAssetCount = 0;
    const photosForPdf: Record<string, AnswerPhoto[]> = {};
    await Promise.all(
      Object.entries(photosByAnswer).map(async ([answerId, photos]) => {
        photosForPdf[answerId] = await Promise.all(
          photos.map(async p => {
            try {
              const dataUrl = await getStorageImageDataUrlStrict(
                STORAGE_BUCKETS.answerPhotos,
                p.storage_path,
              );
              return { ...p, storage_path: dataUrl };
            } catch (err) {
              failedAssetCount += 1;
              logError(err, `certificates.embedPhoto:${p.storage_path}`);
              return { ...p, storage_path: '' };
            }
          }),
        );
      }),
    );
    const allQualIds = [
      ...requiredCertTypes.map(tt => selectedQuals[tt]).filter(Boolean),
      ...extraQualIds,
    ];
    const attachedQuals: Array<Qualification & { file_data_url?: string }> = [];
    for (const id of allQualIds) {
      const qual = quals.find(q => q.id === id);
      if (!qual) continue;
      let fileDataUrl: string | undefined;
      if (qual.file_url) {
        try {
          fileDataUrl = await getStorageImageDataUrlStrict(
            STORAGE_BUCKETS.certificates,
            qual.file_url,
          );
        } catch (err) {
          failedAssetCount += 1;
          logError(err, `certificates.embedQual:${qual.file_url}`);
          fileDataUrl = undefined;
        }
      }
      attachedQuals.push({ ...qual, file_data_url: fileDataUrl });
    }
    return { photosForPdf, attachedQuals, failedAssetCount };
  };

  const generate = async () => {
    if (!inspection || !template || !project) return;
    if (missingQualTypes.length > 0) {
      Alert.alert(
        t('errors.missingQualification'),
        t('errors.missingQualificationDesc', { types: missingQualTypes.join(', ') }),
      );
      return;
    }
    let projectForPdf = project;
    if (!project.logo) {
      const proceed = await new Promise<'add' | 'skip' | 'cancel'>(resolve => {
        Alert.alert(
          t('certificates.addLogoTitle'),
          t('certificates.addLogoBody'),
          [
            { text: t('common.cancel'), style: 'cancel', onPress: () => resolve('cancel') },
            { text: t('common.skip'), onPress: () => resolve('skip') },
            { text: t('certificates.addLogoAdd'), onPress: () => resolve('add') },
          ],
          { cancelable: true, onDismiss: () => resolve('cancel') },
        );
      });
      if (proceed === 'cancel') return;
      if (proceed === 'add') {
        const logo = await pickProjectLogo();
        if (logo) {
          try {
            const saved = await projectsApi.update(project.id, { logo });
            setProject(saved);
            projectForPdf = saved;
          } catch (e) {
            logError(e, 'certNew.saveLogo');
            toast.error(t('certificates.logoSaveFailed'));
          }
        }
      }
    }
    if (!user?.saved_signature_url) {
      Alert.alert(
        t('errors.signatureRequired'),
        t('errors.signatureRequiredDesc'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('certificates.drawAction'), onPress: () => router.push('/signature' as any) },
        ],
      );
      return;
    }
    setBusy(true);
    setPdfPhase('მზადდება...');
    let uploadedPdfPath: string | null = null;
    try {
      await flushPendingSignatures();
      const { rec: expertRec, expertName } = await buildExpertRecord();
      const otherRecs = await persistCrewSignatures();
      await persistExpertSignature(expertName);
      const sigsForPdf = [expertRec, ...otherRecs];

      setPdfPhase('ფოტოები ემატება...');
      const { photosForPdf, attachedQuals, failedAssetCount } = await buildPdfAssets();

      setPdfPhase('მზადდება PDF...');
      const html = await buildPdfHtml({
        questionnaire: inspection,
        template,
        project: projectForPdf,
        questions,
        answers,
        signatures: sigsForPdf,
        photosByAnswer: photosForPdf,
        certificates: attachedQuals,
        language: pdfLanguage,
      });

      if (Platform.OS === 'web') {
        // expo-print unavailable on web; open the HTML blob in a new tab
        // so the user can review / print-to-PDF from the browser.
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setPdfPhase('დასრულდა ✓');
        toast.success(t('certificates.generateSuccess'));
        if (failedAssetCount > 0) {
          toast.error(t('certificates.assetsMissing', { count: failedAssetCount }));
        }
        router.replace(`/inspections/${inspection.id}` as any);
        return;
      }

      const { uri } = await Print.printToFileAsync({ html });

      const fileName = `${inspection.id}-${Date.now()}.pdf`;
      const blob = await (await fetch(uri)).blob();
      await storageApi.upload(STORAGE_BUCKETS.pdfs, fileName, blob, 'application/pdf');
      uploadedPdfPath = fileName;

      try {
        await certificatesApi.create({
          inspectionId: inspection.id,
          templateId: inspection.template_id,
          pdfUrl: fileName,
          isSafeForUse: inspection.is_safe_for_use,
          conclusionText: inspection.conclusion_text,
          params: {
            expertName,
            qualTypes: attachedQuals.map(q => ({ type: q.type, number: q.number ?? null })),
            signerNames: otherRecs.map(rec => rec.full_name),
          },
        });
      } catch (createErr) {
        // Roll back the orphaned PDF blob before surfacing the error.
        await storageApi.remove(STORAGE_BUCKETS.pdfs, fileName).catch(rmErr => {
          logError(rmErr, 'certNew.rollbackPdf');
        });
        throw createErr;
      }
      uploadedPdfPath = null;

      setPdfPhase('დასრულდა ✓');
      toast.success(t('certificates.generateSuccess'));
      if (failedAssetCount > 0) {
        toast.error(t('certificates.assetsMissing', { count: failedAssetCount }));
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
      router.replace(`/inspections/${inspection.id}` as any);
    } catch (e) {
      if (uploadedPdfPath) {
        await storageApi.remove(STORAGE_BUCKETS.pdfs, uploadedPdfPath).catch(rmErr => {
          logError(rmErr, 'certNew.rollbackPdf');
        });
      }
      toast.error(friendlyError(e, t('errors.generationFailed')));
    } finally {
      setBusy(false);
      setPdfPhase(null);
    }
  };

  const onGeneratePressIn = () => {
    btnScale.value = withTiming(0.98, { duration: 80 });
  };
  const onGeneratePressOut = () => {
    btnScale.value = withSpring(1, { stiffness: 300, damping: 15 });
  };
  const btnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const previewPdf = () => {
    if (!inspection) return;
    router.push(`/inspections/${inspection.id}?tab=preview` as any);
  };

  // Compact KA/EN segmented chip rendered inside the screen header.
  const LangChip = (
    <View style={s.langChip}>
      <Pressable
        onPress={() => setPdfLang('ka')}
        style={[s.langChipOpt, pdfLanguage === 'ka' && s.langChipOptActive]}
        {...a11y('PDF ენა — ქართული', 'PDF-ის ენის შეცვლა', 'button')}
      >
        <Text style={[s.langChipText, pdfLanguage === 'ka' && s.langChipTextActive]}>KA</Text>
      </Pressable>
      <Pressable
        onPress={() => setPdfLang('en')}
        style={[s.langChipOpt, pdfLanguage === 'en' && s.langChipOptActive]}
        {...a11y('PDF language — English', 'Change PDF language', 'button')}
      >
        <Text style={[s.langChipText, pdfLanguage === 'en' && s.langChipTextActive]}>EN</Text>
      </Pressable>
    </View>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={s.headerBack} {...a11y('ინსპექცია — დაბრუნება', 'გადავა ინსპექციის ეკრანზე', 'button')}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.accent} />
            </Pressable>
            <Text style={s.headerTitle}>PDF რეპორტის გენერაცია</Text>
            <View style={s.headerBack} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonListCard rows={2} />
            <SkeletonListCard rows={2} />
          </ScrollView>
        </SafeAreaView>
      </Screen>
    );
  }

  if (!inspection || !template) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>
            ინსპექცია ვერ მოიძებნა. სცადეთ ხელახლა.
          </Text>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.headerBack} {...a11y('ინსპექცია — დაბრუნება', 'გადავა ინსპექციის ეკრანზე', 'button')}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.ink} />
          </Pressable>
          <Text style={s.headerTitle} numberOfLines={1}>PDF რეპორტის გენერაცია</Text>
          {LangChip}
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Inspection Hero */}
          <Animated.View entering={FadeInUp.duration(300).delay(0 * STAGGER_MS)} style={[s.heroBlock, s.card]}>
            <View style={s.heroIconRow}>
              <View style={s.heroIconCircle}>
                <Ionicons name="document-text-outline" size={22} color={theme.colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroLabel}>ინსპექცია</Text>
                <Text style={s.heroTitle}>{template.name}</Text>
              </View>
            </View>
            <View style={s.heroMetaRow}>
              <Ionicons name="calendar-outline" size={13} color={theme.colors.inkSoft} />
              <Text style={s.heroDate}>{new Date(inspection.completed_at ?? inspection.created_at).toLocaleString('ka')}</Text>
            </View>
            {project ? (
              <View style={s.heroMetaRow}>
                <Ionicons name="location-outline" size={13} color={theme.colors.inkSoft} />
                <Text style={s.heroObject}>{project.name}</Text>
              </View>
            ) : null}
          </Animated.View>

          {/* Participants — same widget as the project detail page */}
          <Animated.View entering={FadeInUp.duration(300).delay(1 * STAGGER_MS)} style={[s.section, s.card]}>
            <Text style={s.sectionLabel}>მონაწილეები</Text>
            {project ? (
              <RoleSlotList
                projectId={project.id}
                inspector={inspector}
                crew={project.crew ?? []}
                onChange={persistCrew}
              />
            ) : null}
          </Animated.View>

          {/* Required Qualifications */}
          {requiredCertTypes.length > 0 && (
            <Animated.View entering={FadeInUp.duration(300).delay(2 * STAGGER_MS)} style={[s.section, s.card]}>
              <Text style={s.sectionLabel}>კვალიფიკაციის სერტიფიკატები</Text>
              <View style={{ gap: 8 }}>
                {requiredCertTypes.map(certType => {
                  const selectedId = selectedQuals[certType];
                  const selected = selectedId ? quals.find(q => q.id === selectedId) : null;
                  const hasAny = quals.some(q => q.type === certType);
                  return (
                    <Pressable key={certType} onPress={() => pickQual(certType)} style={s.listRow} {...a11y(certType, 'სერტიფიკატის არჩევა', 'button')}>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'alert-circle'}
                        size={18}
                        color={selected ? theme.colors.accent : theme.colors.warn}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={s.listRowTitle}>{certType}</Text>
                        <Text style={s.listRowMeta}>
                          {selected
                            ? (selected.number ? `№ ${selected.number}` : 'ატვირთულია')
                            : 'არ არის არჩეული'}
                        </Text>
                      </View>
                      <Text style={s.textLink}>{hasAny ? 'შეცვლა' : 'არჩევა'}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {requiredCertTypes.some(tt => !selectedQuals[tt]) && (
                <Text style={{ fontSize: 12, color: theme.colors.warn, marginTop: 8 }}>
                  არჩიე ყველა საჭირო სერტიფიკატი
                </Text>
              )}
            </Animated.View>
          )}

          {/* Extra Qualifications */}
          <Animated.View entering={FadeInUp.duration(300).delay(3 * STAGGER_MS)} style={[s.section, s.card]}>
            <Text style={s.sectionLabel}>დამატებითი სერტიფიკატები</Text>
            {extraQualIds.length === 0 ? (
              <Text style={s.emptyHint}>სურვილის შემთხვევაში — დაამატეთ სხვა კვალიფიკაციის სერტიფიკატი</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {extraQualIds.map(id => {
                  const q = quals.find(x => x.id === id);
                  if (!q) return null;
                  return (
                    <Pressable key={id} onPress={() => removeExtraQual(id)} style={s.listRow} {...a11y(`${q.type}${q.number ? ` · №${q.number}` : ''}`, 'დამატებითი სერტიფიკატის წაშლა', 'button')}>
                      <Ionicons name="ribbon-outline" size={16} color={theme.colors.accent} />
                      <Text style={s.listRowTitle}>{q.type}{q.number ? ` · №${q.number}` : ''}</Text>
                      <Text style={s.textLink}>წაშლა</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <Pressable onPress={addExtraQual} style={s.ghostBtn} {...a11y('დამატებითი სერტიფიკატი', 'დამატებითი სერტიფიკატის დამატება', 'button')}>
              <Text style={s.ghostBtnText}>+ დამატება</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={s.bottomBar}>
          <Animated.View style={[{ flex: 1 }, btnAnimatedStyle]}>
            <Pressable
              onPress={previewPdf}
              onPressIn={onGeneratePressIn}
              onPressOut={onGeneratePressOut}
              disabled={busy}
              style={s.previewBtn}
              {...a11y('პრევიუ', 'PDF-ის პრევიუ', 'button')}
            >
              <Ionicons name="eye-outline" size={18} color={theme.colors.ink} />
              <Text style={s.previewBtnText}>პრევიუ</Text>
            </Pressable>
          </Animated.View>
          <Animated.View style={[{ flex: 2.2 }, btnAnimatedStyle]}>
            <Pressable
              onPress={generate}
              onPressIn={onGeneratePressIn}
              onPressOut={onGeneratePressOut}
              disabled={busy || missingQualTypes.length > 0}
              style={[
                s.generateBtn,
                (busy || missingQualTypes.length > 0) && { opacity: 0.5 },
              ]}
              {...a11y('PDF-ის გენერირება', 'რეპორტის გენერაცია და გაზიარება', 'button')}
            >
              <Text style={s.generateBtnText}>{busy && pdfPhase ? pdfPhase : 'PDF-ის გენერირება'}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Screen>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

function gets(theme: any) {
  return StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 8,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
    textAlign: 'center',
  },

  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  heroBlock: {
    marginTop: 4,
  },
  heroIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 11,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.ink,
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  heroDate: {
    fontSize: 13,
    color: theme.colors.inkSoft,
  },
  heroObject: {
    fontSize: 13,
    color: theme.colors.neutral[700],
  },

  section: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: theme.colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyHint: {
    fontSize: 13,
    color: theme.colors.inkSoft,
    marginBottom: 10,
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  listRowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  listRowMeta: {
    fontSize: 12,
    color: theme.colors.inkSoft,
    marginTop: 1,
  },

  ghostBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
  },

  // Compact PDF language chip (header)
  langChip: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 2,
    gap: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  langChipOpt: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  langChipOptActive: {
    backgroundColor: theme.colors.accent,
  },
  langChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.inkSoft,
    letterSpacing: 0.4,
  },
  langChipTextActive: {
    color: theme.colors.white,
  },

  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    padding: 4,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  previewBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  previewBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  generateBtn: {
    flex: 2.2,
    height: 50,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.white,
  },

  textLink: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.accent,
  },
});
}
