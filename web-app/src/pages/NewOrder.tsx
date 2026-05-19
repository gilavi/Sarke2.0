import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Flame, Shield, Ban, Pencil, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WizardShell } from '@/components/ui/wizard-shell';
import SignatureCanvas from '@/components/SignatureCanvas';
import {
  createOrder,
  ORDER_DOCUMENT_TYPE_LABEL,
  type OrderDocumentType,
  type FireSafetyOrderFormData,
  type FireSafetyOrderEnterpriseFormData,
  type LaborSafetyOrderFormData,
  type AlcoholControlOrderFormData,
} from '@/lib/data/orders';
import { getProject, listProjects } from '@/lib/data/projects';
import { Select } from '@/components/ui/select';
import {
  buildFireSafetyOrderHtml,
  buildFireSafetyOrderEnterpriseHtml,
  buildLaborSafetyOrderHtml,
  buildAlcoholControlOrderHtml,
} from '@/lib/orderPdf';

// ── form state ─────────────────────────────────────────────────────────────────

interface Form {
  orderNumber: string;
  city: string;
  orderDate: string;
  companyName: string;
  identificationCode: string;
  legalAddress: string;
  directorName: string;
  // labor_safety
  facilityName: string;
  specialistName: string;
  specialistPersonalId: string;
  certificateNumber: string;
  certificateDate: string;
  // alcohol_control
  responsiblePersonName: string;
  responsiblePersonPosition: string;
  responsiblePersonPersonalId: string;
  // fire_safety_order
  appointedName: string;
  appointedPhone: string;
  objectName: string;
  objectAddress: string;
  // fire_safety_order_enterprise extras
  appointedPosition: string;
  appointedIdNumber: string;
  directorSignature: string | null;
  directorSignedAt: string | null;
  appointedSignature: string | null;
  appointedSignedAt: string | null;
}

const today = new Date().toISOString().split('T')[0];

const INITIAL_FORM: Form = {
  orderNumber: '',
  city: '',
  orderDate: today,
  companyName: '',
  identificationCode: '',
  legalAddress: '',
  directorName: '',
  facilityName: '',
  specialistName: '',
  specialistPersonalId: '',
  certificateNumber: '',
  certificateDate: today,
  responsiblePersonName: '',
  responsiblePersonPosition: '',
  responsiblePersonPersonalId: '',
  appointedName: '',
  appointedPhone: '',
  objectName: '',
  objectAddress: '',
  appointedPosition: '',
  appointedIdNumber: '',
  directorSignature: null,
  directorSignedAt: null,
  appointedSignature: null,
  appointedSignedAt: null,
};

const DOC_TYPE_OPTIONS: { type: OrderDocumentType; icon: React.ReactNode; label: string }[] = [
  { type: 'labor_safety_specialist',      icon: <Shield size={20} />, label: ORDER_DOCUMENT_TYPE_LABEL.labor_safety_specialist },
  { type: 'alcohol_control',              icon: <Ban size={20} />,    label: ORDER_DOCUMENT_TYPE_LABEL.alcohol_control },
  { type: 'fire_safety_order',            icon: <Flame size={20} />,  label: ORDER_DOCUMENT_TYPE_LABEL.fire_safety_order },
  { type: 'fire_safety_order_enterprise', icon: <Flame size={20} />,  label: ORDER_DOCUMENT_TYPE_LABEL.fire_safety_order_enterprise },
];

function isFireSafetyVariant(docType: OrderDocumentType | null): boolean {
  return docType === 'fire_safety_order' || docType === 'fire_safety_order_enterprise';
}

function getStepLabels(docType: OrderDocumentType | null): string[] {
  const base = ['ტიპი', 'კომპანია', 'სპეციფიკა'];
  if (isFireSafetyVariant(docType)) return [...base, 'დირექტ. ხელმ.', 'პასუხ. ხელმ.', 'შეჯამება'];
  return [...base, 'შეჯამება'];
}

// ── component ──────────────────────────────────────────────────────────────────

