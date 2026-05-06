import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listProjects } from '@/lib/data/projects';
import {
  createBobcatInspection,
  BOBCAT_TEMPLATE_ID,
  LARGE_LOADER_TEMPLATE_ID,
  type BobcatInspection,
  type BobcatInspectionType,
} from '@/lib/data/bobcat';

const TYPE_LABELS: Record<BobcatInspectionType, string> = {
  pre_work: 'მუშაობის წინ',
  scheduled: 'გეგმიური',
  other: 'სხვა',
};

export default function NewBobcatInspection() {
  const navigate = useNavigate();
  const qc = useQueryClient();
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

  const mutation = useMutation({
    mutationFn: () =>
      createBobcatInspection({
        projectId,
        templateId: variant === 'bobcat' ? BOBCAT_TEMPLATE_ID : LARGE_LOADER_TEMPLATE_ID,
        company: company.trim() || null,
        equipmentModel: equipmentModel.trim() || null,
        registrationNumber: registrationNumber.trim() || null,
        department: department.trim() || null,
        inspectorName: inspectorName.trim() || null,
        inspectionDate: inspectionDate || null,
        inspectionType,
      }),
    onSuccess: (created: BobcatInspection) => {
      qc.invalidateQueries({ queryKey: ['bobcatInspections'] });
      navigate(`/bobcat/${created.id}`);
    },
  });

  const canSubmit = !!projectId && !mutation.isPending;

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
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) mutation.mutate();
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="project">პროექტი *</Label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— აირჩიეთ პროექტი —</option>
                {(projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>ტექნიკის ტიპი</Label>
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
              <Label>შემოწმების ტიპი</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(TYPE_LABELS) as [BobcatInspectionType, string][]).map(
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

            <div className="space-y-1">
              <Label htmlFor="company">კომპანია</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="model">ტექნიკის მოდელი</Label>
                <Input
                  id="model"
                  value={equipmentModel}
                  onChange={(e) => setEquipmentModel(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reg">სარეგ. ნომერი</Label>
                <Input
                  id="reg"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="department">დეპარტამენტი</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="დეპარტამენტის დასახელება"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="inspector">ინსპექტორი</Label>
              <Input
                id="inspector"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="სახელი, გვარი"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="inspectionDate">შემოწმების თარიღი</Label>
              <Input
                id="inspectionDate"
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
              />
            </div>

            {mutation.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : String(mutation.error)}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!canSubmit}>
                {mutation.isPending ? 'იქმნება…' : 'შექმნა'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/inspections')}
                disabled={mutation.isPending}
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
