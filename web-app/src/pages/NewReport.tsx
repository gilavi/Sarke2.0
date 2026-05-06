import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listProjects } from '@/lib/data/projects';
import { createReport, type Report } from '@/lib/data/reports';

export default function NewReport() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [title, setTitle] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createReport({
        projectId,
        title: title.trim() || 'უსახელო რეპორტი',
      }),
    onSuccess: (created: Report) => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      navigate(`/reports/${created.id}`);
    },
  });

  const canSubmit = !!projectId && !mutation.isPending;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <Link to="/reports" className="text-sm text-brand-600 hover:underline">
          ← რეპორტები
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900">ახალი რეპორტი</h1>
        <p className="mt-1 text-sm text-neutral-500">
          შექმენით დრაფტი — სლაიდები დაამატეთ რეპორტის გვერდზე.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ძირითადი ინფორმაცია</CardTitle>
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
              <Label htmlFor="title">სათაური</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="მაგ: კვირის შემოწმება"
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
                onClick={() => navigate('/reports')}
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
