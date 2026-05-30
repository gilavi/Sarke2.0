import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  getInspection,
  listQuestions,
  listAnswers,
  listAllAnswerPhotos,
  type AnswerPhoto,
} from '@/lib/data/inspections';
import { getProject } from '@/lib/data/projects';
import { projectKeys, inspectionKeys } from '@/app/queryKeys';
import { getTemplate } from '@/lib/data/templates';
import { signedInspectionPhotoUrl } from '@/lib/photoUpload';
import { buildInspectionPdfTemplate } from '@root/lib/inspectionPdfTemplate';
import type { SignaturesSectionData } from '@root/lib/inspectionPdfTemplate';
import type {
  Inspection as MobileInspection,
  Template as MobileTemplate,
  Project as MobileProject,
  Question as MobileQuestion,
  Answer as MobileAnswer,
} from '@root/types/models';

export default function InspectionPrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';
  // Signature snapshot captured in memory on the detail page and handed over via
  // router state — never persisted (regulatory). Null on direct nav / refresh.
  const location = useLocation();
  const signaturesSession =
    (location.state as { signaturesSession?: SignaturesSectionData } | null)?.signaturesSession ?? null;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const inspQ = useQuery({
    queryKey: inspectionKeys.detail(id),
    queryFn: () => getInspection(id!),
    enabled: !!id,
  });
  const projQ = useQuery({
    queryKey: projectKeys.detail(inspQ.data?.project_id),
    queryFn: () => getProject(inspQ.data!.project_id),
    enabled: !!inspQ.data?.project_id,
  });
  const tplQ = useQuery({
    queryKey: ['template', inspQ.data?.template_id],
    queryFn: () => getTemplate(inspQ.data!.template_id),
    enabled: !!inspQ.data?.template_id,
  });
  const questionsQ = useQuery({
    queryKey: inspectionKeys.questions(inspQ.data?.template_id),
    queryFn: () => listQuestions(inspQ.data!.template_id),
    enabled: !!inspQ.data?.template_id,
  });
  const answersQ = useQuery({
    queryKey: inspectionKeys.answers(id),
    queryFn: () => listAnswers(id!),
    enabled: !!id,
  });

  // Batch-fetch and sign all answer photos
  const [photosByAnswer, setPhotosByAnswer] = useState<Record<string, AnswerPhoto[]>>({});
  const [photosReady, setPhotosReady] = useState(false);

  useEffect(() => {
    if (!answersQ.data) return;
    const answerIds = answersQ.data.map(a => a.id);
    if (!answerIds.length) { setPhotosReady(true); return; }

    listAllAnswerPhotos(answerIds)
      .then(async rawByAnswer => {
        // Sign every storage_path so the iframe can load images over HTTPS
        const signed: Record<string, AnswerPhoto[]> = {};
        await Promise.all(
          Object.entries(rawByAnswer).map(async ([answerId, photos]) => {
            signed[answerId] = await Promise.all(
              photos.map(async p => {
                try {
                  const url = await signedInspectionPhotoUrl(p.storage_path);
                  return { ...p, storage_path: url };
                } catch {
                  return p;
                }
              }),
            );
          }),
        );
        setPhotosByAnswer(signed);
        setPhotosReady(true);
      })
      .catch(() => setPhotosReady(true));
  }, [answersQ.data]);

  const ready =
    inspQ.isSuccess &&
    projQ.isSuccess &&
    tplQ.isSuccess &&
    questionsQ.isSuccess &&
    answersQ.isSuccess &&
    photosReady;

  if (inspQ.isLoading) {
    return <p style={{ padding: 24 }}>იტვირთება…</p>;
  }
  if (!inspQ.data) {
    return <p style={{ padding: 24 }}>აქტი ვერ მოიძებნა.</p>;
  }
  if (!ready) {
    return <p style={{ padding: 24 }}>იტვირთება…</p>;
  }

  const inspection = inspQ.data;
  const project = projQ.data!;
  const template = tplQ.data;
  const questions = questionsQ.data ?? [];
  const answers = answersQ.data ?? [];

  // Build a fallback template object when the DB row couldn't be fetched
  // (edge case: template deleted after inspection was created).
  const tpl: MobileTemplate = template
    ? (template as unknown as MobileTemplate)
    : {
        id: inspection.template_id,
        owner_id: null,
        name: 'შემოწმების აქტი',
        category: (inspection as any).template?.[0]?.category ?? null,
        is_system: false,
        required_qualifications: [],
        required_signer_roles: [],
      };

  const html = buildInspectionPdfTemplate({
    questionnaire: inspection as unknown as MobileInspection,
    template: tpl,
    signaturesSession,
    project: project as unknown as MobileProject,
    questions: questions as unknown as MobileQuestion[],
    answers: answers as unknown as MobileAnswer[],
    photosByAnswer: photosByAnswer as any,
    mode: 'pdf',
  });

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, background: '#FAFAFA',
        borderBottom: '1px solid #E5E7EB', padding: '10px 16px',
        display: 'flex', gap: 8, justifyContent: 'flex-end', zIndex: 10,
      }}>
        <button
          onClick={() => window.history.back()}
          style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid #D1D5DB', background: '#fff' }}
        >
          დახურვა
        </button>
        <button
          onClick={() => iframeRef.current?.contentWindow?.print()}
          style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid #2F855A', background: '#2F855A', color: '#fff' }}
        >
          ბეჭდვა
        </button>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={{ width: '100%', height: 'calc(100vh - 53px)', border: 'none', display: 'block' }}
        title="შემოწმების აქტი"
        onLoad={() => { if (!isPreview) iframeRef.current?.contentWindow?.print(); }}
      />
    </>
  );
}
