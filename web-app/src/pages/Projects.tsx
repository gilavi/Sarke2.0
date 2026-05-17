import { motion } from 'framer-motion';
import { useState, lazy, Suspense, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, List, Map, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listProjects, deleteProject } from '@/lib/data/projects';
import { SkeletonList } from '@/components/SkeletonCard';

const ProjectMap = lazy(() => import('@/components/ProjectMap'));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
};

export default function Projects() {
  const qc = useQueryClient();
  const { data: items, error, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });

  const [view, setView] = useState<'list' | 'map'>('list');
  const handleSetList = useCallback(() => setView('list'), []);
  const handleSetMap = useCallback(() => setView('map'), []);

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  function handleDelete(id: string) {
    const ok = window.confirm('წავშალოთ ეს პროექტი? ყველა დაკავშირებული ჩანაწერი წაიშლება.');
    if (!ok) return;
    deleteMutation.mutate(id);
  }

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
              onClick={handleSetList}
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
              onClick={handleSetMap}
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

      {isLoading && <SkeletonList />}

      {items && view === 'map' && (
        <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading map...</div>}>
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
        </Suspense>
      )}

      {items && view === 'list' && items.length === 0 && (
        <p className="text-sm text-neutral-500">
          პროექტები ჯერ არ არის. დააჭირეთ „ახალი" — ახალი პროექტის შესაქმნელად.
        </p>
      )}

      {items && view === 'list' && items.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <motion.div key={p.id} variants={itemVariants}>
              <Card className="group relative h-full transition hover:border-brand-300 hover:shadow-sm">
              <Link to={`/projects/${p.id}`} className="block h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <CardDescription>{p.company_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600">{p.address || '—'}</p>
                </CardContent>
              </Link>
              <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Link to={`/projects/${p.id}/edit`} className="rounded p-1 text-neutral-400 hover:text-brand-600 hover:bg-brand-50">
                  <Pencil size={14} />
                </Link>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="rounded p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
