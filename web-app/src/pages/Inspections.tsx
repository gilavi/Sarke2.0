import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueries, useQueryClient, useMutation } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { SkeletonList } from '@/components/SkeletonCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { listInspections, deleteInspection } from '@/lib/data/inspections';
import { LARGE_LOADER_TEMPLATE_ID } from '@/lib/types/bobcat';
import { listProjects } from '@/lib/data/projects';
import InspectionWizard from '@/components/InspectionWizard';
import { harnessWizardPreset } from '@/components/inspections/harnessPreset';
import { useInspectionName } from '@/lib/documentNames';
import { projectKeys, inspectionKeys } from '@/app/queryKeys';
import {
  STRUCTURED_ACT_LIST,
  getStructuredAct,
  actRows,
  type StructuredRow,
} from '@/features/inspections/structured/acts';

/* Generic (inspections-table) types still handled by the legacy InspectionWizard.
   Structured acts (bobcat … fall-protection) are data-driven from the registry. */
const GENERIC_TYPE_LABEL: Record<string, string> = {
  harness: '🦺 დამც. ქამარი',
  xaracho: '🏗️ ფასადის ხარაჩო',
  mobile_scaffold: '🏗️ მობ. ხარაჩო',
  mobile_scaffold_n3: '🏗️ მობ. ხარაჩო N3',
};

