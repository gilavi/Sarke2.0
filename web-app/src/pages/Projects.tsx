import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, List, Map } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listProjects } from '@/lib/data/projects';
import ProjectMap from '@/components/ProjectMap';

export default function Projects() {
  const { data: items, error } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });

  const [view, setView] = useState<'list' | 'map'>('list');

  const pinsWithGPS = (items ?? []).filter(
    (p): p is typeof p & { latitude: number; longitude: number } =>
      p.latitude != null && p.longitude != null,
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-neutral-900">პროექტები</h1>
          <p className="mt-1 text-sm text-neutral-500">თქვენი ყველა პროექტი ერთ ადგილას.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === 'list'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <List size={15} />
              სია
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === 'map'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Map size={15} />
              რუკა
            </button>
          </div>
          <Link to="/projects/new">
            <Button className="shrink-0">
              <Plus size={16} className="mr-1" />
              ახალი
            </Button>
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {!items && !error && <p className="text-sm text-neutral-500">იტვირთება…</p>}

      {items && view === 'map' && (
        <ProjectMap
          pins={pinsWithGPS.map((p) => ({
            id: p.id,
            name: p.name,
            address: p.address,
            latitude: p.latitude,
            longitude: p.longitude,
          }))}
          className="h-[60vh] w-full rounded-xl"
        />
      )}

      {items && view === 'list' && items.length === 0 && (
        <p className="text-sm text-neutral-500">
          პროექტები ჯერ არ არის. დააჭირეთ „ახალი" — ახალი პროექტის შესაქმნელად.
        </p>
      )}

      {items && view === 'list' && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="block">
              <Card className="h-full transition hover:border-brand-300 hover:shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <CardDescription>{p.company_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600">{p.address || '—'}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
