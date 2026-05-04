import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentLocation, reverseGeocode } from '../../utils/location';
import type { PhotoLocation } from '../../utils/location';
import { showPhotoLocationAlert } from '../../lib/photoLocationAlert';
import { generateAndSharePdf } from '../../lib/pdfOpen';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';

import { A11yText as Text } from '../../components/primitives/A11yText';
import { FlowHeader } from '../../components/FlowHeader';
import { DateTimeField } from '../../components/DateTimeField';
import { Button } from '../../components/ui';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { useTheme } from '../../lib/theme';
import { useSession } from '../../lib/session';
import { useToast } from '../../lib/toast';
import { incidentsApi, projectsApi, storageApi } from '../../lib/services';
import { STORAGE_BUCKETS } from '../../lib/supabase';
import { buildIncidentPdfHtml } from '../../lib/incidentPdf';
import { generatePdfName } from '../../lib/pdfName';
import { queuePdfUpload, stagePdfForQueue } from '../../lib/pdfUploadQueue';
import * as FileSystem from 'expo-file-system/legacy';
import { logError } from '../../lib/logError';
import {
  signatureAsDataUrl,
  pdfPhotoEmbed,
  imageForDisplay,
} from '../../lib/imageUrl';
import { friendlyError } from '../../lib/errorMap';
import { formatShortDateTime } from '../../lib/formatDate';
import type { IncidentType, Project } from '../../types/models';
import { INCIDENT_TYPE_FULL_LABEL, INCIDENT_TYPE_LABEL } from '../../types/models';

// ─── types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

interface IncidentPhoto {
  uri: string;
  location: PhotoLocation | null;
}

interface FormData {
  type: IncidentType | null;
  injuredName: string;
  injuredRole: string;
  dateTime: Date;
  location: string;
  description: string;
  cause: string;
  actionsTaken: string;
  witnesses: string[];
  photos: IncidentPhoto[];
}

const INITIAL_FORM: FormData = {
  type: null,
  injuredName: '',
  injuredRole: '',
  dateTime: new Date(),
  location: '',
  description: '',
  cause: '',
  actionsTaken: '',
  witnesses: [],
  photos: [],
};

