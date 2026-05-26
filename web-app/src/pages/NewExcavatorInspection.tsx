import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ProjectPicker } from '@/components/ui/project-picker';
import { WizardFrame } from '@/components/wizard';
import { listProjects } from '@/lib/data/projects';
import { equipmentInspectionName } from '@/lib/documentNames';
import { projectKeys } from '@/app/queryKeys';
import { createExcavatorInspection } from '@/lib/data/excavator';

export default function NewExcavatorInspection() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });

  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [serialNumber, setSerialNumber] = useState('');
  const [inventoryNumber, setInventoryNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');

  const projectName = projects?.find((p) => p.id === projectId)?.name ?? null;

  const [submitting, setSubmitting] = useState(false);
  const canSubmit = !!projectId && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await createExcavatorInspection({
        projectId,
        serialNumber: serialNumber.trim() || null,
        inventoryNumber: inventoryNumber.trim() || null,
        projectName,
        department: department.trim() || null,
        inspectorName: inspectorName.trim() || null,
        inspectionDate: inspectionDate || null,
      });
      navigate(`/excavator/${created.id}`, { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <WizardFrame
      open
      onClose={() => navigate('/inspections')}
      inspectionName={equipmentInspectionName('excavator')}
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

        <div className="grid grid-cols-2 gap-3">
          <Input label="სერ. ნომერი" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
          <Input label="ინვ. ნომერი" value={inventoryNumber} onChange={(e) => setInventoryNumber(e.target.value)} />
        </div>

        <Input label="დეპარტამენტი" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="დეპარტამენტის დასახელება" />
        <Input label="ინსპექტორი" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} placeholder="სახელი, გვარი" />
        <Input label="შემოწმების თარიღი" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
      </div>
    </WizardFrame>
  );
}
