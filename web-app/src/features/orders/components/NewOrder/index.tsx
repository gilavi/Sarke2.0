import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { WizardShell } from '@/components/ui/wizard-shell';
import {
  createOrder,
  type OrderDocumentType,
  type FireSafetyOrderFormData,
  type FireSafetyOrderEnterpriseFormData,
  type LaborSafetyOrderFormData,
  type AlcoholControlOrderFormData,
} from '@/lib/data/orders';
import { getProject, listProjects } from '@/lib/data/projects';
import { projectKeys } from '@/app/queryKeys';
import {
  buildFireSafetyOrderHtml,
  buildFireSafetyOrderEnterpriseHtml,
  buildLaborSafetyOrderHtml,
  buildAlcoholControlOrderHtml,
} from '@/lib/orderPdf';
import { type Form, INITIAL_FORM, getStepLabels, isFireSafetyVariant } from './types';
import { buildFormDataFrom, type SaveVars } from './formData';
import { Step1DocType } from './Step1DocType';
import { Step2Company } from './Step2Company';
import {
  Step3LaborSafety,
  Step3AlcoholControl,
  Step3FireSafety,
  Step3FireSafetyEnterprise,
} from './Step3Specifics';
import { StepSignDirector, StepSignAppointed } from './StepSignature';
import StepSummary from './StepSummary';

