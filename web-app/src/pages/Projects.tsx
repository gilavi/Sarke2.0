import { motion } from 'framer-motion';
import { useState, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { View, Text, Image, Pressable } from 'react-native';
import { Plus, List, Map as MapIcon, Pencil, Trash2, Building2, MapPin } from 'lucide-react-native';
// Shared component library — the SAME primitives the Expo app renders, via
// react-native-web. Page-level responsive scaffolding (CSS grid, the Radix
// confirm dialog, the Leaflet map) stays web-specific; every UI atom on the
// screen is the shared primitive.
import { Button, Card, IconButton } from '@root/components/primitives';
import { useTheme } from '@root/lib/theme';
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
import { ErrorMessage } from '@/components/ui/error-message';
import { humanizeError } from '@/lib/errors';

function projectInitials(name: string | null | undefined): string {
  if (!name) return '-';
  const trimmed = name.trim();
  if (!trimmed) return '-';
  return Array.from(trimmed).slice(0, 2).join('').toLocaleUpperCase('ka-GE');
}

function latLngToTile(lat: number, lng: number, zoom: number) {
  const x = Math.floor(((lng + 180) / 360) * 2 ** zoom);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** zoom,
  );
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
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
  const { theme } = useTheme();
  const title = p.company_name || p.name;
  const hasTile = p.latitude != null && p.longitude != null;
  const tileUrl = hasTile ? latLngToTile(p.latitude!, p.longitude!, 14) : null;

  return (
    <Card padding="none" style={{ overflow: 'hidden' }}>
      <Pressable onPress={() => navigate(routes.projects.detail(p.id))}>
        {/* Map tile / placeholder header */}
        <View style={{ height: 144, backgroundColor: theme.colors.surfaceSecondary }}>
          {tileUrl ? (
            <>
              <Image source={{ uri: tileUrl }} style={{ height: '100%', width: '100%', opacity: 0.85 }} />
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    height: 24,
                    width: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.accent,
                    borderWidth: 2,
                    borderColor: theme.colors.white,
                  }}
                >
                  <MapPin size={12} color={theme.colors.white} fill={theme.colors.white} />
                </View>
              </View>
            </>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={28} color={theme.colors.inkFaint} />
            </View>
          )}
        </View>

        {/* Body */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
          <View
            style={{
              height: 36,
              width: 36,
              borderRadius: 18,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.accentSoft,
            }}
          >
            {p.logo ? (
              <Image source={{ uri: p.logo }} style={{ height: '100%', width: '100%' }} />
            ) : (
              <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 13 }}>
                {projectInitials(title)}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontWeight: '600', color: theme.colors.ink }}>
              {title}
            </Text>
            {p.address ? (
              <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 12, color: theme.colors.inkSoft }}>
                {p.address}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      {/* Row actions — shared IconButtons */}
      <View style={{ position: 'absolute', right: 8, top: 8, flexDirection: 'row', gap: 4 }}>
        <IconButton icon={Pencil} a11yLabel="რედაქტირება" size="sm" variant="ghost" onPress={() => onEdit(p.id)} />
        <IconButton icon={Trash2} a11yLabel="წაშლა" size="sm" variant="danger" onPress={() => onDelete(p.id)} />
      </View>
    </Card>
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
  const { theme } = useTheme();
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
        <Text style={{ fontSize: 14, color: theme.colors.inkSoft }}>
          პროექტები ჯერ არ არის. დააჭირეთ „ახალი" - ახალი პროექტის შესაქმნელად.
        </Text>
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
