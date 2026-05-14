import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { listProjects } from '@/lib/data/projects';
import { createCargoPlatformInspection } from '@/lib/data/cargoPlatform';

export default function NewCargoPlatformInspection() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !!projectId && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const insp = await createCargoPlatformInspection({ projectId });
      navigate(`/cargo-platform/${insp.id}`, { replace: true });
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
          ახალი პლატფორმის აქტი
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          ტვირთის მიმღები პლატფორმის შემოწმების აქტი.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">პროექტის არჩევა</CardTitle>
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

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!canSubmit}>
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