const GENERIC_TYPE_AVATAR: Record<string, { emoji: string; bg: string }> = {
  xaracho: { emoji: '🏗️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  mobile_scaffold: { emoji: '🏗️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  mobile_scaffold_n3: { emoji: '🏗️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  harness: { emoji: '🦺', bg: 'bg-blue-50 dark:bg-blue-950/20' },
};

/* Per-act-key emoji for the structured-act rows (visual only). */
const STRUCTURED_AVATAR: Record<string, string> = {
  bobcat: '🚜',
  large_loader: '🚜',
  excavator: '🚧',
  general_equipment: '⚙️',
  cargo_platform: '📦',
  safety_net_inspection: '🕸️',
  mobile_ladder_inspection: '🪜',
  fall_protection_inspection: '🛡️',
  forklift_inspection: '🏭',
  lifting_accessories_inspection: '🔗',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'დრაფტი',
  completed: 'დასრულდა',
  in_progress: 'მიმდინარე',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
};

interface Row {
  id: string;
  label: string;
  projectId: string;
  /** Generic category (harness/xaracho/…) OR structured act key (bobcat/large_loader/…). */
  type: string;
  /** True for structured-act rows (delete dispatches through the act registry). */
  structured: boolean;
  status: string;
  date: string;
  href: string;
  emoji: string;
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
  const [harnessOpen, setHarnessOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);

  const { data: genericInspections, isLoading: genericLoading } = useQuery({
    queryKey: inspectionKeys.lists(),
    queryFn: () => listInspections(),
  });
  const { data: projectList } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });

  // One query per row-sourcing structured act — data-driven from the registry so
  // adding an act lights it up here automatically. Acts flagged excludeFromList
  // (e.g. large_loader, which shares the bobcat table) are not queried separately.
  const listActs = STRUCTURED_ACT_LIST.filter((a) => !a.excludeFromList);
  const structuredQueries = useQueries({
    queries: listActs.map((act) => ({
      queryKey: act.descriptor.listKey(),
      queryFn: () => act.descriptor.list(),
    })),
  });

  const projects = projectList ? Object.fromEntries(projectList.map((p) => [p.id, p])) : {};
  const inspectionName = useInspectionName();
  const [filter, setFilter] = useState<string>(projectParam);

  const structuredLoading = structuredQueries.some((q) => q.isLoading);
  const isLoading = genericLoading || structuredLoading;

  const delInspection = useMutation({
    mutationFn: deleteInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: inspectionKeys.lists() }),
  });
  const delStructured = useMutation({
    mutationFn: async (row: Row) => {
      const act = getStructuredAct(row.type);
      if (act) await act.descriptor.remove(row.id);
    },
    onSuccess: (_d, row) => {
      const act = getStructuredAct(row.type);
      if (act) qc.invalidateQueries({ queryKey: act.descriptor.listKey() });
    },
  });

  function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.structured) {
      delStructured.mutate(pendingDelete);
    } else {
      delInspection.mutate(pendingDelete.id);
    }
    setPendingDelete(null);
  }

  const isDeleting = delInspection.isPending || delStructured.isPending;

  const genericRows: Row[] = (genericInspections ?? []).map((i): Row => {
    const type = genericInspectionType(i.template);
    return {
      id: i.id,
      label: inspectionName(i.template_id),
      projectId: i.project_id,
      type,
      structured: false,
      status: i.status,
      date: i.created_at ?? '',
      href: type === 'harness' ? `/harness/${i.id}` : `/inspections/${i.id}`,
      emoji: GENERIC_TYPE_AVATAR[type]?.emoji ?? '📋',
    };
  });

  const structuredRows: Row[] = listActs.flatMap((act, idx) => {
    const data = (structuredQueries[idx]?.data ?? []) as Array<{ id: string; status: string; createdAt?: string; templateId?: string | null }>;
    // The bobcat query feeds two acts: rows whose templateId is the large-loader
    // template render under the large_loader act (own label/route); the rest stay
    // bobcat. Other acts map straight through.
    if (act.key === 'bobcat') {
      return data.flatMap((row) => {
        const isLarge = row.templateId === LARGE_LOADER_TEMPLATE_ID;
        const target = isLarge ? getStructuredAct('large_loader')! : act;
        return actRows(target, [row]).map((r: StructuredRow): Row => ({
          id: r.id, label: r.label, projectId: r.projectId, type: r.actKey,
          structured: true, status: r.status, date: r.date, href: r.href,
          emoji: STRUCTURED_AVATAR[r.actKey] ?? '📋',
        }));
      });
    }
    return actRows(act, data).map((r: StructuredRow): Row => ({
      id: r.id, label: r.label, projectId: r.projectId, type: r.actKey,
      structured: true, status: r.status, date: r.date, href: r.href,
      emoji: STRUCTURED_AVATAR[r.actKey] ?? '📋',
    }));
  });

  const allRows: Row[] = [...genericRows, ...structuredRows]
    .filter((r) => !filter || r.projectId === filter)
    .sort((a, b) => b.date.localeCompare(a.date));

  const newQuery = filter ? `?project=${filter}` : '';

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
          <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto">
            {/* Generic (inspections-table) acts via the legacy questionnaire wizard */}
            <DropdownMenuItem onSelect={() => { setNewInspectionCategory('xaracho'); setNewInspectionOpen(true); }}>
              ფასადის ხარაჩოს შემოწმების აქტი
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setHarnessOpen(true)}>
              დამცავი ქამრების შემოწმების აქტი
            </DropdownMenuItem>
            {/* Structured acts — data-driven from the registry (incl. large-loader) */}
            {STRUCTURED_ACT_LIST.map((act) => (
              <DropdownMenuItem key={act.key} onSelect={() => navigate(`${act.newRoute}${newQuery}`)}>
                {act.menuLabel}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {Object.keys(projects).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">პროექტი:</span>
          {[{ value: '', label: 'ყველა' }, ...Object.values(projects).map((p) => ({ value: p.id, label: p.name }))].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                filter === opt.value
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-brand-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {isLoading && <SkeletonList />}

      {!isLoading && allRows.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {filter ? 'ამ პროექტში აქტები ვერ მოიძებნა.' : 'შემოწმების აქტები ჯერ არ გაქვთ.'}
          </p>
          {!filter && (
            <Button size="sm" onClick={() => setHarnessOpen(true)}>+ ახალი აქტი</Button>
          )}
        </div>
      )}

      <InspectionWizard open={newInspectionOpen} onClose={() => { setNewInspectionOpen(false); setNewInspectionCategory(''); }} defaultProjectId={filter} defaultCategory={newInspectionCategory} />
      <InspectionWizard open={harnessOpen} onClose={() => setHarnessOpen(false)} defaultProjectId={filter} preset={harnessWizardPreset} />

      {allRows.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900">
          {allRows.map((row) => (
            <motion.div
              key={`${row.type}:${row.id}`}
              variants={itemVariants}
              className="group flex items-center justify-between gap-3 px-6 py-4 hover:bg-neutral-50 transition-colors dark:hover:bg-neutral-800/60"
            >
              <Link to={row.href} className="flex flex-1 items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  <span className="text-xl leading-none">{row.emoji}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{row.label}</p>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {projects[row.projectId]?.name ?? '—'}
                    {' · '}
                    <span className="font-mono text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                      {row.date ? new Date(row.date).toLocaleDateString('ka-GE') : '—'}
                    </span>
                  </p>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
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
                    onClick={() => setPendingDelete(row)}
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

      {/* ── Delete confirmation modal ── */}
      <Modal
        opened={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        withCloseButton={false}
        centered
        size="sm"
        radius="lg"
        overlayProps={{ blur: 2 }}
      >
        <div className="space-y-4 px-1 py-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
              <Trash2 size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">ჩანაწერის წაშლა</p>
              <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                {pendingDelete?.label && (
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">„{pendingDelete.label}"</span>
                )}{' '}
                სამუდამოდ წაიშლება. ეს მოქმედება შეუქცევადია.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              გაუქმება
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {isDeleting ? 'იშლება…' : 'წაშლა'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
