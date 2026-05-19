import { motion } from 'framer-motion';
import { useState, lazy, Suspense, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, List, Map, Pencil, Trash2, Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listProjects, deleteProject, type Project } from '@/lib/data/projects';
import { SkeletonList } from '@/components/SkeletonCard';

/* Convert lat/lng to OSM tile x/y at given zoom */
function latLngToTile(lat: number, lng: number, zoom: number) {
  const x = Math.floor(((lng + 180) / 360) * 2 ** zoom);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** zoom,
  );
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

function ProjectCard({ p, onDelete }: { p: Project; onDelete: (id: string) => void }) {
  const hasTile = p.latitude != null && p.longitude != null;
  const tileUrl = hasTile ? latLngToTile(p.latitude!, p.longitude!, 14) : null;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } } }}
      className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
    >
      {/* Map tile background */}
      <Link to={`/projects/${p.id}`} className="block">
        <div className="relative h-36 overflow-hidden bg-neutral-100 dark:bg-neutral-800">
          {tileUrl ? (
            <>
              <img
                src={tileUrl}
                alt=""
                className="h-full w-full object-cover opacity-80 dark:opacity-50"
                style={{ imageRendering: 'auto' }}
                draggable={false}
              />
              {/* centre dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 ring-2 ring-white">
                  <MapPin size={12} className="text-white" fill="white" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Building2 size={28} className="text-neutral-300 dark:text-neutral-600" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        {/* Card body */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Logo / placeholder */}
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
            {p.logo ? (
              <img src={p.logo} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Building2 size={15} className="text-neutral-400" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{p.name}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{p.company_name || p.address || '—'}</p>
          </div>
        </div>
      </Link>

      {/* Action buttons — appear on hover */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Link
          to={`/projects/${p.id}/edit`}
          className="rounded-lg bg-white/90 p-1.5 text-neutral-500 backdrop-blur-sm transition-colors hover:text-brand-600 dark:bg-neutral-900/90 dark:text-neutral-400"
        >
          <Pencil size={13} />
        </Link>
        <button
          onClick={() => onDelete(p.id)}
          className="rounded-lg bg-white/90 p-1.5 text-neutral-500 backdrop-blur-sm transition-colors hover:text-red-600 dark:bg-neutral-900/90 dark:text-neutral-400"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  );
}

const ProjectMap = lazy(() => import('@/components/ProjectMap'));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
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
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">პროექტები</h1>
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
            <ProjectCard key={p.id} p={p} onDelete={handleDelete} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
