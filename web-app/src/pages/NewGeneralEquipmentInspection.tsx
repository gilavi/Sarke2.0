import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listProjects } from '@/lib/data/projects';
import {
  createGeneralEquipmentInspection,
  type GEInspectionType,
  type GeneralEquipmentInspection,
} from '@/lib/data/generalEquipment';

const TYPE_LABELS: Record<GEInspectionType, string> = {
  initial: 'პირველადი',
  repeat: 'განმეორებითი',
  scheduled: 'გეგმიური',
};

export default function NewGeneralEquipmentInspection() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [objectName, setObjectName] = useState('');
  const [activityType, setActivityType] = useState('');
  const [actNumber, setActNumber] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionType, setInspectionType] = useState<GEInspectionType>('initial');

  const mutation = useMutation({
    mutationFn: () =>
      createGeneralEquipmentInspection({
        projectId,
        objectName: objectName.trim() || null,
        activityType: activityType.trim() || null,
        actNumber: actNumber.trim() || null,
        inspectorName: inspectorName.trim() || null,
        inspectionType,
      }),
    onSuccess: (created: GeneralEquipmentInspection) => {
      qc.invalidateQueries({ queryKey: ['generalEquipmentInspections'] });
      navigate(`/general-equipment/${created.id}`);
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
              <Label>შემოწმების ტიპი</Label>
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

            <div className="space-y-1">
              <Label htmlFor="object">ობიექტის დასახელება</Label>
              <Input
                id="object"
                value={objectName}
                onChange={(e) => setObjectName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="activity">საქმიანობის ტიპი</Label>
                <Input
                  id="activity"
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="act">აქტის ნომერი</Label>
                <Input
                  id="act"
                  value={actNumber}
                  onChange={(e) => setActNumber(e.target.value)}
                />
              </div>
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
