// useActResult — shared data + actions for the inspection-act result screens.
//
// Both the act SUCCESS screen (/inspections/[id]/done → FlowSuccessScreen) and
// the act DETAILS screen (/inspections/[id] → DocumentDetails) need the same
// thing: load the inspection + template + project + questions + answers +
// attachments, hold the editable (never-persisted) signature state, build +
// share the act PDF, and manage the certificate sub-screen. This hook owns all
// of it so the two screens stay thin and never drift. See AGENTS.md.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { consumeCertsDirty } from '../../lib/certDirty';
import { useSignaturesState } from '../../features/signatures';
import type { SignaturesSectionData } from '../../lib/pdf/inspection';
import type { SuccessCertificateItem } from '../../components/success';
import {
  answersApi,
  inspectionAttachmentsApi,
  inspectionsApi,
  projectsApi,
  templatesApi,
} from '../../lib/services';
import {
  useInspection,
  useProject,
  useTemplate,
  useTemplateQuestions,
  useInspectionAnswers,
} from '../../lib/apiHooks';
import { PdfLimitReachedError } from '../../lib/pdfOpen';
import { usePdfUsage, useInvalidatePdfUsage } from '../../lib/usePdfUsage';
import { useSession } from '../../lib/session';
import { useToast } from '../../lib/toast';
import { recordRedirect, isOscillating } from '../../lib/navigationGuard';
import { reopenDocument } from '../../lib/documents/reopen';
import { routeForInspection } from '../../lib/inspectionRouting';
import { friendlyError } from '../../lib/errorMap';
import { haptic } from '../../lib/haptics';
import { shareActPdf } from './shareActPdf';
import type {
  Answer,
  AnswerPhoto,
  Inspection,
  InspectionAttachment,
  Project,
  Question,
  Template,
} from '../../types/models';