function getTypeBadge(theme: any): Record<IncidentType, { bg: string; text: string; border: string }> {
  const isDark = theme.colors.semantic.dangerSoft === '#3A1F1F';
  if (isDark) {
    return {
      minor:    { bg: '#3F2E0F', text: '#FCD34D', border: '#F59E0B' },
      severe:   { bg: '#3D1F08', text: '#FCA673', border: '#F97316' },
      fatal:    { bg: '#3A1F1F', text: '#FCA5A5', border: '#EF4444' },
      mass:     { bg: '#3A1F1F', text: '#FCA5A5', border: '#EF4444' },
      nearmiss: { bg: '#2D1F4F', text: '#C4B5FD', border: '#8B5CF6' },
    };
  }
  return {
    minor:    { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
    severe:   { bg: '#FFEDD5', text: '#9A3412', border: '#F97316' },
    fatal:    { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
    mass:     { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
    nearmiss: { bg: '#EDE9FE', text: '#5B21B6', border: '#8B5CF6' },
  };
}

// ─── main component ───────────────────────────────────────────────────────────

export default function NewIncident() {
  const { theme } = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [project, setProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  // stable incident id — lets us upload photos before the row is created
  const incidentId = useRef(Crypto.randomUUID()).current;

  // witness text input buffer
  const [witnessInput, setWitnessInput] = useState('');

  // inspector info from session
  const inspector = useMemo(() => {
    if (session.state.status !== 'signedIn') return { name: '', sigPath: null };
    const u = session.state.user;
    const name = u
      ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
      : session.state.session.user.email ?? '';
    return { name, sigPath: u?.saved_signature_url ?? null };
  }, [session.state]);

  // load project once
  const loadProject = useCallback(async () => {
    if (!projectId || project) return;
    const p = await projectsApi.getById(projectId).catch(() => null);
    setProject(p);
  }, [projectId, project]);

  // run on mount
  useEffect(() => { void loadProject(); }, [loadProject]);

  // ── navigation ──────────────────────────────────────────────────────────────

  const isFormDirty = useMemo(() => (
    form.type !== null ||
    form.injuredName.trim().length > 0 ||
    form.injuredRole.trim().length > 0 ||
    form.location.trim().length > 0 ||
    form.description.trim().length > 0 ||
    form.cause.trim().length > 0 ||
    form.actionsTaken.trim().length > 0 ||
    form.witnesses.length > 0 ||
    form.photos.length > 0
  ), [form]);

  const goBack = () => {
    if (step === 1) {
      router.back();
    } else {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const canAdvance = useMemo((): boolean => {
    if (step === 1) return form.type !== null;
    if (step === 2) return form.location.trim().length > 0;
    if (step === 3) return form.description.trim().length > 0 && form.cause.trim().length > 0;
    return true;
  }, [step, form]);

  const goNext = () => {
    if (!canAdvance) return;
    setStep((prev) => (prev + 1) as Step);
  };

  // ── photo handling ──────────────────────────────────────────────────────────

  const addPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (camPerm.status !== 'granted') {
        toast.error('ფოტოს დასამატებლად გახსენით წვდომა');
        return;
      }
    }
    Alert.alert('ფოტოს წყარო', undefined, [
      {
        text: 'კამერა',
        onPress: async () => {
          const [res, location] = await Promise.all([
            ImagePicker.launchCameraAsync({ quality: 0.8 }),
            getCurrentLocation(),
          ]);
          if (!res.canceled && res.assets[0]) {
            const photo: IncidentPhoto = { uri: res.assets[0].uri, location };
            setForm(f => ({ ...f, photos: [...f.photos, photo] }));
            if (project) {
              showPhotoLocationAlert(project, location, setProject).catch(() => {});
            }
          }
        },
      },
      {
        text: 'გალერეა',
        onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({
            allowsMultipleSelection: true,
            quality: 0.8,
          });
          if (!res.canceled && res.assets.length > 0) {
            const location = await getCurrentLocation();
            const newPhotos: IncidentPhoto[] = res.assets.map(a => ({ uri: a.uri, location }));
            setForm(f => ({ ...f, photos: [...f.photos, ...newPhotos] }));
            if (project) {
              showPhotoLocationAlert(project, location, setProject).catch(() => {});
            }
          }
        },
      },
      { text: 'გაუქმება', style: 'cancel' },
    ]);
  };

  const removePhoto = (idx: number) => {
    setForm(f => ({
      ...f,
      photos: f.photos.filter((_, i) => i !== idx),
    }));
  };

  // ── witness handling ────────────────────────────────────────────────────────

  const addWitness = () => {
    const name = witnessInput.trim();
    if (!name) return;
    setForm(f => ({ ...f, witnesses: [...f.witnesses, name] }));
    setWitnessInput('');
  };

  const removeWitness = (idx: number) => {
    setForm(f => ({ ...f, witnesses: f.witnesses.filter((_, i) => i !== idx) }));
  };

  // ── upload helpers ──────────────────────────────────────────────────────────

  const uploadPhotos = async (): Promise<{ path: string; location: PhotoLocation | null }[]> => {
    const results: { path: string; location: PhotoLocation | null }[] = [];
    for (const photo of form.photos) {
      const photoId = Crypto.randomUUID();
      const ext = photo.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${incidentId}/${photoId}.${ext}`;
      try {
        await storageApi.uploadFromUri(
          STORAGE_BUCKETS.incidentPhotos,
          path,
          photo.uri,
          'image/jpeg',
          'incident',
        );
        results.push({ path, location: photo.location });
      } catch (e) {
        console.warn('[incident] photo upload failed', e);
      }
    }
    return results;
  };

  // ── save (draft) ────────────────────────────────────────────────────────────

  const saveDraft = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      const uploaded = await uploadPhotos();
      await incidentsApi.create({
        id: incidentId,
        project_id: projectId,
        type: form.type!,
        injured_name: form.type !== 'nearmiss' ? form.injuredName || null : null,
        injured_role: form.type !== 'nearmiss' ? form.injuredRole || null : null,
        date_time: form.dateTime.toISOString(),
        location: form.location,
        description: form.description,
        cause: form.cause,
        actions_taken: form.actionsTaken,
        witnesses: form.witnesses,
        photos: uploaded.map(u => u.path),
        inspector_signature: inspector.sigPath,
        status: 'draft',
        pdf_url: null,
      });
      toast.success('ინციდენტი შენახულია');
      router.back();
    } catch (e) {
      toast.error(friendlyError(e, 'შენახვა ვერ მოხერხდა'));
    } finally {
      setSaving(false);
    }
  };

  // ── save + generate PDF ─────────────────────────────────────────────────────

  const saveAndGeneratePdf = async () => {
    if (!projectId || !project) {
      toast.error('პროექტი ვერ მოიძებნა');
      return;
    }
    setSaving(true);
    let savedId = incidentId;
    try {
      // 1. upload photos
      const uploaded = await uploadPhotos();
      const photoPaths = uploaded.map(u => u.path);

      // 2. create incident record
      const saved = await incidentsApi.create({
        id: incidentId,
        project_id: projectId,
        type: form.type!,
        injured_name: form.type !== 'nearmiss' ? form.injuredName || null : null,
        injured_role: form.type !== 'nearmiss' ? form.injuredRole || null : null,
        date_time: form.dateTime.toISOString(),
        location: form.location,
        description: form.description,
        cause: form.cause,
        actions_taken: form.actionsTaken,
        witnesses: form.witnesses,
        photos: photoPaths,
        inspector_signature: inspector.sigPath,
        status: 'completed',
        pdf_url: null,
      });
      savedId = saved.id;

      // 3. load signature data URL — strict so we never embed a signed URL
      // the print WebView can't fetch.
      let sigDataUrl: string | undefined;
      if (inspector.sigPath) {
        sigDataUrl = await signatureAsDataUrl(
          STORAGE_BUCKETS.signatures,
          inspector.sigPath,
        ).catch(() => undefined);
      }

      // 4. load photo data URLs (strict — drop ones that fail rather than
      // embedding an unreachable signed URL fallback).
      const photoDataUrls = await Promise.all(
        photoPaths.map(p =>
          pdfPhotoEmbed(STORAGE_BUCKETS.incidentPhotos, p).catch(
            () => '',
          ),
        ),
      ).then(urls => urls.filter(Boolean));

      // Resolve addresses for photos that have location data.
      const photoAddresses = await Promise.all(
        uploaded.map(async u => {
          if (!u.location) return null;
          return reverseGeocode(u.location.latitude, u.location.longitude).catch(() => null);
        }),
      );

      // 5. build HTML
      const html = buildIncidentPdfHtml({
        incident: saved,
        project,
        inspectorName: inspector.name,
        inspectorSignatureDataUrl: sigDataUrl,
        photoDataUrls,
        photoAddresses,
      });

      // 6. open/share PDF instantly; keep the pretty-named copy for background upload
      const incidentTypeLabel = INCIDENT_TYPE_FULL_LABEL[form.type!];
      const docType = `ინციდენტი_${incidentTypeLabel}`;
      const pdfName = generatePdfName(project.company_name || project.name, docType, form.dateTime, savedId);
      const pdfPath = `incidents/${pdfName}`;
      const localUri = await generateAndSharePdf(html, pdfName, true);
      if (localUri) {

        toast.success('ოქმი შექმნილია');
        router.replace(`/incidents/${savedId}` as any);

        // Background: upload PDF + update incident row.
        // If this fails, queue for retry so the user isn't blocked.
        (async () => {
          try {
            await storageApi.uploadFromUri(STORAGE_BUCKETS.pdfs, pdfPath, localUri, 'application/pdf');
            await incidentsApi.update(savedId, { pdf_url: pdfPath });
            // Clean up the temp copy after successful upload
            FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
          } catch (e) {
            logError(e, 'incidentNew.backgroundUpload');
            const stagedUri = await stagePdfForQueue(localUri, pdfName);
            await queuePdfUpload({
              localUri: stagedUri,
              bucket: STORAGE_BUCKETS.pdfs,
              path: pdfPath,
              contentType: 'application/pdf',
              dbOp: {
                kind: 'incident_update',
                payload: { incidentId: savedId, pdf_url: pdfPath },
              },
            });
            toast.info('PDF შენახულია ლოკალურად; სინქრონიზაცია მოხდება ქსელზე დაბრუნებისას');
          }
        })();
      } else {
        toast.success('ოქმი შექმნილია');
        router.replace(`/incidents/${savedId}` as any);
      }
    } catch (e) {
      console.warn('[incident] PDF generation failed', e);
      toast.error(friendlyError(e, 'PDF-ის შექმნა ვერ მოხერხდა — ინციდენტი შენახულია'));
      router.replace(`/incidents/${savedId}` as any);
    } finally {
      setSaving(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlowHeader
        flowTitle="ინციდენტი"
        project={project}
        step={step}
        totalSteps={4}
        onBack={goBack}
        confirmExit={step === 1 && isFormDirty}
      />

      <KeyboardSafeArea headerHeight={44} contentStyle={{ padding: 16 }}>
        {step === 1 && <Step1 form={form} setForm={setForm} theme={theme} s={s} />}
        {step === 2 && (
          <Step2
            form={form}
            setForm={setForm}
            theme={theme}
            s={s}
          />
        )}
        {step === 3 && (
          <Step3
            form={form}
            setForm={setForm}
            theme={theme}
            s={s}
            witnessInput={witnessInput}
            setWitnessInput={setWitnessInput}
            onAddWitness={addWitness}
            onRemoveWitness={removeWitness}
            onAddPhoto={addPhoto}
            onRemovePhoto={removePhoto}
          />
        )}
        {step === 4 && (
          <Step4
            form={form}
            inspectorName={inspector.name}
            sigPath={inspector.sigPath}
            project={project}
            theme={theme}
            s={s}
          />
        )}

        <View style={{ flex: 1 }} />
        <View style={s.bottomBar}>
          {step < 4 ? (
            <Button
              title="შემდეგი"
              rightIcon="arrow-forward"
              onPress={goNext}
              disabled={!canAdvance}
              style={{ width: '100%' }}
            />
          ) : (
            <View style={{ gap: 10 }}>
              <Button
                title="PDF გენერირება"
                leftIcon="document-text"
                loading={saving}
                onPress={saveAndGeneratePdf}
                style={{ width: '100%' }}
              />
              <Button
                title="შენახვა ხელმოწერის გარეშე"
                variant="link"
                disabled={saving}
                onPress={saveDraft}
                style={{ width: '100%' }}
              />
            </View>
          )}
        </View>
      </KeyboardSafeArea>

    </View>
  );
}

// ─── Step 1 — type selection ──────────────────────────────────────────────────

function Step1({
  form, setForm, theme, s,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  const types: IncidentType[] = ['minor', 'severe', 'fatal', 'mass', 'nearmiss'];
  const needsNotice = form.type === 'severe' || form.type === 'fatal';

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>რა სახის შემთხვევა?</Text>

      {types.map(t => {
        const badge = getTypeBadge(theme)[t];
        const selected = form.type === t;
        return (
          <Pressable
            key={t}
            onPress={() => setForm(f => ({ ...f, type: t }))}
            style={[
              s.typeCard,
              selected && {
                borderColor: badge.border,
                backgroundColor: badge.bg,
              },
            ]}
          >
            <View
              style={[
                s.typeCardBadge,
                { backgroundColor: badge.bg, borderColor: badge.border },
              ]}
            >
              <Text style={[s.typeCardBadgeText, { color: badge.text }]}>
                {INCIDENT_TYPE_LABEL[t]}
              </Text>
            </View>
            <Text style={[s.typeCardLabel, selected && { color: badge.text, fontWeight: '700' }]}>
              {INCIDENT_TYPE_FULL_LABEL[t]}
            </Text>
            {selected && (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={badge.border}
                style={{ marginLeft: 'auto' }}
              />
            )}
          </Pressable>
        );
      })}

      {needsNotice && (
        <View style={s.warningBanner}>
          <Ionicons name="warning" size={18} color="#991B1B" />
          <Text style={s.warningBannerText}>
            კანონის მოთხოვნით შრომის შემოწმების აქტი უნდა ეცნობოს 24 საათის
            განმავლობაში
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Step 2 — person + details ────────────────────────────────────────────────

function Step2({
  form, setForm, theme, s,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  const isNearMiss = form.type === 'nearmiss';

  return (
    <View style={{ gap: 16 }}>
      <Text style={s.stepTitle}>დაზარალებული და გარემოება</Text>

      {isNearMiss ? (
        <View style={s.nearMissNote}>
          <Ionicons name="information-circle" size={18} color={theme.colors.inkSoft} />
          <Text style={s.nearMissNoteText}>
            საშიში შემთხვევა — დაზიანება არ მომხდარა
          </Text>
        </View>
      ) : (
        <>
          <FloatingLabelInput
            label="დაზარალებული პირი"
            value={form.injuredName}
            onChangeText={v => setForm(f => ({ ...f, injuredName: v }))}
          />

          <FloatingLabelInput
            label="თანამდებობა"
            value={form.injuredRole}
            onChangeText={v => setForm(f => ({ ...f, injuredRole: v }))}
          />
        </>
      )}

      <DateTimeField
        label="თარიღი და დრო"
        value={form.dateTime}
        onChange={d => setForm(f => ({ ...f, dateTime: d }))}
        mode="datetime"
        maxDate={new Date()}
      />

      {/* Location */}
      <FloatingLabelInput
        label="ზუსტი ადგილი"
        required
        value={form.location}
        onChangeText={v => setForm(f => ({ ...f, location: v }))}
      />
    </View>
  );
}

// ─── Step 3 — description ─────────────────────────────────────────────────────

function Step3({
  form, setForm, theme, s,
  witnessInput, setWitnessInput, onAddWitness, onRemoveWitness,
  onAddPhoto, onRemovePhoto,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  theme: any;
  s: ReturnType<typeof makeStyles>;
  witnessInput: string;
  setWitnessInput: (v: string) => void;
  onAddWitness: () => void;
  onRemoveWitness: (i: number) => void;
  onAddPhoto: () => void;
  onRemovePhoto: (i: number) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      <Text style={s.stepTitle}>აღწერა და მიზეზი</Text>

      <FloatingLabelInput
        label="რა მოხდა"
        value={form.description}
        onChangeText={v => setForm(f => ({ ...f, description: v }))}
        multiline
        numberOfLines={4}
      />

      <FloatingLabelInput
        label="სავარაუდო მიზეზი"
        value={form.cause}
        onChangeText={v => setForm(f => ({ ...f, cause: v }))}
        multiline
        numberOfLines={3}
      />

      <FloatingLabelInput
        label="მიღებული ზომები"
        value={form.actionsTaken}
        onChangeText={v => setForm(f => ({ ...f, actionsTaken: v }))}
        multiline
        numberOfLines={3}
      />

      {/* Witnesses */}
      <View style={{ gap: 8 }}>
        <Text style={s.fieldLabel}>მოწმეები</Text>
        {form.witnesses.map((w, i) => (
          <View key={`${i}-${w}`} style={s.witnessRow}>
            <Ionicons name="person-outline" size={15} color={theme.colors.inkSoft} />
            <Text style={s.witnessName}>{w}</Text>
            <Pressable onPress={() => onRemoveWitness(i)} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.colors.danger} />
            </Pressable>
          </View>
        ))}
        <View style={s.witnessInputRow}>
          <View style={{ flex: 1 }}>
            <FloatingLabelInput
              label="სახელი, გვარი"
              value={witnessInput}
              onChangeText={setWitnessInput}
              onSubmitEditing={onAddWitness}
              returnKeyType="done"
              style={{ marginBottom: 0 }}
            />
          </View>
          <Pressable onPress={onAddWitness} style={s.addWitnessBtn}>
            <Ionicons name="add" size={20} color={theme.colors.accent} />
          </Pressable>
        </View>
      </View>

      {/* Photos */}
      <View style={{ gap: 8 }}>
        <Text style={s.fieldLabel}>ფოტო მასალა</Text>
        {form.photos.length > 0 && (
          <View style={s.photoGrid}>
            {form.photos.map((photo, i) => (
              <View key={`${i}-${photo.uri}`} style={s.photoThumb}>
                <Image
                  source={{ uri: photo.uri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
                <Pressable
                  onPress={() => onRemovePhoto(i)}
                  style={s.photoRemoveBtn}
                  hitSlop={4}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <Pressable onPress={onAddPhoto} style={s.addPhotoBtn}>
          <Ionicons name="camera-outline" size={18} color={theme.colors.accent} />
          <Text style={s.addPhotoBtnText}>ფოტოს დამატება</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Step 4 — summary + sign ──────────────────────────────────────────────────

function Step4({
  form, inspectorName, sigPath, project, theme, s,
}: {
  form: FormData;
  inspectorName: string;
  sigPath: string | null;
  project: Project | null;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  const [sigDisplayUrl, setSigDisplayUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sigPath) return;
    imageForDisplay(STORAGE_BUCKETS.signatures, sigPath)
      .then(setSigDisplayUrl)
      .catch(() => null);
  }, [sigPath]);

  const badge = form.type ? getTypeBadge(theme)[form.type] : null;

  return (
    <View style={{ gap: 16 }}>
      <Text style={s.stepTitle}>ხელმოწერა და დასრულება</Text>

      {/* Summary card */}
      <View style={s.summaryCard}>
        {form.type && badge && (
          <View
            style={[
              s.summaryBadge,
              { backgroundColor: badge.bg, borderColor: badge.border },
            ]}
          >
            <Text style={[s.summaryBadgeText, { color: badge.text }]}>
              {INCIDENT_TYPE_FULL_LABEL[form.type]}
            </Text>
          </View>
        )}

        <SummaryRow
          label="პროექტი"
          value={project?.name ?? '—'}
          theme={theme}
          s={s}
        />
        {form.type !== 'nearmiss' && form.injuredName ? (
          <SummaryRow
            label="დაზარალებული"
            value={`${form.injuredName}${form.injuredRole ? ` — ${form.injuredRole}` : ''}`}
            theme={theme}
            s={s}
          />
        ) : null}
        <SummaryRow
          label="თარიღი"
          value={formatShortDateTime(form.dateTime.toISOString())}
          theme={theme}
          s={s}
        />
        <SummaryRow
          label="ადგილი"
          value={form.location || '—'}
          theme={theme}
          s={s}
        />
        {form.witnesses.length > 0 && (
          <SummaryRow
            label="მოწმეები"
            value={form.witnesses.join(', ')}
            theme={theme}
            s={s}
          />
        )}
        {form.photos.length > 0 && (
          <SummaryRow
            label="ფოტოები"
            value={`${form.photos.length} ფოტო`}
            theme={theme}
            s={s}
          />
        )}
      </View>

      {/* Inspector signed row */}
      <View style={s.inspectorRow}>
        <View style={s.inspectorSigBox}>
          {sigDisplayUrl ? (
            <Image
              source={{ uri: sigDisplayUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
            />
          ) : (
            <Ionicons name="create-outline" size={20} color={theme.colors.inkFaint} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.inspectorName}>{inspectorName || 'სპეციალისტი'}</Text>
          <Text style={s.inspectorRole}>შრომის უსაფრთხოების სპეციალისტი</Text>
        </View>
        <View style={s.signedChip}>
          <Ionicons name="checkmark" size={13} color="#065F46" />
          <Text style={s.signedChipText}>ხელმოწერილია ✓</Text>
        </View>
      </View>

      {(form.type === 'severe' || form.type === 'fatal') && (
        <View style={s.warningBanner}>
          <Ionicons name="warning" size={18} color="#991B1B" />
          <Text style={s.warningBannerText}>
            კანონის მოთხოვნით შრომის შემოწმების აქტი უნდა ეცნობოს 24 საათის
            განმავლობაში
          </Text>
        </View>
      )}
    </View>
  );
}

function SummaryRow({
  label, value, theme, s,
}: {
  label: string;
  value: string;
  theme: any;
  s: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

function makeStyles(theme: any) {
  return StyleSheet.create({
    // step title
    stepTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.ink,
      marginBottom: 4,
    },

    // type cards
    typeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    typeCardBadge: {
      borderRadius: 6,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    typeCardBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    typeCardLabel: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.ink,
      fontWeight: '500',
    },

    // warning banner
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: theme.colors.semantic.dangerSoft,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.dangerBorder,
      padding: 12,
    },
    warningBannerText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.danger,
      fontWeight: '600',
      lineHeight: 20,
    },

    // near-miss note
    nearMissNote: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 10,
    },
    nearMissNoteText: {
      fontSize: 13,
      color: theme.colors.inkSoft,
      fontWeight: '500',
    },

    // section/field label (used where Input label prop isn't applicable)
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.inkSoft,
      marginBottom: 2,
    },

    // witnesses
    witnessRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 8,
      padding: 10,
    },
    witnessName: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.ink,
    },
    witnessInputRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    addWitnessBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // photos
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    photoThumb: {
      width: 88,
      height: 88,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceSecondary,
    },
    photoRemoveBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 10,
    },
    addPhotoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      borderStyle: 'dashed',
    },
    addPhotoBtnText: {
      fontSize: 14,
      color: theme.colors.accent,
      fontWeight: '600',
    },

    // summary card
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 10,
    },
    summaryBadge: {
      alignSelf: 'flex-start',
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 4,
    },
    summaryBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 12,
    },
    summaryLabel: {
      fontSize: 13,
      color: theme.colors.inkSoft,
      width: 90,
      flexShrink: 0,
    },
    summaryValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.ink,
    },

    // inspector row
    inspectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    inspectorSigBox: {
      width: 56,
      height: 44,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    inspectorName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.ink,
    },
    inspectorRole: {
      fontSize: 12,
      color: theme.colors.inkSoft,
      marginTop: 2,
    },
    signedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.semantic.successSoft,
      borderRadius: 16,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    signedChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.semantic.success,
    },

    // bottom bar
    bottomBar: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },

  });
}
