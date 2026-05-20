import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TextInput } from '@mantine/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProjectPicker } from '@/components/ui/project-picker';
import { listProjects } from '@/lib/data/projects';
import { createGeneralEquipmentInspection, type GEInspectionType } from '@/lib/data/generalEquipment';

const TYPE_LABELS: Record<GEInspectionType, string> = {
  initial: 'პირველადი',
  repeat: 'განმეორებითი',
  scheduled: 'გეგმიური',
};

export default function NewGeneralEquipmentInspection() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [objectName, setObjectName] = useState('');
  const [activityType, setActivityType] = useState('');
  const [actNumber, setActNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionType, setInspectionType] = useState<GEInspectionType>('initial');

  const canSubmit = !!projectId;

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
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
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <Link to="/inspections" className="text-sm text-brand-600 hover:underline">
          ← აქტები
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
          ახალი ტექნიკური აქტი
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          აღჭურვილობის სია ემატება აქტის გვერდზე — შეგიძლიათ თვითონ ჩაამატოთ ნებისმიერი სტრიქონი.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ზოგადი ინფორმაცია</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <ProjectPicker
              label="პროექტი"
              required
              value={projectId}
              onChange={setProjectId}
              options={(projects ?? []).map((p) => ({ value: p.id, label: p.name, logo: p.logo, company: p.company_name }))}
            />

            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">შემოწმების ტიპი</p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(TYPE_LABELS) as [GEInspectionType, string][]).map(
                  ([key, label]) => (
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
                  ),
                )}
              </div>
            </div>

            <TextInput
              label="ობიექტის დასახელება"
              value={objectName}
              onChange={(e) => setObjectName(e.target.value)}
              radius="md"
            />

            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="საქმიანობის ტიპი"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                radius="md"
              />
              <TextInput
                label="აქტის ნომერი"
                value={actNumber}
                onChange={(e) => setActNumber(e.target.value)}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/inspections')}
              >
                გაუქმება
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
