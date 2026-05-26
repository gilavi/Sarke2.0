import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ClipboardList, Trash2 } from 'lucide-react';
import { listInspections, deleteInspection } from '@/lib/data/inspections';
import { listBobcatInspections, deleteBobcatInspection } from '@/lib/data/bobcat';
import { listExcavatorInspections, deleteExcavatorInspection } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections, deleteGeneralEquipmentInspection } from '@/lib/data/generalEquipment';
import { listCargoPlatformInspections, deleteCargoPlatformInspection } from '@/lib/data/cargoPlatform';
import { listProjects } from '@/lib/data/projects';
import { SkeletonList } from '@/components/SkeletonCard';
import { useInspectionName, equipmentInspectionName } from '@/lib/documentNames';
import { projectKeys, inspectionKeys, bobcatKeys, excavatorKeys, generalEquipmentKeys, cargoPlatformKeys } from '@/app/queryKeys';

const STATUS_LABEL: Record<string, string> = {
  draft: 'დრაფტი',
  completed: 'დასრულდა',
  in_progress: 'მიმდინარე',
};

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
  harness:            { emoji: '🦺', bg: 'bg-blue-50 dark:bg-blue-950/20' },
  xaracho:            { emoji: '🏗️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  mobile_scaffold:    { emoji: '🏗️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  mobile_scaffold_n3: { emoji: '🏗️', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
  bobcat:             { emoji: '🚜', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  excavator:          { emoji: '🚧', bg: 'bg-orange-50 dark:bg-orange-950/20' },
  general:            { emoji: '⚙️', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
  cargo_platform:     { emoji: '📦', bg: 'bg-sky-50 dark:bg-sky-950/20' },
};

interface Row {
  id: string;
  label: string;
  projectId: string;
  type: keyof typeof TYPE_LABEL;
  status: string;
  date: string;
  href: string;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return 'დღეს';
  if (isSameDay(d, yesterday)) return 'გუშინ';
  return d.toLocaleDateString('ka-GE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function History() {
  const qc = useQueryClient();

  const { data: harness, isLoading: l1 } = useQuery({ queryKey: inspectionKeys.lists(), queryFn: () => listInspections() });
  const { data: bobcats, isLoading: l2 } = useQuery({ queryKey: bobcatKeys.lists(), queryFn: () => listBobcatInspections() });
  const { data: generalEq, isLoading: l3 } = useQuery({ queryKey: generalEquipmentKeys.lists(), queryFn: () => listGeneralEquipmentInspections() });
  const { data: excavators, isLoading: l4 } = useQuery({ queryKey: excavatorKeys.lists(), queryFn: () => listExcavatorInspections() });
  const { data: cargoPlatforms, isLoading: l5 } = useQuery({ queryKey: cargoPlatformKeys.lists(), queryFn: () => listCargoPlatformInspections() });
  const { data: projectList } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });

  const projects = projectList ? Object.fromEntries(projectList.map((p) => [p.id, p])) : {};
  const inspectionName = useInspectionName();
  const isLoading = l1 || l2 || l3 || l4 || l5;

  const allRows: Row[] = useMemo(() => {
    const rows: Row[] = [
      ...(harness ?? []).map((i): Row => {
        // The `inspections` table holds both harness AND scaffold acts (xaracho,
        // mobile_scaffold, mobile_scaffold_n3). Hardcoding 'harness' here gave
        // scaffold rows a harness badge. Read the template category off the
        // joined `template:templates(category)` and fall back to 'harness'.
        const tmpl = (i as { template?: { category?: string | null }[] | null }).template;
        const cat = Array.isArray(tmpl) ? tmpl[0]?.category ?? null : null;
        const type: Row['type'] = (cat && cat in TYPE_LABEL ? (cat as Row['type']) : 'harness');
        return {
          id: i.id,
          label: inspectionName(i.template_id),
          projectId: i.project_id,
          type,
          status: i.status,
          date: i.created_at ?? '',
          href: `/inspections/${i.id}`,
        };
      }),
      ...(bobcats ?? []).map((i): Row => ({
        id: i.id,
        label: equipmentInspectionName('bobcat'),
        projectId: i.projectId,
        type: 'bobcat',
        status: i.status,
        date: i.createdAt,
        href: `/bobcat/${i.id}`,
      })),
      ...(excavators ?? []).map((i): Row => ({
        id: i.id,
        label: equipmentInspectionName('excavator'),
        projectId: i.projectId,
        type: 'excavator',
        status: i.status,
        date: i.createdAt,
        href: `/excavator/${i.id}`,
      })),
      ...(generalEq ?? []).map((i): Row => ({
        id: i.id,
        label: equipmentInspectionName('general'),
        projectId: i.projectId,
        type: 'general',
        status: i.status,
        date: i.createdAt,
        href: `/general-equipment/${i.id}`,
      })),
      ...(cargoPlatforms ?? []).map((i): Row => ({
        id: i.id,
        label: equipmentInspectionName('cargo_platform'),
        projectId: i.projectId,
        type: 'cargo_platform',
        status: i.status,
        date: i.createdAt,
        href: `/cargo-platform/${i.id}`,
      })),
    ];
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [harness, bobcats, excavators, generalEq, cargoPlatforms, inspectionName]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of allRows) {
      const header = fmtDateHeader(row.date);
      if (!map.has(header)) map.set(header, []);
      map.get(header)!.push(row);
    }
    return Array.from(map.entries());
  }, [allRows]);

  const delInspection = useMutation({
    mutationFn: deleteInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: inspectionKeys.lists() }),
  });
  const delBobcat = useMutation({
    mutationFn: deleteBobcatInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: bobcatKeys.lists() }),
  });
  const delExcavator = useMutation({
    mutationFn: deleteExcavatorInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: excavatorKeys.lists() }),
  });
  const delGeneral = useMutation({
    mutationFn: deleteGeneralEquipmentInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: generalEquipmentKeys.lists() }),
  });
  const delCargo = useMutation({
    mutationFn: deleteCargoPlatformInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: cargoPlatformKeys.lists() }),
  });

  function handleDelete(row: Row) {
    const ok = window.confirm('წავშალოთ ეს ჩანაწერი?');
    if (!ok) return;
    // harness + scaffold types all live in the inspections table
    if (['harness', 'xaracho', 'mobile_scaffold', 'mobile_scaffold_n3'].includes(row.type)) {
      delInspection.mutate(row.id);
    } else if (row.type === 'bobcat') {
      delBobcat.mutate(row.id);
    } else if (row.type === 'excavator') {
      delExcavator.mutate(row.id);
    } else if (row.type === 'general') {
      delGeneral.mutate(row.id);
    } else if (row.type === 'cargo_platform') {
      delCargo.mutate(row.id);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900 dark:text-neutral-100">ისტორია</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">ბოლო ჩანაწერები ყველა ტიპიდან.</p>
      </header>

      {isLoading && <SkeletonList />}

      {!isLoading && allRows.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-800">
          <ClipboardList size={32} className="text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">ჩანაწერები არ არის</p>
        </div>
      )}

      {!isLoading &&
        grouped.map(([header, rows]) => (
          <div key={header} className="space-y-2">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {header}
            </h2>
            <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-800">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                >
                  <Link to={row.href} className="flex flex-1 items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TYPE_AVATAR[row.type]?.bg ?? 'bg-neutral-100 dark:bg-neutral-800'}`}>
                      <span className="text-base leading-none">{TYPE_AVATAR[row.type]?.emoji ?? '📋'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{row.label}</p>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {projects[row.projectId]?.name ?? '—'}
                        {' · '}
                        {new Date(row.date).toLocaleDateString('ka-GE')}
                      </p>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                      {TYPE_LABEL[row.type]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === 'completed'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                    <button
                      onClick={() => handleDelete(row)}
                      className="rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:text-red-600 hover:bg-red-50 group-hover:opacity-100 dark:hover:bg-red-900/20"
                      title="წაშლა"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
