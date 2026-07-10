import { motion } from 'framer-motion';
import { useState, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, List, Map as MapIcon, Pencil, Trash2 } from 'lucide-react-native';
import { FolderOpen } from 'lucide-react';
// Shared component library — the SAME primitives the Expo app renders, via
// react-native-web. Page-level responsive scaffolding (CSS grid, the Radix
// confirm dialog, the Leaflet map) stays web-specific; every UI atom on the
// screen is the shared primitive.
import { Button, IconButton } from '@root/components/primitives';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { listProjects, deleteProject, type Project } from '@/lib/data/projects';
import { SkeletonList } from '@/components/SkeletonCard';
import { ProjectModal } from '@/components/ProjectModal';
import { projectKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { osmTileUrl } from '@/lib/mapTile';
import { ErrorMessage } from '@/components/ui/error-message';
import { humanizeError } from '@/lib/errors';

function projectInitials(name: string | null | undefined): string {
  if (!name) return '-';
  const trimmed = name.trim();
  if (!trimmed) return '-';
  return Array.from(trimmed).slice(0, 2).join('').toLocaleUpperCase('ka-GE');
}

function ProjectCard({
  p,
  onDelete,
  onEdit,
}: {
  p: Project;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const navigate = useNavigate();
  const title = p.company_name || p.name;
  const hasTile = p.latitude != null && p.longitude != null;
  const tileUrl = hasTile ? osmTileUrl(p.latitude!, p.longitude!) : null;

  // Mirrors the mobile home ProjectCard: one card with the map as a desaturated
  // background that fades toward the bottom-left (so it peeks at the top-right),
  // the avatar top-left and the name/address bottom-left over the card surface.
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => navigate(routes.projects.detail(p.id))}
        aria-label={`პროექტი: ${title}`}
        className="block w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <div className="relative flex h-[148px] w-full flex-col justify-between overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 transition-colors group-hover:border-[var(--text-muted)]">
          {tileUrl ? (
            <>
              <img
                src={tileUrl}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-cover grayscale"
                style={{
                  opacity: 0.85,
                  WebkitMaskImage:
                    'radial-gradient(135% 135% at 100% 0%, #000 0%, rgba(0,0,0,0.45) 45%, transparent 78%)',
                  maskImage:
                    'radial-gradient(135% 135% at 100% 0%, #000 0%, rgba(0,0,0,0.45) 45%, transparent 78%)',
                }}
              />
              {/* Pulsing location dot, biased to the top-right like mobile. */}
              <span className="absolute left-[80%] top-[30%] h-2 w-2 animate-pulse rounded-full bg-brand-500 ring-2 ring-white dark:ring-neutral-900" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-[var(--bg-hover)] dark:from-brand-950/30 dark:to-[var(--bg-hover)]" />
          )}

          {/* Avatar (top-left) */}
          <div className="relative z-10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900/40">
            {p.logo ? (
              <img src={p.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                {projectInitials(title)}
              </span>
            )}
          </div>

          {/* Name + address (bottom-left) */}
          <div className="relative z-10 min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
              {title}
            </p>
            {p.address ? (
              <p className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">
                {p.address}
              </p>
            ) : null}
          </div>
        </div>
      </button>

      {/* Row actions — shared IconButtons, top-right (web-only) */}
      <div className="absolute right-2 top-2 flex gap-1">
        <IconButton icon={Pencil} a11yLabel="რედაქტირება" size="sm" variant="ghost" onPress={() => onEdit(p.id)} />
        <IconButton icon={Trash2} a11yLabel="წაშლა" size="sm" variant="danger" onPress={() => onDelete(p.id)} />
      </div>
    </div>
  );
}

const ProjectMap = lazy(() => import('@/components/ProjectMap'));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
};

export default function Projects() {
  const qc = useQueryClient();
  const { data: items, error, isLoading } = useQuery({
    queryKey: projectKeys.lists(),
    queryFn: listProjects,
  });

  const [view, setView] = useState<'list' | 'map'>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const openNew = useCallback(() => { setEditingId(undefined); setModalOpen(true); }, []);
  const openEdit = useCallback((id: string) => { setEditingId(id); setModalOpen(true); }, []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.lists() }),
  });

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
        {/* Shared Button atoms in a wrapping flex container (web scaffold) so the
            row reflows instead of overflowing on narrow widths. */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button title="სია" size="sm" leftIcon={List} variant={view === 'list' ? 'primary' : 'ghost'} onPress={() => setView('list')} />
          <Button title="რუკა" size="sm" leftIcon={MapIcon} variant={view === 'map' ? 'primary' : 'ghost'} onPress={() => setView('map')} />
          <Button title="ახალი პროექტი" size="sm" leftIcon={Plus} onPress={openNew} />
        </div>
      </header>

      {error && <ErrorMessage>{humanizeError(error)}</ErrorMessage>}

      {isLoading && <SkeletonList />}

      {items && view === 'map' && (
        <Suspense fallback={<div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading map...</div>}>
          <ProjectMap
            pins={pinsWithGPS.map((p) => ({ id: p.id, name: p.name, address: p.address, latitude: p.latitude, longitude: p.longitude }))}
            className="h-[60vh] w-full rounded-xl"
          />
        </Suspense>
      )}

      {items && view === 'list' && items.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 py-12 text-center dark:border-neutral-800">
          <FolderOpen size={24} className="mb-2 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">პროექტები ჯერ არ არის</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            დააჭირეთ „ახალი პროექტი"-ს შესაქმნელად.
          </p>
        </div>
      )}

      {items && view === 'list' && items.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <motion.div key={p.id} variants={itemVariants}>
              <ProjectCard p={p} onDelete={setPendingDeleteId} onEdit={openEdit} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <ProjectModal open={modalOpen} onClose={closeModal} projectId={editingId} />

      {/* Delete confirm — Radix overlay (web-specific), shared Buttons inside */}
      <AlertDialog open={pendingDeleteId != null} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>პროექტის წაშლა</AlertDialogTitle>
          <AlertDialogDescription>ყველა დაკავშირებული ჩანაწერი წაიშლება. ეს მოქმედება შეუქცევადია.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <span><Button title="გაუქმება" size="sm" variant="outline" onPress={() => setPendingDeleteId(null)} /></span>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <span>
                <Button
                  title="წაშლა"
                  size="sm"
                  variant="danger"
                  onPress={() => { if (pendingDeleteId) deleteMutation.mutate(pendingDeleteId); setPendingDeleteId(null); }}
                />
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
