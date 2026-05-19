import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { SkeletonList } from '@/components/SkeletonCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { listInspections, deleteInspection } from '@/lib/data/inspections';
import { listBobcatInspections, deleteBobcatInspection } from '@/lib/data/bobcat';
import { listGeneralEquipmentInspections, deleteGeneralEquipmentInspection } from '@/lib/data/generalEquipment';
import { listExcavatorInspections, deleteExcavatorInspection } from '@/lib/data/excavator';
import { listCargoPlatformInspections } from '@/lib/data/cargoPlatform';
import { listProjects } from '@/lib/data/projects';
import InspectionWizard from '@/components/InspectionWizard';

const TYPE_LABEL: Record<string, string> = {
  harness:            '🦺 დამც. ქამარი',
  xaracho:            '🏗️ ფასადის ხარაჩო',
  mobile_scaffold:    '🏗️ მობ. ხარაჩო',
  mobile_scaffold_n3: '🏗️ მობ. ხარაჩო N3',
  bobcat:             '🚜 ციცხვიანი',
  excavator:          '🚧 ექსკავატორი',
  general:            '⚙️ ტექ. აღჭურვილობა',
  cargo_platform:     '📦 ტვირთის პლატფ.',
};

const TYPE_AVATAR: Record<string, { emoji: string; bg: string }> = {
  xaracho:            { emoji: '🏗️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  mobile_scaffold:    { emoji: '🏗️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  mobile_scaffold_n3: { emoji: '🏗️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  harness:            { emoji: '🦺', bg: 'bg-blue-50 dark:bg-blue-950/20' },
  bobcat:             { emoji: '🚜', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  excavator:          { emoji: '🚧', bg: 'bg-orange-50 dark:bg-orange-950/20' },
  general:            { emoji: '⚙️', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
  cargo_platform:     { emoji: '📦', bg: 'bg-sky-50 dark:bg-sky-950/20' },
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'დრაფტი',
  completed: 'დასრულდა',
  in_progress: 'მიმდინარე',
};

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

interface Row {
  id: string;
  label: string;
  projectId: string;
  type: string;
  status: string;
  date: string;
  href: string;
}

function genericInspectionType(template: { category: string | null }[] | null | undefined): string {
  const category = Array.isArray(template) ? (template[0]?.category ?? null) : null;
  if (category === 'xaracho') return 'xaracho';
  if (category === 'mobile_scaffold') return 'mobile_scaffold';
  if (category === 'mobile_scaffold_n3') return 'mobile_scaffold_n3';
  return 'harness';
}

export default function Inspections() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project') ?? '';
  const [newInspectionOpen, setNewInspectionOpen] = useState(false);
  const [newInspectionCategory, setNewInspectionCategory] = useState<string>('');

  const { data: genericInspections, isLoading: l1 } = useQuery({ queryKey: ['inspections'], queryFn: () => listInspections() });
  const { data: bobcats, isLoading: l2 } = useQuery({ queryKey: ['bobcatInspections'], queryFn: () => listBobcatInspections() });
  const { data: generalEq, isLoading: l3 } = useQuery({ queryKey: ['generalEquipmentInspections'], queryFn: () => listGeneralEquipmentInspections() });
  const { data: excavators, isLoading: l4 } = useQuery({ queryKey: ['excavatorInspections'], queryFn: () => listExcavatorInspections() });
  const { data: cargoPlatforms, isLoading: l5 } = useQuery({ queryKey: ['cargoPlatformInspections'], queryFn: () => listCargoPlatformInspections() });
  const { data: projectList } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const projects = projectList ? Object.fromEntries(projectList.map((p) => [p.id, p])) : {};
  const [filter, setFilter] = useState<string>(projectParam);

  const isLoading = l1 || l2 || l3 || l4 || l5;

  const delInspection = useMutation({ mutationFn: deleteInspection, onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }) });
  const delBobcat = useMutation({ mutationFn: deleteBobcatInspection, onSuccess: () => qc.invalidateQueries({ queryKey: ['bobcatInspections'] }) });
  const delExcavator = useMutation({ mutationFn: deleteExcavatorInspection, onSuccess: () => qc.invalidateQueries({ queryKey: ['excavatorInspections'] }) });
  const delGeneral = useMutation({ mutationFn: deleteGeneralEquipmentInspection, onSuccess: () => qc.invalidateQueries({ queryKey: ['generalEquipmentInspections'] }) });

  function handleDelete(row: Row) {
    const ok = window.confirm('წავშალოთ ეს ჩანაწერი?');
    if (!ok) return;
    switch (row.type) {
      case 'harness': delInspection.mutate(row.id); break;
      case 'bobcat': delBobcat.mutate(row.id); break;
      case 'excavator': delExcavator.mutate(row.id); break;
      case 'general': delGeneral.mutate(row.id); break;
    }
  }

  const allRows: Row[] = [
    ...(genericInspections ?? []).map((i): Row => ({
      id: i.id, label: i.harness_name || `აქტი #${i.id.slice(0, 8)}`,
      projectId: i.project_id,
      type: genericInspectionType(i.template),
      status: i.status,
      date: i.created_at ?? '', href: `/inspections/${i.id}`,
    })),
    ...(bobcats ?? []).map((i): Row => ({
      id: i.id, label: i.equipmentModel || i.company || `ციცხვიანი #${i.id.slice(0, 8)}`,
      projectId: i.projectId, type: 'bobcat', status: i.status,
      date: i.createdAt, href: `/bobcat/${i.id}`,
    })),
    ...(excavators ?? []).map((i): Row => ({
      id: i.id, label: `ექსკავატორი${i.serialNumber ? ` — ${i.serialNumber}` : ''}`,
      projectId: i.projectId, type: 'excavator', status: i.status,
      date: i.createdAt, href: `/excavator/${i.id}`,
    })),
    ...(generalEq ?? []).map((i): Row => ({
      id: i.id, label: i.objectName || `ტექ. აქტი #${i.id.slice(0, 8)}`,
      projectId: i.projectId, type: 'general', status: i.status,
      date: i.createdAt, href: `/general-equipment/${i.id}`,
    })),
    ...(cargoPlatforms ?? []).map((i): Row => ({
      id: i.id, label: i.company || `პლატფ. #${i.id.slice(0, 8)}`,
      projectId: i.projectId, type: 'cargo_platform', status: i.status,
      date: i.createdAt, href: `/cargo-platform/${i.id}`,
    })),
  ]
    .filter((r) => !filter || r.projectId === filter)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          {filter && projects[filter] && (
            <Link to={`/projects/${filter}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
              ← {projects[filter].name}
            </Link>
          )}
          <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">შემოწმების აქტები</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">ყველა აქტი თქვენი ანგარიშიდან.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>+ ახალი შემოწმება</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => { setNewInspectionCategory('xaracho'); setNewInspectionOpen(true); }}>
              ფასადის ხარაჩოს შემოწმების აქტი
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { setNewInspectionCategory('harness'); setNewInspectionOpen(true); }}>
              დამცავი ქამრების შემოწმების აქტი
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`/bobcat/new${filter ? `?project=${filter}` : ''}`)}>
              ციცხვიანი დამტვირთველის შემოწმების აქტი
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`/bobcat/new${filter ? `?project=${filter}` : ''}`)}>
              დიდი ციცხვიანი დამტვირთველის შემოწმება
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`/excavator/new${filter ? `?project=${filter}` : ''}`)}>
              ექსკავატორის ტექნიკური შემოწმების აქტი
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`/general-equipment/new${filter ? `?project=${filter}` : ''}`)}>
              ტექნიკური აღჭურვილობის შემოწმების აქტი
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`/cargo-platform/new${filter ? `?project=${filter}` : ''}`)}>
              ტვირთის მიმღები პლატფორმის შემოწმების აქტი
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {Object.keys(projects).length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-600 dark:text-neutral-400">პროექტი:</label>
          <Select
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[{ value: '', label: 'ყველა' }, ...Object.values(projects).map((p) => ({ value: p.id, label: p.name }))]}
          />
        </div>
      )}

      {isLoading && <SkeletonList />}

      {!isLoading && allRows.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {filter ? 'ამ პროექტში აქტები ვერ მოიძებნა.' : 'შემოწმების აქტები ჯერ არ გაქვთ.'}
          </p>
          {!filter && (
            <Button size="sm" onClick={() => setNewInspectionOpen(true)}>+ ახალი აქტი</Button>
          )}
        </div>
      )}

      <InspectionWizard open={newInspectionOpen} onClose={() => { setNewInspectionOpen(false); setNewInspectionCategory(''); }} defaultProjectId={filter} defaultCategory={newInspectionCategory} />

      {allRows.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900">
          {allRows.map((row) => (
            <motion.div
              key={row.id}
              variants={itemVariants}
              className="group flex items-center justify-between gap-3 px-6 py-4 hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/60"
            >
              <Link to={row.href} className="flex flex-1 items-center gap-3 min-w-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TYPE_AVATAR[row.type]?.bg ?? 'bg-neutral-100 dark:bg-neutral-800'}`}>
                  <span className="text-xl leading-none">{TYPE_AVATAR[row.type]?.emoji ?? '📋'}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{row.label}</p>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {projects[row.projectId]?.name ?? '—'}
                    {' · '}
                    <span className="font-mono text-xs tabular-nums text-neutral-400 dark:text-neutral-500">{new Date(row.date).toLocaleDateString('ka-GE')}</span>
                  </p>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {TYPE_LABEL[row.type]}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  row.status === 'completed'
                    ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                }`}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Link to={row.href} className="rounded p-1 text-neutral-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30">
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(row)}
                    className="rounded p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
