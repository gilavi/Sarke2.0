import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TextInput } from '@mantine/core';
import { ProjectPicker } from '@/components/ui/project-picker';
import { WizardFrame, SegmentedControl } from '@/components/wizard';
import { listProjects } from '@/lib/data/projects';
import { equipmentInspectionName } from '@/lib/documentNames';
import { projectKeys } from '@/app/queryKeys';
import {
  BOBCAT_TEMPLATE_ID,
  LARGE_LOADER_TEMPLATE_ID,
  createBobcatInspection,
  type BobcatInspectionType,
} from '@/lib/data/bobcat';

const TYPE_LABELS: Record<BobcatInspectionType, string> = {
  pre_work: 'მუშაობის წინ',
  scheduled: 'გეგმიური',
  other: 'სხვა',
};

export default function NewBobcatInspection() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });

  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [variant, setVariant] = useState<'bobcat' | 'large_loader'>('bobcat');
  const [company, setCompany] = useState('');
  const [equipmentModel, setEquipmentModel] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionType, setInspectionType] = useState<BobcatInspectionType>('pre_work');

  const [submitting, setSubmitting] = useState(false);
  const canSubmit = !!projectId && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await createBobcatInspection({
        projectId,
        templateId: variant === 'bobcat' ? BOBCAT_TEMPLATE_ID : LARGE_LOADER_TEMPLATE_ID,
        company: company.trim() || null,
        equipmentModel: equipmentModel.trim() || null,
        registrationNumber: registrationNumber.trim() || null,
        department: department.trim() || null,
        inspectorName: inspectorName.trim() || null,
        inspectionDate: inspectionDate || null,
        inspectionType,
      });
      navigate(`/bobcat/${created.id}`, { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <WizardFrame
      open
      onClose={() => navigate('/inspections')}
      inspectionName={equipmentInspectionName('bobcat')}
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
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ტექნიკის ტიპი</p>
          <SegmentedControl
            fullWidth
            options={[
              { label: 'ციცხვიანი (30 პუნქტი)', value: 'bobcat', selectedBg: '#1D9E75' },
              { label: 'დიდი დამტვირთველი (33 პუნქტი)', value: 'large_loader', selectedBg: '#1D9E75' },
            ]}
            selected={variant}
            onSelect={(v) => setVariant(v as 'bobcat' | 'large_loader')}
          />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">შემოწმების ტიპი</p>
          <SegmentedControl
            fullWidth
            options={(Object.entries(TYPE_LABELS) as [BobcatInspectionType, string][]).map(([key, label]) => ({
              label,
              value: key,
              selectedBg: '#1D9E75',
            }))}
            selected={inspectionType}
            onSelect={(v) => setInspectionType(v as BobcatInspectionType)}
          />
        </div>

        <TextInput label="კომპანია" value={company} onChange={(e) => setCompany(e.target.value)} radius="md" />

        <div className="grid grid-cols-2 gap-3">
          <TextInput label="ტექნიკის მოდელი" value={equipmentModel} onChange={(e) => setEquipmentModel(e.target.value)} radius="md" />
          <TextInput label="სარეგ. ნომერი" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} radius="md" />
        </div>

        <TextInput label="დეპარტამენტი" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="დეპარტამენტის დასახელება" radius="md" />
        <TextInput label="ინსპექტორი" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} placeholder="სახელი, გვარი" radius="md" />
        <TextInput label="შემოწმების თარიღი" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} radius="md" />
      </div>
    </WizardFrame>
  );
}
