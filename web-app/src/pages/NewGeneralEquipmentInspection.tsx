import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ProjectPicker } from '@/components/ui/project-picker';
import { WizardFrame, SegmentedControl } from '@/components/wizard';
import { listProjects } from '@/lib/data/projects';
import { equipmentInspectionName } from '@/lib/documentNames';
import { projectKeys } from '@/app/queryKeys';
import { createGeneralEquipmentInspection, type GEInspectionType } from '@/lib/data/generalEquipment';

const TYPE_LABELS: Record<GEInspectionType, string> = {
  initial: 'პირველადი',
  repeat: 'განმეორებითი',
  scheduled: 'გეგმიური',
};

export default function NewGeneralEquipmentInspection() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });

  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [objectName, setObjectName] = useState('');
  const [activityType, setActivityType] = useState('');
  const [actNumber, setActNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionType, setInspectionType] = useState<GEInspectionType>('initial');

  const [submitting, setSubmitting] = useState(false);
  const canSubmit = !!projectId && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await createGeneralEquipmentInspection({
        projectId,
        objectName: objectName.trim() || null,
        activityType: activityType.trim() || null,
        inspectionType,
        department: department.trim() || null,
        inspectorName: inspectorName.trim() || null,
        actNumber: actNumber.trim() || null,
        inspectionDate: inspectionDate || null,
      });
      navigate(`/general-equipment/${created.id}`, { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <WizardFrame
      open
      onClose={() => navigate('/inspections')}
      inspectionName={equipmentInspectionName('general')}
      stepName="ზოგადი ინფორმაცია"
      showProgress={false}
      progressPercent={0}
      stepKey="new"
      direction={1}
      onBack={() => navigate('/inspections')}
      backDisabled
      onNext={handleSubmit}
      nextDisabled={!canSubmit}
      nextLabel={submitting ? 'იქმნება…' : 'შექმნა'}
      hideNextArrow
      submitting={submitting}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">პროექტი</p>
          <ProjectPicker
            label=""
            required
            value={projectId}
            onChange={setProjectId}
            options={(projects ?? []).map((p) => ({ value: p.id, label: p.name, logo: p.logo, company: p.company_name }))}
          />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">შემოწმების ტიპი</p>
          <SegmentedControl
            fullWidth
            options={(Object.entries(TYPE_LABELS) as [GEInspectionType, string][]).map(([key, label]) => ({
              label,
              value: key,
              selectedBg: '#1D9E75',
            }))}
            selected={inspectionType}
            onSelect={(v) => setInspectionType(v as GEInspectionType)}
          />
        </div>

        <Input label="ობიექტის დასახელება" value={objectName} onChange={(e) => setObjectName(e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="საქმიანობის ტიპი" value={activityType} onChange={(e) => setActivityType(e.target.value)} />
          <Input label="აქტის ნომერი" value={actNumber} onChange={(e) => setActNumber(e.target.value)} />
        </div>

        <Input label="დეპარტამენტი" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="დეპარტამენტის დასახელება" />
        <Input label="ინსპექტორი" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} placeholder="სახელი, გვარი" />
        <Input label="შემოწმების თარიღი" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
      </div>
    </WizardFrame>
  );
}