export default function NewOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledProjectId = searchParams.get('project') ?? '';
  const [selectedProjectId, setSelectedProjectId] = useState(prefilledProjectId);
  const projectId = selectedProjectId;

  const { data: projects } = useQuery({
    queryKey: projectKeys.lists(),
    queryFn: listProjects,
    enabled: !prefilledProjectId,
  });

  const [step, setStep] = useState(0);
  const [docType, setDocType] = useState<OrderDocumentType | null>(null);
  const [form, setForm] = useState<Form>(INITIAL_FORM);
  const [signingDirector, setSigningDirector] = useState(false);
  const [signingAppointed, setSigningAppointed] = useState(false);

  // Pre-opened window ref — opened synchronously on user click to avoid popup blocker
  const pdfWinRef = useRef<Window | null>(null);

  // Auto-fill from project
  useEffect(() => {
    if (!projectId) return;
    getProject(projectId).then(p => {
      if (!p) return;
      setForm(f => ({
        ...f,
        companyName: p.company_name || p.name,
        legalAddress: p.address ?? '',
        facilityName: p.company_name || p.name,
        objectName: p.name,
        objectAddress: p.address ?? '',
      }));
    }).catch(() => null);
  }, [projectId]);

  const steps = getStepLabels(docType);
  const totalSteps = steps.length;

  const canAdvance = useMemo((): boolean => {
    if (step === 0) return docType !== null && projectId.length > 0;
    if (step === 1) return (
      form.orderNumber.trim().length > 0 &&
      form.city.trim().length > 0 &&
      form.companyName.trim().length > 0 &&
      form.directorName.trim().length > 0
    );
    if (step === 2) {
      if (docType === 'labor_safety_specialist') return (
        form.facilityName.trim().length > 0 &&
        form.specialistName.trim().length > 0 &&
        form.certificateNumber.trim().length > 0
      );
      if (docType === 'alcohol_control') return (
        form.facilityName.trim().length > 0 &&
        form.responsiblePersonName.trim().length > 0 &&
        form.responsiblePersonPosition.trim().length > 0
      );
      if (docType === 'fire_safety_order') return (
        form.appointedName.trim().length > 0 &&
        form.appointedPhone.trim().length > 0 &&
        form.objectName.trim().length > 0
      );
      if (docType === 'fire_safety_order_enterprise') return (
        form.appointedName.trim().length > 0 &&
        form.appointedPhone.trim().length > 0 &&
        form.appointedPosition.trim().length > 0 &&
        form.appointedIdNumber.trim().length > 0 &&
        form.objectName.trim().length > 0
      );
    }
    if (step === 3 && isFireSafetyVariant(docType)) return !!form.directorSignature;
    if (step === 4 && isFireSafetyVariant(docType)) return !!form.appointedSignature;
    return true;
  }, [step, form, docType, projectId]);

  // ── save & PDF ──────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async ({ asDraft, pid, dt, formData }: SaveVars) => {
      await createOrder({
        projectId: pid,
        documentType: dt,
        formData,
        status: asDraft ? 'draft' : 'completed',
      });
    },
    onSuccess: (_v, { asDraft, html, destProjectId }) => {
      if (!asDraft && pdfWinRef.current) {
        pdfWinRef.current.document.write(html);
        pdfWinRef.current.document.close();
        pdfWinRef.current = null;
      }
      toast.success(asDraft ? 'ბრძანება შენახულია' : 'ბრძანება შექმნილია');
      navigate(destProjectId ? `/projects/${destProjectId}` : '/');
    },
    onError: (e) => {
      pdfWinRef.current?.close();
      pdfWinRef.current = null;
      toast.error(e instanceof Error ? e.message : 'შეცდომა');
    },
  });

  // ── helpers ─────────────────────────────────────────────────────────────────

  function setField(key: keyof Form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function buildHtml(): string {
    const fd = buildFormDataFrom(docType, form);
    if (docType === 'fire_safety_order') return buildFireSafetyOrderHtml(fd as FireSafetyOrderFormData);
    if (docType === 'fire_safety_order_enterprise') return buildFireSafetyOrderEnterpriseHtml(fd as FireSafetyOrderEnterpriseFormData);
    if (docType === 'alcohol_control') return buildAlcoholControlOrderHtml(fd as AlcoholControlOrderFormData);
    return buildLaborSafetyOrderHtml(fd as LaborSafetyOrderFormData);
  }

  const isFinal = step === totalSteps - 1;

  function makeVars(asDraft: boolean): SaveVars | null {
    if (!docType || !projectId) return null;
    return {
      asDraft,
      pid: projectId,
      dt: docType,
      formData: buildFormDataFrom(docType, form),
      html: buildHtml(),
      destProjectId: projectId,
    };
  }

  function handleFinish() {
    const vars = makeVars(false);
    if (!vars) { toast.error('პროექტი ან ბრძანების ტიპი არ არის მითითებული'); return; }
    pdfWinRef.current = window.open('', '_blank', 'noopener,noreferrer');
    saveMutation.mutate(vars);
  }

  function handleSaveDraft() {
    const vars = makeVars(true);
    if (!vars) { toast.error('პროექტი ან ბრძანების ტიპი არ არის მითითებული'); return; }
    saveMutation.mutate(vars);
  }

  return (
    <WizardShell
      open
      onClose={() => navigate(projectId ? `/projects/${projectId}` : '/')}
      title="ახალი ბრძანება"
      steps={steps}
      currentStep={step}
      onPrev={() => setStep(s => s - 1)}
      onNext={() => setStep(s => s + 1)}
      onFinish={handleFinish}
      isSubmitting={saveMutation.isPending}
      nextDisabled={!canAdvance}
      finishLabel="PDF გენერირება"
    >
      {step === 0 && (
        <Step1DocType
          docType={docType}
          setDocType={setDocType}
          prefilledProjectId={prefilledProjectId}
          projects={projects ?? []}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
        />
      )}
      {step === 1 && (
        <Step2Company form={form} setField={setField} />
      )}
      {step === 2 && docType === 'labor_safety_specialist' && (
        <Step3LaborSafety form={form} setField={setField} />
      )}
      {step === 2 && docType === 'alcohol_control' && (
        <Step3AlcoholControl form={form} setField={setField} />
      )}
      {step === 2 && docType === 'fire_safety_order' && (
        <Step3FireSafety form={form} setField={setField} />
      )}
      {step === 2 && docType === 'fire_safety_order_enterprise' && (
        <Step3FireSafetyEnterprise form={form} setField={setField} />
      )}
      {step === 3 && isFireSafetyVariant(docType) && (
        <StepSignDirector
          form={form}
          signingOpen={signingDirector}
          setSigningOpen={setSigningDirector}
          onSave={(dataUrl) => {
            const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
            setForm(f => ({ ...f, directorSignature: b64, directorSignedAt: new Date().toISOString() }));
            setSigningDirector(false);
          }}
          onClear={() => setForm(f => ({ ...f, directorSignature: null, directorSignedAt: null }))}
        />
      )}
      {step === 4 && isFireSafetyVariant(docType) && (
        <StepSignAppointed
          form={form}
          signingOpen={signingAppointed}
          setSigningOpen={setSigningAppointed}
          onSave={(dataUrl) => {
            const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
            setForm(f => ({ ...f, appointedSignature: b64, appointedSignedAt: new Date().toISOString() }));
            setSigningAppointed(false);
          }}
          onClear={() => setForm(f => ({ ...f, appointedSignature: null, appointedSignedAt: null }))}
        />
      )}
      {isFinal && (
        <StepSummary
          form={form}
          docType={docType}
          onSaveDraft={handleSaveDraft}
          isPending={saveMutation.isPending}
        />
      )}
    </WizardShell>
  );
}
