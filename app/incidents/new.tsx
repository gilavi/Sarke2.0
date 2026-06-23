import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { usePhotoPicker } from '../../hooks/usePhotoPicker';
import * as Crypto from 'expo-crypto';
import { generateAndSharePdf, PdfLimitReachedError } from '../../lib/pdfOpen';
import { hashPdf } from '../../lib/pdfSecurity';
import { SubscriptionNotice } from '../../components/SubscriptionNotice';
import { usePdfUsage, useInvalidatePdfUsage } from '../../lib/usePdfUsage';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Info, User, CircleX, Plus, Camera, Pencil, TriangleAlert, ArrowRight, FileText } from 'lucide-react-native';
import { Selector } from '../../components/ui/Selector';
import { KeyboardSafeArea } from '../../components/layout/KeyboardSafeArea';

import { A11yText as Text } from '../../components/primitives/A11yText';
import { IconButton } from '../../components/primitives/IconButton';
import { FlowHeader } from '../../components/FlowHeader';
import { FlowProjectPicker } from '../../components/FlowProjectPicker';
import { DateTimeField } from '../../components/DateTimeField';
import { Button } from '../../components/ui';
import { FloatingLabelInput } from '../../components/inputs/FloatingLabelInput';
import { useTheme } from '../../lib/theme';
import { incidentColors } from '../../lib/statusColors';
import { useSession } from '../../lib/session';
import { useToast } from '../../lib/toast';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';
import { useScrollToError } from '../../hooks/useScrollToError';
import { incidentsApi, projectsApi, storageApi } from '../../lib/services';
import { queryClient } from '../../lib/queryClient';
import { invalidateRecordLists } from '../../lib/apiHooks';
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
import { INCIDENT_TYPE_FULL_LABEL } from '../../types/models';
import { useTranslation } from 'react-i18next';

// ─── types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