export function useActResult(id: string | undefined) {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const queryClient = useQueryClient();
  const mountedRef = useRef(true);

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [photosByAnswer, setPhotosByAnswer] = useState<Record<string, AnswerPhoto[]>>({});
  const [attachments, setAttachments] = useState<InspectionAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false);
  const [redirectBlocked, setRedirectBlocked] = useState(false);
  const [reopening, setReopening] = useState(false);
  const { data: pdfUsage } = usePdfUsage();
  const invalidatePdfUsage = useInvalidatePdfUsage();

  // Captured signatures live ONLY here and die on unmount — never persisted.
  const signatures = useSignaturesState();
  const creatorName = useMemo(() => {
    if (session.state.status !== 'signedIn') return '';
    const u = session.state.user;
    if (!u) return '';
    return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
  }, [session.state]);

  // Cached data seeds instantly; loadAll fills nested photo/attachment data.
  const inspectionQ = useInspection(id);
  const projectQ = useProject(inspection?.project_id);
  const templateQ = useTemplate(inspection?.template_id);
  const questionsQ = useTemplateQuestions(inspection?.template_id);
  const answersQ = useInspectionAnswers(id);
  useEffect(() => { if (inspectionQ.data !== undefined) setInspection(inspectionQ.data); }, [inspectionQ.data]);
  useEffect(() => { if (projectQ.data !== undefined) setProject(projectQ.data); }, [projectQ.data]);
  useEffect(() => { if (templateQ.data !== undefined) setTemplate(templateQ.data); }, [templateQ.data]);
  useEffect(() => { if (questionsQ.data !== undefined) setQuestions(questionsQ.data); }, [questionsQ.data]);
  useEffect(() => { if (answersQ.data !== undefined) setAnswers(answersQ.data); }, [answersQ.data]);

  const loadAll = useCallback(async () => {
    if (!id) { if (mountedRef.current) setLoading(false); return; }
    if (mountedRef.current) { setLoading(true); setLoadError(null); setNotFound(false); }
    try {
      const insp = await inspectionsApi.getById(id);
      if (!insp) { if (mountedRef.current) setNotFound(true); return; }
      if (mountedRef.current) setInspection(insp);
      if (insp.status === 'draft' && !redirectBlocked) {
        const tpl = await templatesApi.getById(insp.template_id).catch(() => null);
        const target = routeForInspection(tpl?.category, insp.id, false).replace('/inspections/', '');
        if (isOscillating('detail', target)) {
          if (mountedRef.current) setRedirectBlocked(true);
        } else {
          recordRedirect('detail', target);
          router.replace(`/inspections/${target}` as never);
          return;
        }
      }
      const [tpl, proj, atts] = await Promise.all([
        templatesApi.getById(insp.template_id).catch(() => null),
        projectsApi.getById(insp.project_id).catch(() => null),
        inspectionAttachmentsApi.listByInspection(insp.id).catch(() => [] as InspectionAttachment[]),
      ]);
      if (mountedRef.current) { setTemplate(tpl); setProject(proj); setAttachments(atts); }
      if (tpl && mountedRef.current) {
        const [qs, ans] = await Promise.all([
          templatesApi.questions(tpl.id).catch(() => [] as Question[]),
          answersApi.list(insp.id).catch(() => [] as Answer[]),
        ]);
        if (mountedRef.current) { setQuestions(qs); setAnswers(ans); }
        if (ans.length > 0 && mountedRef.current) {
          const photoMap = await answersApi
            .photosByAnswerIds(ans.map((a) => a.id))
            .catch(() => ({} as Record<string, AnswerPhoto[]>));
          if (mountedRef.current) setPhotosByAnswer(photoMap);
        }
      }
    } catch (e) {
      if (mountedRef.current) setLoadError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id, router, redirectBlocked]);

  useEffect(() => {
    mountedRef.current = true;
    void loadAll();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const buildSignaturesSection = useCallback((): SignaturesSectionData | null => {
    const creator = signatures.creatorSignature;
    const rowCount = signatures.additionalRows.length;
    if (!creator && rowCount === 0) return null;
    return {
      creatorSignature: creator
        ? { pngBase64: creator.pngBase64, capturedAtIso: creator.capturedAt.toISOString(), creatorName }
        : null,
      additionalRowsCount: rowCount,
    };
  }, [signatures.creatorSignature, signatures.additionalRows.length, creatorName]);

  // Certificates is a pushed screen; refetch on return when marked dirty.
  const refreshAttachments = useCallback(async () => {
    if (!inspection) return;
    const atts = await inspectionAttachmentsApi.listByInspection(inspection.id).catch(() => attachments);
    if (mountedRef.current) setAttachments(atts);
  }, [inspection, attachments]);

  const openCertificatesSheet = useCallback(() => {
    if (!inspection) return;
    router.push(`/inspections/${inspection.id}/certificates` as never);
  }, [inspection, router]);

  const certFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (certFirstFocus.current) { certFirstFocus.current = false; return; }
      if (inspection && consumeCertsDirty(inspection.id)) void refreshAttachments();
    }, [inspection, refreshAttachments]),
  );

  const downloadPdf = useCallback(async () => {
    if (!inspection || !template || !project || downloading) return;
    if (pdfUsage?.isLocked) { setLimitNoticeVisible(true); return; }
    setDownloading(true);
    try {
      const userId = session.state.status === 'signedIn' ? session.state.session.user.id : undefined;
      const authorName = session.state.status === 'signedIn'
        ? `${session.state.user?.first_name ?? ''} ${session.state.user?.last_name ?? ''}`.trim()
        : '';
      await shareActPdf({
        inspection, template, project, questions, answers,
        photosByAnswer, attachments,
        signaturesSession: buildSignaturesSection(),
        userId, authorName,
        timeoutMessage: t('inspections.pdfGenerateTooLong'),
      });
      haptic.pdfGenerated();
      invalidatePdfUsage();
    } catch (e) {
      if (e instanceof PdfLimitReachedError) { haptic.warn(); setLimitNoticeVisible(true); return; }
      haptic.error();
      toast.error(friendlyError(e, t('inspections.pdfGenerateFailed')));
    } finally {
      setDownloading(false);
    }
  }, [
    inspection, template, project, questions, answers, attachments, photosByAnswer,
    downloading, pdfUsage, invalidatePdfUsage, buildSignaturesSection, session, toast, t,
  ]);

  const onEdit = useCallback(async () => {
    if (!inspection || reopening) return;
    setReopening(true);
    try {
      haptic.medium();
      await reopenDocument({ kind: 'genericInspection', id: inspection.id }, queryClient);
      router.replace(routeForInspection(template?.category, inspection.id, false) as never);
    } catch (e) {
      toast.error(friendlyError(e, t('inspections.editFailed')));
      setReopening(false);
    }
  }, [inspection, reopening, queryClient, router, toast, t, template?.category]);

  const certItems: SuccessCertificateItem[] = attachments.map((a) => ({
    id: a.id,
    title: a.cert_type,
    subtitle: a.cert_number ?? undefined,
  }));

  return {
    inspection, template, project, questions, answers, attachments, certItems,
    signatures, creatorName,
    loading, loadError, notFound, reload: loadAll,
    downloadPdf, downloading, pdfLocked: pdfUsage?.isLocked,
    limitNoticeVisible, setLimitNoticeVisible,
    onEdit, reopening,
    openCertificatesSheet,
  };
}
