// Generate a PDF report from an existing completed inspection.
//
// Reached from the done screen or the inspection detail CTA.
// Lets the inspector review/pick qualification certs, add extra certs,
// confirm their own signature, and optionally collect other signers —
// all before generating the PDF.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import { Button, Screen } from '../../components/ui';
import { SkeletonCard, SkeletonListCard } from '../../components/Skeleton';
import { SignatureCanvas } from '../../components/SignatureCanvas';
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
import { dataUrlToArrayBuffer } from '../../lib/blob';
import { flushPendingSignatures } from '../../lib/signatures';
import { buildPdfHtml } from '../../lib/pdf';
import { useToast } from '../../lib/toast';
import { logError, toErrorMessage } from '../../lib/logError';
import type {
  Answer,
  AnswerPhoto,
  Inspection,
  Project,
  ProjectSigner,
  Qualification,
  Question,
  SignatureRecord,
  SignerRole,
  Template,
} from '../../types/models';
import { SIGNER_ROLE_LABEL } from '../../types/models';

// ── Types ────────────────────────────────────────────────────────────────────

const OTHER_SIGNER_ROLES: SignerRole[] = ['xaracho_supervisor', 'xaracho_assembler'];

interface AdditionalSigner {
  id: string;
  name: string;
  role: SignerRole;
  dataUrl: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#F2F2F7',
  surface: '#FFFFFF',
  primary: '#147A4F',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#3C3C43',
  hairline: '#E5E5EA',
  danger: '#FF3B30',
  warn: '#FF9500',
  white: '#FFFFFF',
};

const STAGGER_MS = 50;

// ── Screen ───────────────────────────────────────────────────────────────────

