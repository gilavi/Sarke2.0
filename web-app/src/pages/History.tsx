import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ClipboardList, Trash2, ShieldCheck, Truck, Pickaxe, Wrench, Package } from 'lucide-react';
import { listInspections, deleteInspection } from '@/lib/data/inspections';
import { listBobcatInspections, deleteBobcatInspection } from '@/lib/data/bobcat';
import { listExcavatorInspections, deleteExcavatorInspection } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections, deleteGeneralEquipmentInspection } from '@/lib/data/generalEquipment';
import { listCargoPlatformInspections, deleteCargoPlatformInspection } from '@/lib/data/cargoPlatform';
import { listProjects } from '@/lib/data/projects';
import { SkeletonList } from '@/components/SkeletonCard';

const STATUS_LABEL: Record<string, string> = {
  draft: 'დრაფტი',
  completed: 'დასრულებული',
  in_progress: 'მიმდინარე',
};

const TYPE_LABEL: Record<string, string> = {
  harness: 'ხარაჩო / ქამარი',
  bobcat: 'ციცხვიანი',
  excavator: 'ექსკავატორი',
  general: 'ტექ. აღჭურვილობა',
  cargo_platform: 'კარგო პლატფორმა',
};

const TYPE_ICON: Record<string, React.ElementType> = {
  harness: ShieldCheck,
  bobcat: Truck,
  excavator: Pickaxe,
  general: Wrench,
  cargo_platform: Package,
};

const TYPE_ICON_BG: Record<string, string> = {
  harness: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  bobcat: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  excavator: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  general: 'bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400',
  cargo_platform: 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
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

  const { data: harness, isLoading: l1 } = useQuery({ queryKey: ['inspections'], queryFn: () => listInspections() });
  const { data: bobcats, isLoading: l2 } = useQuery({ queryKey: ['bobcatInspections'], queryFn: () => listBobcatInspections() });
  const { data: generalEq, isLoading: l3 } = useQuery({ queryKey: ['generalEquipmentInspections'], queryFn: () => listGeneralEquipmentInspections() });
  const { data: excavators, isLoading: l4 } = useQuery({ queryKey: ['excavatorInspections'], queryFn: () => listExcavatorInspections() });
  const { data: cargoPlatforms, isLoading: l5 } = useQuery({ queryKey: ['cargoPlatformInspections'], queryFn: () => listCargoPlatformInspections() });
  const { data: projectList } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const projects = projectList ? Object.fromEntries(projectList.map((p) => [p.id, p])) : {};
  const isLoading = l1 || l2 || l3 || l4 || l5;

  const allRows: Row[] = useMemo(() => {
    const rows: Row[] = [
      ...(harness ?? []).map((i): Row => ({
        id: i.id,
        label: i.harness_name || `აქტი #${i.id.slice(0, 8)}`,
        projectId: i.project_id,
        type: 'harness',
        status: i.status,
        date: i.created_at ?? '',
        href: `/inspections/${i.id}`,
      })),
      ...(bobcats ?? []).map((i): Row => ({
        id: i.id,
        label: i.equipmentModel || i.company || `ციცხვიანი #${i.id.slice(0, 8)}`,
        projectId: i.projectId,
        type: 'bobcat',
        status: i.status,
        date: i.createdAt,
        href: `/bobcat/${i.id}`,
      })),
      ...(excavators ?? []).map((i): Row => ({
        id: i.id,
        label: `ექსკავატორი${i.serialNumber ? ` — ${i.serialNumber}` : ''}`,
        projectId: i.projectId,
        type: 'excavator',
        status: i.status,
        date: i.createdAt,
        href: `/excavator/${i.id}`,
      })),
      ...(generalEq ?? []).map((i): Row => ({
        id: i.id,
        label: i.objectName || `ტექ. აქტი #${i.id.slice(0, 8)}`,
        projectId: i.projectId,
        type: 'general',
        status: i.status,
        date: i.createdAt,
        href: `/general-equipment/${i.id}`,
      })),
      ...(cargoPlatforms ?? []).map((i): Row => ({
        id: i.id,
        label: `კარგო პლატფორმა #${i.id.slice(0, 8)}`,
        projectId: i.projectId,
        type: 'cargo_platform',
        status: i.status,
        date: i.createdAt,
        href: `#`,
      })),
    ];
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [harness, bobcats, excavators, generalEq, cargoPlatforms]);

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inspections'] }),
  });
  const delBobcat = useMutation({
    mutationFn: deleteBobcatInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bobcatInspections'] }),
  });
  const delExcavator = useMutation({
    mutationFn: deleteExcavatorInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['excavatorInspections'] }),
  });
  const delGeneral = useMutation({
    mutationFn: deleteGeneralEquipmentInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['generalEquipmentInspections'] }),
  });
  const delCargo = useMutation({
    mutationFn: deleteCargoPlatformInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cargoPlatformInspections'] }),
  });

  function handleDelete(row: Row) {
    const ok = window.confirm('წავშალოთ ეს ჩანაწერი?');
    if (!ok) return;
    switch (row.type) {
      case 'harness':
        delInspection.mutate(row.id);
        break;
      case 'bobcat':
        delBobcat.mutate(row.id);
        break;
      case 'excavator':
        delExcavator.mutate(row.id);
        break;
      case 'general':
        delGeneral.mutate(row.id);
        break;
      case 'cargo_platform':
        delCargo.mutate(row.id);
        break;
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
                    {(() => {
                      const Icon = TYPE_ICON[row.type] ?? ClipboardList;
                      return (
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TYPE_ICON_BG[row.type] ?? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                          <Icon size={18} />
                        </div>
                      );
                    })()}
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