interface IncidentPhoto {
  uri: string;
  /**
   * Storage path when the photo is already uploaded (edit mode). Such photos
   * are kept as-is on save (never re-uploaded, never deleted on a failed
   * commit). New photos picked in this session have no `existingPath`.
   */
  existingPath?: string;
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

// ─── main component ───────────────────────────────────────────────────────────

export default function NewIncident() {
  const insets = useSafeAreaInsets();
  const { pickPhotosWithAnnotation } = usePhotoPicker();
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const { projectId: paramProjectId, editId } = useLocalSearchParams<{ projectId?: string; editId?: string }>();
  const [pickedProject, setPickedProject] = useState<Project | null>(null);
  const projectId = paramProjectId ?? pickedProject?.id;

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  // Enabled "შემდეგი" button + on-press field errors (see useSubmitGuard).
  const { attempted, guard, reset: resetAttempted } = useSubmitGuard();
  // Scroll the first empty required field into view on a blocked press.
  const { scrollRef, registerField, scrollToFirstError } = useScrollToError();
  const [project, setProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();
  // stable incident id - lets us upload photos before the row is created. In
  // edit mode it's the existing record's id so save updates (not duplicates) it.
  const incidentId = useRef(editId ?? Crypto.randomUUID()).current;

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
  useEffect(() => {
    if (!projectId || project) return;
    let mounted = true;
    projectsApi.getById(projectId)
      .then(p => { if (mounted) setProject(p); })
      .catch(() => null);
    return () => { mounted = false; };
  }, [projectId, project]);

  // Edit mode: hydrate the form from the (reopened) incident. Existing photos
  // carry their storage path so save keeps them without re-uploading.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!editId || hydratedRef.current) return;
    hydratedRef.current = true;
    let mounted = true;
    (async () => {
      try {
        const inc = await incidentsApi.getById(editId);
        if (!inc || !mounted) return;
        const photoEntries = await Promise.all(
          (inc.photos ?? []).map(async path => ({
            uri: await imageForDisplay(STORAGE_BUCKETS.incidentPhotos, path).catch(() => ''),
            existingPath: path,
          })),
        );
        if (!mounted) return;
        setForm({
          type: inc.type,
          injuredName: inc.injured_name ?? '',
          injuredRole: inc.injured_role ?? '',
          dateTime: inc.date_time ? new Date(inc.date_time) : new Date(),
          location: inc.location ?? '',
          description: inc.description ?? '',
          cause: inc.cause ?? '',
          actionsTaken: inc.actions_taken ?? '',
          witnesses: inc.witnesses ?? [],
          photos: photoEntries.filter(p => p.uri),
        });
      } catch {
        // best-effort: leave the blank form if hydration fails
      }
    })();
    return () => { mounted = false; };
  }, [editId]);

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
    setStep((prev) => (prev + 1) as Step);
  };

  // Ordered keys of the empty required fields on the current step (for scroll-to-error).
  const missingFieldKeys = useMemo((): string[] => {
    if (step === 2) return form.location.trim() ? [] : ['location'];
    if (step === 3) {
      return [
        ...(form.description.trim() ? [] : ['description']),
        ...(form.cause.trim() ? [] : ['cause']),
      ];
    }
    return [];
  }, [step, form]);

  const handleAdvance = () => {
    guard(canAdvance, goNext, () => scrollToFirstError(missingFieldKeys));
  };

  // Clear the error reveal whenever the step changes.
  useEffect(() => { resetAttempted(); }, [step, resetAttempted]);

  // ── photo handling ──────────────────────────────────────────────────────────

  const addPhoto = async () => {
    const results = await pickPhotosWithAnnotation({ skipAnnotate: true });
    if (results.length === 0) return;
    const newPhotos: IncidentPhoto[] = results.map(r => ({ uri: r.uri }));
    setForm(f => ({ ...f, photos: [...f.photos, ...newPhotos] }));
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

  const uploadPhotos = async (): Promise<{ path: string; isNew: boolean }[]> => {
    const results: { path: string; isNew: boolean }[] = [];
    for (const photo of form.photos) {
      // Edit mode: an already-stored photo keeps its path (no re-upload).
      if (photo.existingPath) {
        results.push({ path: photo.existingPath, isNew: false });
        continue;
      }
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
        results.push({ path, isNew: true });
      } catch (e) {
        console.warn('[incident] photo upload failed', e);
      }
    }
    return results;
  };

  // ── save (draft) ────────────────────────────────────────────────────────────

  const saveDraft = async () => {
    if (!projectId) return;
    if (!form.type) {
      toast.error(t('incidents.selectTypeError'));
      return;
    }
    setSaving(true);
    try {
      const uploaded = await uploadPhotos();
      const fields = {
        type: form.type,
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
        status: 'draft' as const,
        pdf_url: null,
      };
      if (editId) {
        await incidentsApi.update(editId, fields);
      } else {
        await incidentsApi.create({ id: incidentId, project_id: projectId, ...fields });
      }
      invalidateRecordLists(queryClient);
      toast.success(t('incidents.savedDraft'));
      router.back();
    } catch (e) {
      toast.error(friendlyError(e, t('errors.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  // ── save + generate PDF ─────────────────────────────────────────────────────

  const saveAndGeneratePdf = async () => {
    if (!projectId || !project) {
      toast.error(t('errors.notFoundProject'));
      return;
    }
    if (pdfUsage?.isLocked) { setLimitNoticeVisible(true); return; }
    if (!form.type) {
      toast.error(t('incidents.selectTypeError'));
      return;
    }
    setSaving(true);
    let savedId = incidentId;
    let incidentCommitted = false;
    // Only NEW uploads are cleaned up on a failed commit; existing photos
    // (edit mode) must never be deleted.
    let newlyUploadedPaths: string[] = [];
    try {
      // 1. upload photos
      const uploaded = await uploadPhotos();
      newlyUploadedPaths = uploaded.filter(u => u.isNew).map(u => u.path);
      const photoPaths = uploaded.map(u => u.path);

      // 2. create or (edit mode) update the incident record
      const fields = {
        type: form.type,
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
        status: 'completed' as const,
        pdf_url: null,
      };
      const saved = editId
        ? await incidentsApi.update(editId, fields)
        : await incidentsApi.create({ id: incidentId, project_id: projectId, ...fields });
      savedId = saved.id;
      invalidateRecordLists(queryClient);
      incidentCommitted = true;

      // 3. load signature data URL - strict so we never embed a signed URL
      // the print WebView can't fetch.
      let sigDataUrl: string | undefined;
      if (inspector.sigPath) {
        sigDataUrl = await signatureAsDataUrl(
          STORAGE_BUCKETS.signatures,
          inspector.sigPath,
        ).catch(() => undefined);
      }

      // 4. load photo data URLs (strict - drop ones that fail rather than
      // embedding an unreachable signed URL fallback).
      const photoDataUrls = await Promise.all(
        photoPaths.map(p =>
          pdfPhotoEmbed(STORAGE_BUCKETS.incidentPhotos, p).catch(
            () => '',
          ),
        ),
      ).then(urls => urls.filter(Boolean));

      // 5. build HTML
      const html = buildIncidentPdfHtml({
        incident: saved,
        project,
        inspectorName: inspector.name,
        inspectorSignatureDataUrl: sigDataUrl,
        photoDataUrls,
      });

      // 6. open/share PDF instantly; keep the pretty-named copy for background upload
      const incidentTypeLabel = INCIDENT_TYPE_FULL_LABEL[form.type];
      const docType = `ინციდენტი_${incidentTypeLabel}`;
      const pdfName = generatePdfName(project.company_name || project.name, docType, form.dateTime, savedId);
      const pdfPath = `incidents/${pdfName}`;
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      const localUri = await generateAndSharePdf(html, pdfName, true, userId, {
        title: INCIDENT_TYPE_FULL_LABEL[form.type],
        author: inspector.name || undefined,
        documentId: savedId,
        subject: 'შრომის უსაფრთხოების ინციდენტის ანგარიში',
      });
      const pdfHash = localUri ? await hashPdf(localUri).catch(() => undefined) : undefined;
      invalidatePdfUsage();
      if (localUri) {

        router.replace(`/incidents/${savedId}/success` as any);

        // Background: upload PDF + update incident row.
        // If this fails, queue for retry so the user isn't blocked.
        (async () => {
          try {
            await storageApi.uploadFromUri(STORAGE_BUCKETS.pdfs, pdfPath, localUri, 'application/pdf');
            await incidentsApi.update(savedId, {
              pdf_url: pdfPath,
              ...(pdfHash ? { pdf_hash: pdfHash } : {}),
            });
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
                payload: { incidentId: savedId, pdf_url: pdfPath, pdf_hash: pdfHash },
              },
            });
            toast.info(t('incidents.pdfSavedLocally'));
          }
        })();
      } else {
        router.replace(`/incidents/${savedId}/success` as any);
      }
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { setLimitNoticeVisible(true); return; }
      if (!incidentCommitted) {
        // Incident was never written to DB - clean up only the photos uploaded
        // this session (never the pre-existing ones in edit mode).
        for (const path of newlyUploadedPaths) {
          storageApi.remove(STORAGE_BUCKETS.incidentPhotos, path).catch(() => {});
        }
        toast.error(friendlyError(e, t('incidents.createFailed')));
        return;
      }
      console.warn('[incident] PDF generation failed', e);
      toast.error(friendlyError(e, t('incidents.pdfCreateFailedSaved')));
      router.replace(`/incidents/${savedId}` as any);
    } finally {
      setSaving(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────

  // Launched from Home without a project - pick one as the first full-screen step.
  if (!projectId) {
    return (
      <FlowProjectPicker
        flowTitle={t('incidents.flowTitle')}
        action="incident"
        onBack={() => router.back()}
        onPicked={(p) => { setPickedProject(p); setProject(p); }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.card }}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlowHeader
        flowTitle={t('incidents.flowTitle')}
        project={project}
        step={step}
        totalSteps={4}
        leading="back"
        trailing="close"
        onBack={goBack}
        onClose={() => router.back()}
        confirmExit={isFormDirty}
        surfaceColor={theme.colors.surface}
      />

      <KeyboardSafeArea headerHeight={44} contentStyle={{ padding: 16 }} scrollRef={scrollRef}>
        {step === 1 && <Step1 form={form} setForm={setForm} theme={theme} isDark={isDark} s={s} attempted={attempted} t={t} />}
        {step === 2 && (
          <Step2
            form={form}
            setForm={setForm}
            theme={theme}
            s={s}
            attempted={attempted}
            registerField={registerField}
            t={t}
          />
        )}
        {step === 3 && (
          <Step3
            form={form}
            setForm={setForm}
            theme={theme}
            s={s}
            attempted={attempted}
            registerField={registerField}
            witnessInput={witnessInput}
            setWitnessInput={setWitnessInput}
            onAddWitness={addWitness}
            onRemoveWitness={removeWitness}
            onAddPhoto={addPhoto}
            onRemovePhoto={removePhoto}
            t={t}
          />
        )}
        {step === 4 && (
          <Step4
            form={form}
            inspectorName={inspector.name}
            sigPath={inspector.sigPath}
            project={project}
            theme={theme}
            isDark={isDark}
            s={s}
            t={t}
          />
        )}

      </KeyboardSafeArea>

      {/* Footer rides above the keyboard so action buttons stay reachable while
          typing in any step's fields. Matches reports/new + briefings/new. */}
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          {step < 4 ? (
            <Button
              title={t('common.next')}
              rightIcon={ArrowRight}
              onPress={handleAdvance}
              style={{ width: '100%' }}
            />
          ) : (
            <View style={{ gap: 10 }}>
              <Button
                title={pdfUsage?.isLocked ? t('incidents.pdfGenerateLocked') : t('incidents.pdfGenerate')}
                leftIcon={FileText}
                loading={saving}
                onPress={saveAndGeneratePdf}
                style={{ width: '100%' }}
              />
              <Button
                title={t('incidents.saveWithoutSignature')}
                variant="link"
                disabled={saving}
                onPress={saveDraft}
                style={{ width: '100%' }}
              />
            </View>
          )}
        </View>
      </KeyboardStickyView>
      <SubscriptionNotice visible={limitNoticeVisible} onClose={() => setLimitNoticeVisible(false)} />
    </View>
  );
}

// ─── Step 1 - type selection ──────────────────────────────────────────────────

function Step1({
  form, setForm, theme, isDark, s, attempted, t,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  theme: any;
  isDark: boolean;
  s: ReturnType<typeof makeStyles>;
  attempted: boolean;
  t: (key: string) => string;
}) {
  const types: IncidentType[] = ['minor', 'severe', 'fatal', 'mass', 'nearmiss'];
  const needsNotice = form.type === 'severe' || form.type === 'fatal';
  const showError = attempted && form.type === null;

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('incidents.step1Title')}</Text>

      {/* Canonical Selector: bordered "type cards" with a leading severity dot and
          a check on the selected one (severity stays color-coded; chrome is monochrome). */}
      <Selector
        presentation="rows"
        indicator="check"
        error={showError}
        value={form.type}
        onChange={(v) => setForm(f => ({ ...f, type: v as IncidentType }))}
        options={types.map(type => ({
          value: type,
          label: INCIDENT_TYPE_FULL_LABEL[type],
          leading: <View style={[s.typeCardDot, { backgroundColor: incidentColors(isDark)[type].border }]} />,
        }))}
      />

      {showError && (
        <Text style={s.requiredError}>{t('incidents.selectTypeError')}</Text>
      )}

      {needsNotice && (
        <View style={s.warningBanner}>
          <TriangleAlert size={18} color={theme.colors.danger} strokeWidth={1.5} />
          <Text style={s.warningBannerText}>
            {t('incidents.labourNoticeWarning')}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Step 2 - person + details ────────────────────────────────────────────────

function Step2({
  form, setForm, theme, s, attempted, registerField, t,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  theme: any;
  s: ReturnType<typeof makeStyles>;
  attempted: boolean;
  registerField: (key: string) => (e: LayoutChangeEvent) => void;
  t: (key: string) => string;
}) {
  const isNearMiss = form.type === 'nearmiss';

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('incidents.step2Title')}</Text>

      {isNearMiss ? (
        <View style={s.nearMissNote}>
          <Info size={18} color={theme.colors.inkSoft} strokeWidth={1.5} />
          <Text style={s.nearMissNoteText}>
            {t('incidents.nearMissNoteShort')}
          </Text>
        </View>
      ) : (
        <>
          <FloatingLabelInput
            label={t('incidents.fieldInjuredName')}
            value={form.injuredName}
            onChangeText={v => setForm(f => ({ ...f, injuredName: v }))}
          />

          <FloatingLabelInput
            label={t('incidents.fieldInjuredRole')}
            value={form.injuredRole}
            onChangeText={v => setForm(f => ({ ...f, injuredRole: v }))}
          />
        </>
      )}

      <DateTimeField
        label={t('incidents.fieldDateTime')}
        value={form.dateTime}
        onChange={d => setForm(f => ({ ...f, dateTime: d }))}
        mode="datetime"
        maxDate={new Date()}
      />

      {/* Location */}
      <View onLayout={registerField('location')}>
        <FloatingLabelInput
          label={t('incidents.fieldLocationExact')}
          required
          value={form.location}
          onChangeText={v => setForm(f => ({ ...f, location: v }))}
          error={attempted && !form.location.trim() ? t('errors.requiredField') : undefined}
        />
      </View>
    </View>
  );
}

// ─── Step 3 - description ─────────────────────────────────────────────────────

function Step3({
  form, setForm, theme, s, attempted, registerField,
  witnessInput, setWitnessInput, onAddWitness, onRemoveWitness,
  onAddPhoto, onRemovePhoto, t,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  theme: any;
  s: ReturnType<typeof makeStyles>;
  attempted: boolean;
  registerField: (key: string) => (e: LayoutChangeEvent) => void;
  witnessInput: string;
  setWitnessInput: (v: string) => void;
  onAddWitness: () => void;
  onRemoveWitness: (i: number) => void;
  onAddPhoto: () => void;
  onRemovePhoto: (i: number) => void;
  t: (key: string) => string;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('incidents.step3Title')}</Text>

      <View onLayout={registerField('description')}>
        <FloatingLabelInput
          label={t('incidents.fieldWhatHappened')}
          required
          value={form.description}
          onChangeText={v => setForm(f => ({ ...f, description: v }))}
          error={attempted && !form.description.trim() ? t('errors.requiredField') : undefined}
          multiline
          numberOfLines={4}
        />
      </View>

      <View onLayout={registerField('cause')}>
        <FloatingLabelInput
          label={t('incidents.fieldProbableCause')}
          required
          value={form.cause}
          onChangeText={v => setForm(f => ({ ...f, cause: v }))}
          error={attempted && !form.cause.trim() ? t('errors.requiredField') : undefined}
          multiline
          numberOfLines={3}
        />
      </View>

      <FloatingLabelInput
        label={t('incidents.fieldActionsTaken')}
        value={form.actionsTaken}
        onChangeText={v => setForm(f => ({ ...f, actionsTaken: v }))}
        multiline
        numberOfLines={3}
      />

      {/* Witnesses */}
      <View style={{ gap: 8 }}>
        <Text style={s.fieldLabel}>{t('incidents.sectionWitnesses')}</Text>
        {form.witnesses.map((w, i) => (
          <View key={`${i}-${w}`} style={s.witnessRow}>
            <User size={15} color={theme.colors.inkSoft} strokeWidth={1.5} />
            <Text style={s.witnessName}>{w}</Text>
            <Pressable onPress={() => onRemoveWitness(i)} hitSlop={12}>
              <CircleX size={18} color={theme.colors.danger} strokeWidth={1.5} />
            </Pressable>
          </View>
        ))}
        <View style={s.witnessInputRow}>
          <View style={{ flex: 1 }}>
            <FloatingLabelInput
              label={t('incidents.fieldWitnessName')}
              value={witnessInput}
              onChangeText={setWitnessInput}
              onSubmitEditing={onAddWitness}
              returnKeyType="done"
              style={{ marginBottom: 0 }}
            />
          </View>
          <IconButton
            icon={Plus}
            onPress={onAddWitness}
            a11yLabel={t('incidents.addWitnessA11y')}
            variant="outline"
            shape="square"
            size="xl"
          />
        </View>
      </View>

      {/* Photos */}
      <View style={{ gap: 8 }}>
        <Text style={s.fieldLabel}>{t('incidents.sectionPhotos')}</Text>
        {form.photos.length > 0 && (
          <View style={s.photoGrid}>
            {form.photos.map((photo, i) => (
              <View key={`${i}-${photo.uri}`} style={s.photoThumb}>
                <Image
                  source={{ uri: photo.uri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={200}
                />
                <Pressable
                  onPress={() => onRemovePhoto(i)}
                  style={s.photoRemoveBtn}
                  hitSlop={12}
                >
                  <CircleX size={20} color={theme.colors.white} strokeWidth={1.5} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <Pressable onPress={onAddPhoto} style={s.addPhotoBtn}>
          <Camera size={18} color={theme.colors.accent} strokeWidth={1.5} />
          <Text style={s.addPhotoBtnText}>{t('incidents.addPhoto')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Step 4 - summary + sign ──────────────────────────────────────────────────

function Step4({
  form, inspectorName, sigPath, project, theme, isDark, s, t,
}: {
  form: FormData;
  inspectorName: string;
  sigPath: string | null;
  project: Project | null;
  theme: any;
  isDark: boolean;
  s: ReturnType<typeof makeStyles>;
  t: (key: string) => string;
}) {
  const [sigDisplayUrl, setSigDisplayUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sigPath) return;
    imageForDisplay(STORAGE_BUCKETS.signatures, sigPath)
      .then(setSigDisplayUrl)
      .catch(() => null);
  }, [sigPath]);

  const badge = form.type ? incidentColors(isDark)[form.type] : null;

  return (
    <View style={{ gap: 12 }}>
      <Text style={s.stepTitle}>{t('incidents.step4Title')}</Text>

      {/* Summary card */}
      <View style={s.summaryCard}>
        {form.type && badge && (
          <View style={s.summaryBadge}>
            <View style={[s.summaryBadgeDot, { backgroundColor: badge.border }]} />
            <Text style={s.summaryBadgeText}>
              {INCIDENT_TYPE_FULL_LABEL[form.type]}
            </Text>
          </View>
        )}

        <SummaryRow
          label={t('common.project')}
          value={project?.name ?? '-'}
          theme={theme}
          s={s}
        />
        {form.type !== 'nearmiss' && form.injuredName ? (
          <SummaryRow
            label={t('incidents.summaryInjured')}
            value={`${form.injuredName}${form.injuredRole ? ` - ${form.injuredRole}` : ''}`}
            theme={theme}
            s={s}
          />
        ) : null}
        <SummaryRow
          label={t('common.date')}
          value={formatShortDateTime(form.dateTime.toISOString())}
          theme={theme}
          s={s}
        />
        <SummaryRow
          label={t('incidents.fieldLocation')}
          value={form.location || '-'}
          theme={theme}
          s={s}
        />
        {form.witnesses.length > 0 && (
          <SummaryRow
            label={t('incidents.sectionWitnesses')}
            value={form.witnesses.join(', ')}
            theme={theme}
            s={s}
          />
        )}
        {form.photos.length > 0 && (
          <SummaryRow
            label={t('incidents.summaryPhotos')}
            value={`${form.photos.length} ${t('incidents.photosUnit')}`}
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
            <Pencil size={20} color={theme.colors.inkFaint} strokeWidth={1.5} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.inspectorName}>{inspectorName || t('incidents.specialistFallback')}</Text>
          <Text style={s.inspectorRole}>{t('incidents.inspectorRole')}</Text>
        </View>
        <View style={s.signedChip}>
          <Check size={13} color={theme.colors.semantic.success} strokeWidth={1.5} />
          <Text style={s.signedChipText}>{t('incidents.signedChip')}</Text>
        </View>
      </View>

      {(form.type === 'severe' || form.type === 'fatal') && (
        <View style={s.warningBanner}>
          <TriangleAlert size={18} color={theme.colors.danger} strokeWidth={1.5} />
          <Text style={s.warningBannerText}>
            {t('incidents.labourNoticeWarning')}
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

    // leading severity dot for the type-card Selector
    typeCardDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
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

    // inline required-field error (custom controls without an `error` prop)
    requiredError: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.danger,
      marginTop: 2,
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.subtleSurface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 4,
    },
    summaryBadgeDot: {
      width: 9,
      height: 9,
      borderRadius: 4.5,
    },
    summaryBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.ink,
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
      paddingTop: 12,
      paddingHorizontal: 16,
    },

  });
}