export default function GenerateCertificateScreen() {
  const urlParams = useLocalSearchParams<{ inspectionId?: string }>();
  const inspectionId = urlParams.inspectionId ?? null;
  const router = useRouter();
  const toast = useToast();
  const showActionSheetWithOptions = useBottomSheet();
  const { state } = useSession();
  const user = state.status === 'signedIn' ? state.user : null;

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
  const [additionalSigners, setAdditionalSigners] = useState<AdditionalSigner[]>([]);
  const [projectSigners, setProjectSigners] = useState<ProjectSigner[]>([]);
  const [selectedRosterIds, setSelectedRosterIds] = useState<Set<string>>(new Set());
  const [rosterDataUrls, setRosterDataUrls] = useState<Record<string, string>>({});
  const [captureRosterId, setCaptureRosterId] = useState<string | null>(null);
  const [expertSigDisplayUrl, setExpertSigDisplayUrl] = useState<string | null>(null);
  const [captureSignerId, setCaptureSignerId] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const btnScale = useSharedValue(1);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!inspectionId) {
      toast.error('ინსპექცია არ არის მითითებული');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const insp = await inspectionsApi.getById(inspectionId);
      if (!insp) {
        toast.error('ინსპექცია ვერ მოიძებნა');
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

      const roster = await projectsApi
        .signers(insp.project_id)
        .catch((e) => { logError(e, 'certNew.projectSigners'); return [] as ProjectSigner[]; });
      setProjectSigners(roster);

      const initial: Record<string, string> = {};
      for (const t of tpl?.required_qualifications ?? []) {
        const first = qualsList.find(q => q.type === t);
        if (first) initial[t] = first.id;
      }
      setSelectedQuals(initial);

      const photoMap: Record<string, AnswerPhoto[]> = {};
      await Promise.all(
        ans.map(async a => {
          const ps = await answersApi.photos(a.id).catch((e) => { logError(e, 'certNew.photos'); return [] as AnswerPhoto[]; });
          if (ps.length > 0) photoMap[a.id] = ps;
        }),
      );
      setPhotosByAnswer(photoMap);
    } finally {
      setLoading(false);
    }
  }, [inspectionId, toast]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.saved_signature_url) { setExpertSigDisplayUrl(null); return; }
    getStorageImageDataUrl(STORAGE_BUCKETS.signatures, user.saved_signature_url)
      .then(url => { if (!cancelled) setExpertSigDisplayUrl(url); })
      .catch((e) => logError(e, 'certNew.expertSigUrl'));
    return () => { cancelled = true; };
  }, [user?.saved_signature_url]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const requiredCertTypes = template?.required_qualifications ?? [];

  const missingQualTypes = useMemo(
    () => requiredCertTypes.filter(t => !selectedQuals[t]),
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
        'კვალიფიკაცია არ არის',
        'ატვირთე სერტიფიკატი ან ახლავე ატვირთე ახალი.',
        [
          { text: 'გაუქმება', style: 'cancel' },
          { text: 'ატვირთვა', onPress: () => void uploadQual(certType) },
        ],
      );
      return;
    }
    const options = matches.map(m => `${m.type}${m.number ? ` · №${m.number}` : ''}`);
    options.push('გაუქმება');
    showActionSheetWithOptions(
      { title: certType, options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setSelectedQuals(prev => ({ ...prev, [certType]: matches[idx].id }));
      },
    );
  };

  const uploadQual = async (certType: string) => {
    if (!user) { toast.error('ავტორიზაცია საჭიროა'); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.error('ფოტოზე წვდომა არ არის'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    setUploadingFor(certType);
    try {
      const asset = result.assets[0];
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const ext = asset.mimeType?.split('/')[1] ?? 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      await storageApi.upload(STORAGE_BUCKETS.certificates, path, blob, asset.mimeType ?? 'image/jpeg');
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
      toast.success('სერტიფიკატი აიტვირთა');
    } catch (e) {
      toast.error(toErrorMessage(e, 'ატვირთვა ვერ მოხერხდა'));
    } finally {
      setUploadingFor(null);
    }
  };

  const addExtraQual = () => {
    const available = quals.filter(q => !usedQualIds.has(q.id));
    if (available.length === 0) {
      toast.info('სხვა კვალიფიკაცია არ არის');
      return;
    }
    const options = available.map(q => `${q.type}${q.number ? ` · №${q.number}` : ''}`);
    options.push('გაუქმება');
    showActionSheetWithOptions(
      { title: 'დამატებითი სერტიფიკატი', options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        setExtraQualIds(prev => [...prev, available[idx].id]);
      },
    );
  };

  const removeExtraQual = (id: string) => {
    setExtraQualIds(prev => prev.filter(x => x !== id));
  };

  // ── Signer actions ──────────────────────────────────────────────────────────

  const addSigner = () => {
    const newSigner: AdditionalSigner = {
      id: crypto.randomUUID(),
      name: '',
      role: 'xaracho_supervisor',
      dataUrl: null,
    };
    setAdditionalSigners(prev => [...prev, newSigner]);
  };

  const updateSignerName = (id: string, name: string) => {
    setAdditionalSigners(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const pickSignerRole = (signerId: string) => {
    const options = [...OTHER_SIGNER_ROLES.map(r => SIGNER_ROLE_LABEL[r]), 'გაუქმება'];
    showActionSheetWithOptions(
      { title: 'როლი', options, cancelButtonIndex: options.length - 1 },
      idx => {
        if (idx == null || idx === options.length - 1) return;
        const role = OTHER_SIGNER_ROLES[idx];
        setAdditionalSigners(prev => prev.map(s => s.id === signerId ? { ...s, role } : s));
      },
    );
  };

  const removeSigner = (id: string) => {
    setAdditionalSigners(prev => prev.filter(s => s.id !== id));
  };

  const onSignatureCaptured = (base64: string) => {
    const dataUrl = `data:image/png;base64,${base64}`;
    if (captureRosterId) {
      setRosterDataUrls(prev => ({ ...prev, [captureRosterId]: dataUrl }));
      setSelectedRosterIds(prev => new Set(prev).add(captureRosterId));
      setCaptureRosterId(null);
      return;
    }
    if (!captureSignerId) return;
    setAdditionalSigners(prev =>
      prev.map(s =>
        s.id === captureSignerId
          ? { ...s, dataUrl }
          : s,
      ),
    );
    setCaptureSignerId(null);
  };

  const toggleRosterSigner = async (signer: ProjectSigner) => {
    const isSelected = selectedRosterIds.has(signer.id);
    if (isSelected) {
      setSelectedRosterIds(prev => {
        const next = new Set(prev);
        next.delete(signer.id);
        return next;
      });
      return;
    }
    if (signer.signature_png_url) {
      if (!rosterDataUrls[signer.id]) {
        try {
          const url = await getStorageImageDataUrl(STORAGE_BUCKETS.signatures, signer.signature_png_url);
          setRosterDataUrls(prev => ({ ...prev, [signer.id]: url }));
        } catch (e) {
          logError(e, 'certNew.rosterSigLoad');
          toast.error('ხელმოწერის ჩატვირთვა ვერ მოხერხდა');
          return;
        }
      }
      setSelectedRosterIds(prev => new Set(prev).add(signer.id));
      return;
    }
    setCaptureRosterId(signer.id);
  };

  // ── Generate ─────────────────────────────────────────────────────────────────

  const buildExpertRecord = async (): Promise<{ rec: SignatureRecord; expertName: string }> => {
    const expertName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ექსპერტი';
    if (!user?.saved_signature_url) {
      throw new Error('ექსპერტის ხელმოწერა საჭიროა — დაამატე "ჩემი ხელმოწერა" ეკრანიდან');
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

  const persistAdditionalSigners = async (): Promise<SignatureRecord[]> => {
    const recs: SignatureRecord[] = [];

    // Ad-hoc signers: only persist when both a name AND a signature are present.
    for (const s of additionalSigners.filter(x => x.name?.trim() && x.dataUrl)) {
      const body = dataUrlToArrayBuffer(s.dataUrl!);
      const path = `${inspection!.id}/${s.id}-${Date.now()}.png`;
      await storageApi.upload(STORAGE_BUCKETS.signatures, path, body, 'image/png');
      recs.push({
        id: s.id,
        inspection_id: inspection!.id,
        signer_role: s.role,
        full_name: s.name.trim(),
        phone: null,
        position: null,
        signature_png_url: s.dataUrl,
        signed_at: new Date().toISOString(),
        status: 'signed',
        person_name: s.name.trim(),
      });
      await signaturesApi.upsert({
        id: s.id,
        inspection_id: inspection!.id,
        signer_role: s.role,
        full_name: s.name.trim(),
        phone: null,
        position: null,
        signature_png_url: path,
        status: 'signed',
        person_name: s.name.trim(),
      });
      // Save into the project roster so it's reusable next time.
      await projectsApi.saveRosterSignature({
        project_id: inspection!.project_id,
        role: s.role,
        full_name: s.name.trim(),
        signature_png_url: path,
      }).catch((e) => logError(e, 'certNew.rosterUpsertAdhoc'));
    }

    // Roster signers: include each selected signer with a loaded data URL.
    for (const signer of projectSigners.filter(p => selectedRosterIds.has(p.id))) {
      const dataUrl = rosterDataUrls[signer.id];
      if (!dataUrl) continue;
      let storagePath = signer.signature_png_url;
      // Newly captured (no stored path yet) — upload + persist back to roster.
      if (!storagePath) {
        const body = dataUrlToArrayBuffer(dataUrl);
        const path = `${inspection!.project_id}/roster-${signer.id}-${Date.now()}.png`;
        await storageApi.upload(STORAGE_BUCKETS.signatures, path, body, 'image/png');
        storagePath = path;
        await projectsApi.saveRosterSignature({
          project_id: inspection!.project_id,
          role: signer.role,
          full_name: signer.full_name,
          phone: signer.phone,
          position: signer.position,
          signature_png_url: path,
        }).catch((e) => logError(e, 'certNew.rosterUpsertRoster'));
      }
      recs.push({
        id: signer.id,
        inspection_id: inspection!.id,
        signer_role: signer.role,
        full_name: signer.full_name,
        phone: signer.phone,
        position: signer.position,
        signature_png_url: dataUrl,
        signed_at: new Date().toISOString(),
        status: 'signed',
        person_name: signer.full_name,
      });
      await signaturesApi.upsert({
        id: signer.id,
        inspection_id: inspection!.id,
        signer_role: signer.role,
        full_name: signer.full_name,
        phone: signer.phone,
        position: signer.position,
        signature_png_url: storagePath,
        status: 'signed',
        person_name: signer.full_name,
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
  }> => {
    const photosForPdf: Record<string, AnswerPhoto[]> = {};
    await Promise.all(
      Object.entries(photosByAnswer).map(async ([answerId, photos]) => {
        photosForPdf[answerId] = await Promise.all(
          photos.map(async p => ({
            ...p,
            storage_path: await getStorageImageDataUrl(STORAGE_BUCKETS.answerPhotos, p.storage_path),
          })),
        );
      }),
    );
    const allQualIds = [
      ...requiredCertTypes.map(t => selectedQuals[t]).filter(Boolean),
      ...extraQualIds,
    ];
    const attachedQuals: Array<Qualification & { file_data_url?: string }> = [];
    for (const id of allQualIds) {
      const qual = quals.find(q => q.id === id);
      if (!qual) continue;
      let fileDataUrl: string | undefined;
      if (qual.file_url) {
        fileDataUrl = await getStorageImageDataUrl(STORAGE_BUCKETS.certificates, qual.file_url);
      }
      attachedQuals.push({ ...qual, file_data_url: fileDataUrl });
    }
    return { photosForPdf, attachedQuals };
  };

  const generate = async () => {
    if (!inspection || !template || !project) return;
    if (missingQualTypes.length > 0) {
      Alert.alert('აკლია კვალიფიკაცია', `მიუთითე: ${missingQualTypes.join(', ')}`);
      return;
    }
    if (!user?.saved_signature_url) {
      Alert.alert(
        'ხელმოწერა საჭიროა',
        'PDF-ის დასაგენერირებლად საჭიროა ექსპერტის ხელმოწერა.',
        [
          { text: 'გაუქმება', style: 'cancel' },
          { text: 'დახაზვა', onPress: () => router.push('/signature' as any) },
        ],
      );
      return;
    }
    setBusy(true);
    let uploadedPdfPath: string | null = null;
    try {
      // Retry any signature uploads that were queued offline before we try
      // to embed them into the PDF.
      await flushPendingSignatures();
      const { rec: expertRec, expertName } = await buildExpertRecord();
      const otherRecs = await persistAdditionalSigners();
      await persistExpertSignature(expertName);
      const sigsForPdf = [expertRec, ...otherRecs];

      const { photosForPdf, attachedQuals } = await buildPdfAssets();

      const html = buildPdfHtml({
        questionnaire: inspection,
        template,
        project,
        questions,
        answers,
        signatures: sigsForPdf,
        photosByAnswer: photosForPdf,
        certificates: attachedQuals,
      });
      const { uri } = await Print.printToFileAsync({ html });

      const fileName = `${inspection.id}-${Date.now()}.pdf`;
      const blob = await (await fetch(uri)).blob();
      await storageApi.upload(STORAGE_BUCKETS.pdfs, fileName, blob, 'application/pdf');
      uploadedPdfPath = fileName;

      await certificatesApi.create({
        inspectionId: inspection.id,
        templateId: inspection.template_id,
        pdfUrl: fileName,
        isSafeForUse: inspection.is_safe_for_use,
        conclusionText: inspection.conclusion_text,
        params: {
          expertName,
          qualTypes: attachedQuals.map(q => ({ type: q.type, number: q.number ?? null })),
          signerNames: otherRecs.map(s => s.full_name),
          localUri: uri,
        },
      });
      uploadedPdfPath = null;

      toast.success('PDF რეპორტი შეიქმნა');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
      router.replace(`/inspections/${inspection.id}` as any);
    } catch (e) {
      if (uploadedPdfPath) {
        await storageApi.remove(STORAGE_BUCKETS.pdfs, uploadedPdfPath);
      }
      toast.error(toErrorMessage(e, 'გენერაცია ვერ მოხერხდა'));
    } finally {
      setBusy(false);
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

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <View style={s.header}>
            <Pressable onPress={() => router.back()} style={s.headerBack}>
              <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
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
          <Text style={{ color: COLORS.textSecondary, textAlign: 'center' }}>
            ინსპექცია ვერ მოიძებნა. სცადე ხელახლა.
          </Text>
        </SafeAreaView>
      </Screen>
    );
  }

  const captureSigner = additionalSigners.find(s => s.id === captureSignerId);
  const captureRosterSigner = projectSigners.find(p => p.id === captureRosterId);
  const capturePersonName = captureRosterSigner?.full_name ?? captureSigner?.name ?? '';
  const captureVisible = captureSignerId !== null || captureRosterId !== null;
  const expertName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ექსპერტი';
  const expertInitials = expertName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.headerBack}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={s.headerTitle}>PDF რეპორტის გენერაცია</Text>
          <View style={s.headerBack} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {/* Inspection Hero */}
          <Animated.View entering={FadeInUp.duration(300).delay(0 * STAGGER_MS)} style={s.heroBlock}>
            <Text style={s.heroLabel}>ინსპექცია</Text>
            <Text style={s.heroTitle}>{template.name}</Text>
            <Text style={s.heroDate}>
              {new Date(inspection.completed_at ?? inspection.created_at).toLocaleString('ka')}
            </Text>
            {project ? <Text style={s.heroObject}>{project.name}</Text> : null}
          </Animated.View>

          <View style={s.divider} />

          {/* Chief Inspector */}
          <Animated.View entering={FadeInUp.duration(300).delay(1 * STAGGER_MS)} style={s.section}>
            <Text style={s.sectionLabel}>ჩივი ხელმძღვანელი</Text>
            <View style={s.expertRow}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarText}>{expertInitials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.expertName}>{expertName}</Text>
                <Text style={s.expertRole}>შრომის უსაფრთხოების სპეციალისტი</Text>
              </View>
              {user?.saved_signature_url ? (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
              ) : (
                <Pressable onPress={() => router.push('/signature' as any)}>
                  <Text style={s.textLink}>დახაზვა</Text>
                </Pressable>
              )}
            </View>

            {expertSigDisplayUrl ? (
              <Animated.View entering={FadeInUp.duration(250)} style={s.sigPreviewWrap}>
                <Image source={{ uri: expertSigDisplayUrl }} style={s.sigPreview} resizeMode="contain" />
                <Pressable onPress={() => router.push('/signature' as any)}>
                  <Text style={s.textLink}>შეცვლა</Text>
                </Pressable>
              </Animated.View>
            ) : (
              <Pressable onPress={() => router.push('/signature' as any)} style={s.sigPlaceholder}>
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                <Text style={s.sigPlaceholderText}>ხელმოწერა</Text>
              </Pressable>
            )}
          </Animated.View>

          <View style={s.divider} />

          {/* Other Signers */}
          <Animated.View entering={FadeInUp.duration(300).delay(2 * STAGGER_MS)} style={s.section}>
            <Text style={s.sectionLabel}>სხვა ხელმომწერები</Text>

            {projectSigners.length > 0 && (
              <View style={{ gap: 8, marginBottom: additionalSigners.length > 0 ? 12 : 0 }}>
                {projectSigners.map(signer => {
                  const checked = selectedRosterIds.has(signer.id);
                  const hasStoredSig = !!signer.signature_png_url;
                  return (
                    <Pressable
                      key={signer.id}
                      onPress={() => void toggleRosterSigner(signer)}
                      style={s.rosterRow}
                    >
                      <View style={[s.checkbox, checked && s.checkboxChecked]}>
                        {checked && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rosterTitle}>
                          {signer.full_name}-ის ხელმოწერა
                        </Text>
                        <Text style={s.rosterSub}>
                          {SIGNER_ROLE_LABEL[signer.role]}
                          {hasStoredSig ? '' : ' · ხელმოწერა საჭიროა'}
                        </Text>
                      </View>
                      {hasStoredSig && checked ? (
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {additionalSigners.length === 0 ? (
              projectSigners.length === 0 ? (
                <Text style={s.emptyHint}>სურვილისამებრ — დაამატე სხვა ხელმომწერი</Text>
              ) : null
            ) : (
              <View style={{ gap: 10 }}>
                {additionalSigners.map(signer => (
                  <View key={signer.id} style={s.signerRow}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TextInput
                          style={s.signerInput}
                          value={signer.name}
                          onChangeText={t => updateSignerName(signer.id, t)}
                          placeholder="სახელი გვარი"
                          placeholderTextColor={COLORS.textSecondary}
                        />
                        <Pressable hitSlop={8} onPress={() => removeSigner(signer.id)}>
                          <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                        </Pressable>
                      </View>
                      <Pressable onPress={() => pickSignerRole(signer.id)} style={s.roleChip}>
                        <Ionicons name="person-circle-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={s.roleChipText}>{SIGNER_ROLE_LABEL[signer.role]}</Text>
                        <Ionicons name="chevron-down" size={12} color={COLORS.textSecondary} />
                      </Pressable>
                    </View>

                    {signer.dataUrl ? (
                      <Animated.View entering={FadeInUp.duration(250)} style={{ marginTop: 8 }}>
                        <Image source={{ uri: signer.dataUrl }} style={s.sigPreviewSmall} resizeMode="contain" />
                        <Pressable onPress={() => setCaptureSignerId(signer.id)}>
                          <Text style={s.textLink}>შეცვლა</Text>
                        </Pressable>
                      </Animated.View>
                    ) : (
                      <Pressable
                        onPress={() => {
                          if (!signer.name?.trim()) { toast.error('ჯერ შეიყვანე სახელი'); return; }
                          setCaptureSignerId(signer.id);
                        }}
                        style={s.sigPlaceholderSmall}
                      >
                        <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                        <Text style={s.sigPlaceholderTextSmall}>ხელმოწერა</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            )}
            <Pressable onPress={addSigner} style={s.ghostBtn}>
              <Text style={s.ghostBtnText}>+ ახალი ხელმომწერი</Text>
            </Pressable>
          </Animated.View>

          <View style={s.divider} />

          {/* Required Qualifications */}
          {requiredCertTypes.length > 0 && (
            <Animated.View entering={FadeInUp.duration(300).delay(3 * STAGGER_MS)} style={s.section}>
              <Text style={s.sectionLabel}>კვალიფიკაციის სერტიფიკატები</Text>
              <View style={{ gap: 8 }}>
                {requiredCertTypes.map(certType => {
                  const selectedId = selectedQuals[certType];
                  const selected = selectedId ? quals.find(q => q.id === selectedId) : null;
                  const hasAny = quals.some(q => q.type === certType);
                  const isUploading = uploadingFor === certType;
                  return (
                    <Pressable key={certType} onPress={() => pickQual(certType)} style={s.listRow}>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'alert-circle'}
                        size={18}
                        color={selected ? COLORS.primary : COLORS.warn}
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
              {requiredCertTypes.some(t => !selectedQuals[t]) && (
                <Text style={{ fontSize: 12, color: COLORS.warn, marginTop: 8 }}>
                  არჩიე ყველა საჭირო სერტიფიკატი
                </Text>
              )}
            </Animated.View>
          )}

          {requiredCertTypes.length > 0 && <View style={s.divider} />}

          {/* Extra Qualifications */}
          <Animated.View entering={FadeInUp.duration(300).delay(4 * STAGGER_MS)} style={s.section}>
            <Text style={s.sectionLabel}>დამატებითი სერტიფიკატები</Text>
            {extraQualIds.length === 0 ? (
              <Text style={s.emptyHint}>სურვილისამებრ — დაამატე სხვა კვალიფიკაციის სერტიფიკატი</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {extraQualIds.map(id => {
                  const q = quals.find(x => x.id === id);
                  if (!q) return null;
                  return (
                    <Pressable key={id} onPress={() => removeExtraQual(id)} style={s.listRow}>
                      <Ionicons name="ribbon-outline" size={16} color={COLORS.primary} />
                      <Text style={s.listRowTitle}>{q.type}{q.number ? ` · №${q.number}` : ''}</Text>
                      <Text style={s.textLink}>წაშლა</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <Pressable onPress={addExtraQual} style={s.ghostBtn}>
              <Text style={s.ghostBtnText}>+ დამატება</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={s.bottomBar}>
          <Animated.View style={[{ width: '100%' }, btnAnimatedStyle]}>
            <Pressable
              onPress={generate}
              onPressIn={onGeneratePressIn}
              onPressOut={onGeneratePressOut}
              disabled={busy || missingQualTypes.length > 0}
              style={[
                s.generateBtn,
                (busy || missingQualTypes.length > 0) && { opacity: 0.6 },
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={s.generateBtnText}>PDF-ის გენერაცია</Text>
              )}
            </Pressable>
          </Animated.View>
        </View>

        {/* Signature capture modal */}
        <SignatureCanvas
          visible={captureVisible}
          personName={capturePersonName}
          onCancel={() => { setCaptureSignerId(null); setCaptureRosterId(null); }}
          onConfirm={onSignatureCaptured}
        />
      </SafeAreaView>
    </Screen>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    backgroundColor: COLORS.surface,
  },
  headerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // Hero
  heroBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  heroLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  heroDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  heroObject: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.hairline,
    marginHorizontal: 16,
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },

  // Roster checkbox row
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rosterTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  rosterSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Expert row
  expertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  expertName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  expertRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Signature
  sigPreviewWrap: {
    marginTop: 12,
    gap: 6,
  },
  sigPreview: {
    width: '100%',
    height: 60,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  sigPreviewSmall: {
    width: 120,
    height: 50,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  sigPlaceholder: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignSelf: 'flex-start',
  },
  sigPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sigPlaceholderSmall: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignSelf: 'flex-start',
  },
  sigPlaceholderTextSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Signers
  signerRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  signerInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // List rows
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  listRowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  listRowMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Ghost button
  ghostBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  generateBtn: {
    height: 54,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Link
  textLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
