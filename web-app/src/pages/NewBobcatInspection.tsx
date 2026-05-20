import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TextInput } from '@mantine/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProjectPicker } from '@/components/ui/project-picker';
import { listProjects } from '@/lib/data/projects';
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

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [variant, setVariant] = useState<'bobcat' | 'large_loader'>('bobcat');
  const [company, setCompany] = useState('');
  const [equipmentModel, setEquipmentModel] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionType, setInspectionType] = useState<BobcatInspectionType>('pre_work');

  const canSubmit = !!projectId;
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
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
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <Link to="/inspections" className="text-sm text-brand-600 hover:underline">
          ← აქტები
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
          ახალი ციცხვიანი / დიდი დამტვირთველის აქტი
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          აირჩიეთ პროექტი და ტექნიკის ტიპი — პუნქტები შეივსება აქტის გვერდზე.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ზოგადი ინფორმაცია</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          >
            <ProjectPicker
              label="პროექტი"
              required
              value={projectId}
              onChange={setProjectId}
              options={(projects ?? []).map((p) => ({ value: p.id, label: p.name, logo: p.logo, company: p.company_name }))}
            />

            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ტექნიკის ტიპი</p>
              <div className="flex gap-2">
                {(
                  [
                    ['bobcat', 'ციცხვიანი (30 პუნქტი)'],
                    ['large_loader', 'დიდი დამტვირთველი (33 პუნქტი)'],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVariant(v)}
                    className={`flex-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      variant === v
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">შემოწმების ტიპი</p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(TYPE_LABELS) as [BobcatInspectionType, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setInspectionType(key)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      inspectionType === key
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <TextInput
              label="კომპანია"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              radius="md"
            />

            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="ტექნიკის მოდელი"
                value={equipmentModel}
                onChange={(e) => setEquipmentModel(e.target.value)}
                radius="md"
              />
              <TextInput
                label="სარეგ. ნომერი"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                radius="md"
              />
            </div>

            <TextInput
              label="დეპარტამენტი"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="დეპარტამენტის დასახელება"
              radius="md"
            />

            <TextInput
              label="ინსპექტორი"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="სახელი, გვარი"
              radius="md"
            />

            <TextInput
              label="შემოწმების თარიღი"
              type="date"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              radius="md"
            />

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? 'იქმნება…' : 'შექმნა'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/inspections')}>
                გაუქმება
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
