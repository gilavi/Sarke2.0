import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listProjects } from '@/lib/data/projects';

export default function NewExcavatorInspection() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [serialNumber, setSerialNumber] = useState('');
  const [inventoryNumber, setInventoryNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');

  const projectName = projects?.find((p) => p.id === projectId)?.name ?? null;

  const canSubmit = !!projectId;

  function handleSubmit() {
    if (!canSubmit) return;
    navigate('/excavator/draft', {
      state: {
        pendingCreate: {
          projectId,
          serialNumber: serialNumber.trim() || null,
          inventoryNumber: inventoryNumber.trim() || null,
          projectName,
          department: department.trim() || null,
          inspectorName: inspectorName.trim() || null,
          inspectionDate: inspectionDate || null,
        },
      },
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <Link to="/inspections" className="text-sm text-brand-600 hover:underline">
          ← აქტები
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">
          ახალი ექსკავატორის აქტი
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          ტექნიკური მახასიათებლები მოიკრიფება ჩამოშლილი შაბლონიდან.
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="serial">სერ. ნომერი</Label>
                <Input
                  id="serial"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="inv">ინვ. ნომერი</Label>
                <Input
                  id="inv"
                  value={inventoryNumber}
                  onChange={(e) => setInventoryNumber(e.target.value)}
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

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!canSubmit}>
                შექმნა
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