export default function NewOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledProjectId = searchParams.get('project') ?? '';
  const [selectedProjectId, setSelectedProjectId] = useState(prefilledProjectId);
  const projectId = selectedProjectId;

  // Load projects list when no project was pre-filled (direct navigation to /orders/new)
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
    enabled: !prefilledProjectId,
  });

  // 0-indexed step
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

  // ── save & PDF ───────────────────────────────────────────────────────────────

  interface SaveVars {
    asDraft: boolean;
    pid: string;
    dt: OrderDocumentType;
    formData: ReturnType<typeof buildFormData>;
    html: string;
    destProjectId: string;
  }

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

  // ── form builders ────────────────────────────────────────────────────────────

  function buildFormData(): FireSafetyOrderFormData | FireSafetyOrderEnterpriseFormData | LaborSafetyOrderFormData | AlcoholControlOrderFormData {
    const base = {
      orderNumber: form.orderNumber,
      city: form.city,
      orderDate: new Date(form.orderDate).toISOString(),
      companyName: form.companyName,
      identificationCode: form.identificationCode,
      legalAddress: form.legalAddress,
      directorName: form.directorName,
    };
    if (docType === 'fire_safety_order') {
      return {
        ...base,
        appointedName: form.appointedName,
        appointedPhone: form.appointedPhone,
        objectName: form.objectName,
        objectAddress: form.objectAddress,
        directorSignature: form.directorSignature,
        directorSignedAt: form.directorSignedAt,
        appointedSignature: form.appointedSignature,
        appointedSignedAt: form.appointedSignedAt,
      };
    }
    if (docType === 'fire_safety_order_enterprise') {
      return {
        ...base,
        appointedName: form.appointedName,
        appointedPhone: form.appointedPhone,
        appointedPosition: form.appointedPosition,
        appointedIdNumber: form.appointedIdNumber,
        objectName: form.objectName,
        objectAddress: form.objectAddress,
        directorSignature: form.directorSignature,
        directorSignedAt: form.directorSignedAt,
        appointedSignature: form.appointedSignature,
        appointedSignedAt: form.appointedSignedAt,
      };
    }
    if (docType === 'alcohol_control') {
      return {
        ...base,
        facilityName: form.facilityName,
        responsiblePersonName: form.responsiblePersonName,
        responsiblePersonPosition: form.responsiblePersonPosition,
        responsiblePersonPersonalId: form.responsiblePersonPersonalId,
      };
    }
    return {
      ...base,
      facilityName: form.facilityName,
      specialistName: form.specialistName,
      specialistPersonalId: form.specialistPersonalId,
      certificateNumber: form.certificateNumber,
      certificateDate: new Date(form.certificateDate).toISOString(),
    };
  }

  function buildHtml(): string {
    if (docType === 'fire_safety_order') return buildFireSafetyOrderHtml(buildFormData() as FireSafetyOrderFormData);
    if (docType === 'fire_safety_order_enterprise') return buildFireSafetyOrderEnterpriseHtml(buildFormData() as FireSafetyOrderEnterpriseFormData);
    if (docType === 'alcohol_control') return buildAlcoholControlOrderHtml(buildFormData() as AlcoholControlOrderFormData);
    return buildLaborSafetyOrderHtml(buildFormData() as LaborSafetyOrderFormData);
  }

  // ── field setter ─────────────────────────────────────────────────────────────

  function setField(key: keyof Form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  const isFinal = step === totalSteps - 1;

  function makeVars(asDraft: boolean): SaveVars | null {
    if (!docType || !projectId) return null;
    const formData = buildFormData();
    return {
      asDraft,
      pid: projectId,
      dt: docType,
      formData,
      html: buildHtml(),
      destProjectId: projectId,
    };
  }

  function handleFinish() {
    const vars = makeVars(false);
    if (!vars) { toast.error('პროექტი ან ბრძანების ტიპი არ არის მითითებული'); return; }
    // Open window synchronously (user gesture) before going async
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

// ── Step sub-components ────────────────────────────────────────────────────────

function Step1DocType({
  docType,
  setDocType,
  prefilledProjectId,
  projects,
  selectedProjectId,
  setSelectedProjectId,
}: {
  docType: OrderDocumentType | null;
  setDocType: (t: OrderDocumentType) => void;
  prefilledProjectId: string;
  projects: { id: string; name: string }[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {!prefilledProjectId && (
        <Select
          label="პროექტი"
          required
          value={selectedProjectId}
          onChange={setSelectedProjectId}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          placeholder="— აირჩიეთ პროექტი —"
        />
      )}
      <h2 className="text-base font-semibold text-neutral-800">ბრძანების ტიპი</h2>
      {DOC_TYPE_OPTIONS.map(({ type, icon, label }) => {
        const selected = docType === type;
        return (
          <button
            key={type}
            onClick={() => setDocType(type)}
            className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
              selected
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-brand-300 hover:bg-neutral-50'
            }`}
          >
            <span className={selected ? 'text-brand-600' : 'text-neutral-400'}>{icon}</span>
            <span className="flex-1 text-sm font-medium">{label}</span>
            {selected && <span className="text-xs text-brand-600">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-neutral-600">{label}</Label>
      {children}
    </div>
  );
}

function Step2Company({ form, setField }: { form: Form; setField: (k: keyof Form, v: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">ბრძანების ინფო</h2>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="ბრძანების ნომერი *">
          <Input value={form.orderNumber} onChange={e => setField('orderNumber', e.target.value)} placeholder="მაგ. №01/2025" />
        </FieldRow>
        <FieldRow label="ქალაქი *">
          <Input value={form.city} onChange={e => setField('city', e.target.value)} placeholder="თბილისი" />
        </FieldRow>
      </div>
      <FieldRow label="ბრძანების თარიღი">
        <Input type="date" value={form.orderDate} onChange={e => setField('orderDate', e.target.value)} />
      </FieldRow>
      <h2 className="text-sm font-semibold text-neutral-600 pt-1">კომპანიის ინფო</h2>
      <FieldRow label="კომპანიის დასახელება *">
        <Input value={form.companyName} onChange={e => setField('companyName', e.target.value)} placeholder="შპს / სს ..." />
      </FieldRow>
      <FieldRow label="საიდენტიფიკაციო კოდი">
        <Input value={form.identificationCode} onChange={e => setField('identificationCode', e.target.value)} />
      </FieldRow>
      <FieldRow label="იურიდიული მისამართი">
        <Input value={form.legalAddress} onChange={e => setField('legalAddress', e.target.value)} />
      </FieldRow>
      <FieldRow label="დირექტორი (სახელი, გვარი) *">
        <Input value={form.directorName} onChange={e => setField('directorName', e.target.value)} />
      </FieldRow>
    </div>
  );
}

function Step3LaborSafety({ form, setField }: { form: Form; setField: (k: keyof Form, v: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">სპეციალისტი</h2>
      <FieldRow label="ობიექტის სახელი და მისამართი *">
        <Input value={form.facilityName} onChange={e => setField('facilityName', e.target.value)} />
      </FieldRow>
      <FieldRow label="სპეციალისტი (სახელი, გვარი) *">
        <Input value={form.specialistName} onChange={e => setField('specialistName', e.target.value)} />
      </FieldRow>
      <FieldRow label="პირადი ნომერი">
        <Input value={form.specialistPersonalId} onChange={e => setField('specialistPersonalId', e.target.value)} maxLength={11} />
      </FieldRow>
      <FieldRow label="სერტიფიკატის ნომერი *">
        <Input value={form.certificateNumber} onChange={e => setField('certificateNumber', e.target.value)} />
      </FieldRow>
      <FieldRow label="სერტიფიკატის გაცემის თარიღი">
        <Input type="date" value={form.certificateDate} onChange={e => setField('certificateDate', e.target.value)} />
      </FieldRow>
    </div>
  );
}

function Step3AlcoholControl({ form, setField }: { form: Form; setField: (k: keyof Form, v: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">პასუხისმგებელი პირი</h2>
      <FieldRow label="ობიექტის სახელი და მისამართი *">
        <Input value={form.facilityName} onChange={e => setField('facilityName', e.target.value)} />
      </FieldRow>
      <FieldRow label="სახელი, გვარი *">
        <Input value={form.responsiblePersonName} onChange={e => setField('responsiblePersonName', e.target.value)} />
      </FieldRow>
      <FieldRow label="თანამდებობა *">
        <Input value={form.responsiblePersonPosition} onChange={e => setField('responsiblePersonPosition', e.target.value)} />
      </FieldRow>
      <FieldRow label="პირადი ნომერი">
        <Input value={form.responsiblePersonPersonalId} onChange={e => setField('responsiblePersonPersonalId', e.target.value)} maxLength={11} />
      </FieldRow>
    </div>
  );
}

function Step3FireSafety({ form, setField }: { form: Form; setField: (k: keyof Form, v: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">დანიშნული პირი</h2>
      <FieldRow label="სახელი, გვარი *">
        <Input value={form.appointedName} onChange={e => setField('appointedName', e.target.value)} />
      </FieldRow>
      <FieldRow label="ტელეფონის ნომერი *">
        <Input type="tel" value={form.appointedPhone} onChange={e => setField('appointedPhone', e.target.value)} />
      </FieldRow>
      <h2 className="text-sm font-semibold text-neutral-600 pt-1">ობიექტი</h2>
      <FieldRow label="ობიექტის დასახელება *">
        <Input value={form.objectName} onChange={e => setField('objectName', e.target.value)} />
      </FieldRow>
      <FieldRow label="ობიექტის მისამართი">
        <Input value={form.objectAddress} onChange={e => setField('objectAddress', e.target.value)} />
      </FieldRow>
    </div>
  );
}

function Step3FireSafetyEnterprise({ form, setField }: { form: Form; setField: (k: keyof Form, v: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">დანიშნული პირი</h2>
      <FieldRow label="სახელი, გვარი *">
        <Input value={form.appointedName} onChange={e => setField('appointedName', e.target.value)} />
      </FieldRow>
      <FieldRow label="თანამდებობა *">
        <Input value={form.appointedPosition} onChange={e => setField('appointedPosition', e.target.value)} />
      </FieldRow>
      <FieldRow label="პირადი ნომერი *">
        <Input value={form.appointedIdNumber} onChange={e => setField('appointedIdNumber', e.target.value)} maxLength={11} />
      </FieldRow>
      <FieldRow label="ტელეფონის ნომერი *">
        <Input type="tel" value={form.appointedPhone} onChange={e => setField('appointedPhone', e.target.value)} />
      </FieldRow>
      <h2 className="text-sm font-semibold text-neutral-600 pt-1">ობიექტი</h2>
      <FieldRow label="ობიექტის დასახელება *">
        <Input value={form.objectName} onChange={e => setField('objectName', e.target.value)} />
      </FieldRow>
      <FieldRow label="ობიექტის მისამართი">
        <Input value={form.objectAddress} onChange={e => setField('objectAddress', e.target.value)} />
      </FieldRow>
    </div>
  );
}

function StepSignDirector({
  form, signingOpen, setSigningOpen, onSave, onClear,
}: {
  form: Form;
  signingOpen: boolean;
  setSigningOpen: (v: boolean) => void;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">დირექტორის ხელმოწერა</h2>
      <p className="text-sm text-neutral-500">{form.directorName || 'დირექტორი'}</p>
      {form.directorSignature ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <img
            src={`data:image/png;base64,${form.directorSignature}`}
            alt="Director signature"
            className="h-12 rounded border border-neutral-200 bg-white p-1"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">ხელმოწერა დადებულია</p>
            {form.directorSignedAt && (
              <p className="text-xs text-green-600">{new Date(form.directorSignedAt).toLocaleString('ka-GE')}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} className="text-neutral-500">
            <RotateCcw size={14} />
          </Button>
        </div>
      ) : signingOpen ? (
        <SignatureCanvas onSave={onSave} onCancel={() => setSigningOpen(false)} />
      ) : (
        <Button variant="outline" onClick={() => setSigningOpen(true)} className="w-full gap-2">
          <Pencil size={16} />
          + ხელმოწერა
        </Button>
      )}
    </div>
  );
}

function StepSignAppointed({
  form, signingOpen, setSigningOpen, onSave, onClear,
}: {
  form: Form;
  signingOpen: boolean;
  setSigningOpen: (v: boolean) => void;
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">პასუხისმგებელი პირის ხელმოწერა</h2>
      <p className="text-sm text-neutral-500">{form.appointedName || 'დანიშნული პირი'}</p>
      {form.appointedSignature ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <img
            src={`data:image/png;base64,${form.appointedSignature}`}
            alt="Appointed signature"
            className="h-12 rounded border border-neutral-200 bg-white p-1"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">ხელმოწერა დადებულია</p>
            {form.appointedSignedAt && (
              <p className="text-xs text-green-600">{new Date(form.appointedSignedAt).toLocaleString('ka-GE')}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClear} className="text-neutral-500">
            <RotateCcw size={14} />
          </Button>
        </div>
      ) : signingOpen ? (
        <SignatureCanvas onSave={onSave} onCancel={() => setSigningOpen(false)} />
      ) : (
        <Button variant="outline" onClick={() => setSigningOpen(true)} className="w-full gap-2">
          <Pencil size={16} />
          + ხელმოწერა
        </Button>
      )}
    </div>
  );
}

function StepSummary({
  form,
  docType,
  onSaveDraft,
  isPending,
}: {
  form: Form;
  docType: OrderDocumentType | null;
  onSaveDraft: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-neutral-800">შეჯამება</h2>
      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {[
          ['ბრძანება №', form.orderNumber],
          ['ქალაქი', form.city],
          ['თარიღი', form.orderDate],
          ['კომპანია', form.companyName],
          ['დირექტორი', form.directorName],
          ...(docType === 'fire_safety_order' ? [
            ['დანიშნული პირი', form.appointedName],
            ['ტელეფონი', form.appointedPhone],
            ['ობიექტი', form.objectName],
            ['დირექტ. ხელმოწ.', form.directorSignature ? '✓ ხელმოწერილია' : '—'],
            ['პასუხისმ. ხელმოწ.', form.appointedSignature ? '✓ ხელმოწერილია' : '—'],
          ] : docType === 'fire_safety_order_enterprise' ? [
            ['დანიშნული პირი', form.appointedName],
            ['თანამდებობა', form.appointedPosition],
            ['პ/ნ', form.appointedIdNumber],
            ['ტელეფონი', form.appointedPhone],
            ['ობიექტი', form.objectName],
            ['დირექტ. ხელმოწ.', form.directorSignature ? '✓ ხელმოწერილია' : '—'],
            ['პასუხისმ. ხელმოწ.', form.appointedSignature ? '✓ ხელმოწერილია' : '—'],
          ] : docType === 'labor_safety_specialist' ? [
            ['სპეციალისტი', form.specialistName],
            ['ობიექტი', form.facilityName],
          ] : [
            ['პასუხისმგებელი', form.responsiblePersonName],
            ['ობიექტი', form.facilityName],
          ]),
        ].map(([label, value]) => (
          <div key={label} className="flex items-center gap-3 px-4 py-2 text-sm">
            <span className="w-36 shrink-0 text-neutral-500">{label}</span>
            <span className="font-medium text-neutral-900">{value || '—'}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-500">
        „PDF გენერირება" — ბრძანება შეინახება და გაიხსნება ახალ ჩანართში ბეჭდვისთვის.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onSaveDraft}
        disabled={isPending}
        className="w-full"
      >
        შენახვა (PDF-ის გარეშე)
      </Button>
    </div>
  );
}
