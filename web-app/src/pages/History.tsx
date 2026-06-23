import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import DeleteButton from '@/components/DeleteButton';
import StatusBadge from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { InspectionTypeIcon } from '@/components/InspectionTypeIcon';
import { inspectionTypeMeta, INSPECTION_TYPE_META, type InspectionType } from '@/lib/inspectionTypeMeta';
import { listInspections, deleteInspection } from '@/lib/data/inspections';
import { listBobcatInspections, deleteBobcatInspection } from '@/lib/data/bobcat';
import { listExcavatorInspections, deleteExcavatorInspection } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections, deleteGeneralEquipmentInspection } from '@/lib/data/generalEquipment';
import { listCargoPlatformInspections, deleteCargoPlatformInspection } from '@/lib/data/cargoPlatform';
import { listProjects } from '@/lib/data/projects';
import { SkeletonList } from '@/components/SkeletonCard';
import { useInspectionName, equipmentInspectionName } from '@/lib/documentNames';
import { projectKeys, inspectionKeys, bobcatKeys, excavatorKeys, generalEquipmentKeys, cargoPlatformKeys } from '@/app/queryKeys';

interface Row {
  id: string;
  label: string;
  projectId: string;
  type: InspectionType;
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
        const type: Row['type'] = (cat && cat in INSPECTION_TYPE_META ? (cat as Row['type']) : 'harness');
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
        <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">ისტორია</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">ბოლო ჩანაწერები ყველა ტიპიდან.</p>
      </header>

      {isLoading && <SkeletonList />}

      {!isLoading && allRows.length === 0 && (
        <EmptyState icon={ClipboardList} title="ჩანაწერები არ არის" />
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
                    <InspectionTypeIcon type={row.type} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{row.label}</p>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {projects[row.projectId]?.name ?? '-'}
                        {' · '}
                        {new Date(row.date).toLocaleDateString('ka-GE')}
                      </p>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-xs font-medium text-neutral-400 dark:text-neutral-500 sm:inline">
                      {inspectionTypeMeta(row.type).label}
                    </span>
                    <StatusBadge status={row.status} />
                    <div className="opacity-0 transition-opacity group-hover:opacity-100">
                      <DeleteButton iconOnly onDelete={() => handleDelete(row)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
