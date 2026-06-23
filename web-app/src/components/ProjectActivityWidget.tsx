import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight, Building2 } from 'lucide-react';
import { ActionIcon } from '@mantine/core';
import { type Project } from '@/lib/data/projects';
import { InspectionTypeIcon } from '@/components/InspectionTypeIcon';
import StatusBadge from '@/components/StatusBadge';
import { inspectionTypeMeta, type InspectionType } from '@/lib/inspectionTypeMeta';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listCargoPlatformInspections } from '@/lib/data/cargoPlatform';
import {
  inspectionKeys,
  bobcatKeys,
  generalEquipmentKeys,
  excavatorKeys,
  cargoPlatformKeys,
} from '@/app/queryKeys';
import { useInspectionName, equipmentInspectionName } from '@/lib/documentNames';

interface ActivityItem {
  id: string;
  label: string;
  date: string;
  status: string;
  href: string;
  // Harness + the three scaffold variants share the `inspections` table;
  // equipment tables keep their own dedicated types. Display meta (label +
  // illustration) is centralized in lib/inspectionTypeMeta — this used to carry
  // a divergent emoji/label map that drifted from History's.
  type: InspectionType;
}

const STALE = 1000 * 60 * 5;
const PREVIEW = 3;

interface Props {
  project: Project;
  onNewAct: () => void;
}

export function ProjectActivityWidget({ project, onNewAct }: Props) {
  const { data: ins = [] }   = useQuery({ queryKey: inspectionKeys.list(project.id),         queryFn: () => listInspections(project.id),                staleTime: STALE });
  const { data: bobs = [] }  = useQuery({ queryKey: bobcatKeys.list(project.id),              queryFn: () => listBobcatInspections(project.id),           staleTime: STALE });
  const { data: gens = [] }  = useQuery({ queryKey: generalEquipmentKeys.list(project.id),   queryFn: () => listGeneralEquipmentInspections(project.id),  staleTime: STALE });
  const { data: excs = [] }  = useQuery({ queryKey: excavatorKeys.list(project.id),           queryFn: () => listExcavatorInspections(project.id),        staleTime: STALE });
  const { data: cargo = [] } = useQuery({ queryKey: cargoPlatformKeys.list(project.id),       queryFn: () => listCargoPlatformInspections(project.id),    staleTime: STALE });

  const inspectionName = useInspectionName();
  const all: ActivityItem[] = [
    ...ins.map(i  => {
      // Distinguish scaffold acts (xaracho / mobile_scaffold / mobile_scaffold_n3)
      // from harness via the joined template.category - otherwise every
      // inspections-table row gets the harness badge (BUG-21).
      const cat = Array.isArray(i.template) ? i.template[0]?.category : null;
      const type: ActivityItem['type'] =
        cat === 'xaracho' || cat === 'mobile_scaffold' || cat === 'mobile_scaffold_n3'
          ? cat
          : 'harness';
      // Preserve original href logic: only category='harness' goes to the
      // dedicated /harness route. Everything else (scaffold + unknown
      // templates like "ციცხვიანი დამტვირთველი") stays on the generic
      // /inspections route so unknown templates don't break the harness
      // detail page.
      const href = cat === 'harness' ? `/harness/${i.id}` : `/inspections/${i.id}`;
      return { id: i.id, label: inspectionName(i.template_id), date: i.created_at ?? '', status: i.status, href, type };
    }),
    ...bobs.map(i  => ({ id: i.id, label: equipmentInspectionName('bobcat'),          date: i.createdAt, status: i.status, href: `/bobcat/${i.id}`,             type: 'bobcat' as const })),
    ...gens.map(i  => ({ id: i.id, label: equipmentInspectionName('general'),         date: i.createdAt, status: i.status, href: `/general-equipment/${i.id}`,  type: 'general' as const })),
    ...excs.map(i  => ({ id: i.id, label: equipmentInspectionName('excavator'),       date: i.createdAt, status: i.status, href: `/excavator/${i.id}`,          type: 'excavator' as const })),
    ...cargo.map(i => ({ id: i.id, label: equipmentInspectionName('cargo_platform'),  date: i.createdAt, status: i.status, href: `/cargo-platform/${i.id}`,     type: 'cargo_platform' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const visible = all.slice(0, PREVIEW);
  const remaining = all.length - PREVIEW;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {/* ── Project header ── */}
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
          {project.logo ? (
            <img src={project.logo} alt={project.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800">
              <Building2 size={16} className="text-neutral-400" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{project.name}</p>
          {project.company_name && project.company_name !== project.name && (
            <p className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">{project.company_name}</p>
          )}
        </div>
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          size="sm"
          onClick={onNewAct}
          aria-label="ახალი აქტი"
        >
          <Plus size={15} />
        </ActionIcon>
      </div>

      {/* ── Activity rows ── */}
      {all.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">ჯერ ჩანაწერი არ არის</div>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {visible.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <InspectionTypeIcon type={item.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-neutral-800 dark:text-neutral-200">{item.label}</p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    {inspectionTypeMeta(item.type).label} · {item.date ? new Date(item.date).toLocaleDateString('ka-GE') : ''}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* ── View more ── */}
      {remaining > 0 && (
        <Link
          to={`/projects/${project.id}`}
          className="flex items-center justify-center gap-1 border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
        >
          კიდევ {remaining} ჩანაწერი <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}
