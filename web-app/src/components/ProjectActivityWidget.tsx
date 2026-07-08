import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight } from 'lucide-react';
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
import { routes } from '@/app/routes';
import { osmTileUrl } from '@/lib/mapTile';

interface ActivityItem {
  id: string;
  label: string;
  date: string;
  status: string;
  href: string;
  // Harness + the three scaffold variants share the `inspections` table;
  // equipment tables keep their own dedicated types. Display meta (label +
  // illustration) is centralized in lib/inspectionTypeMeta.
  type: InspectionType;
}

const STALE = 1000 * 60 * 5;
const PREVIEW = 3;

function projectInitials(name: string): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  return Array.from(trimmed).slice(0, 2).join('').toLocaleUpperCase('ka-GE');
}

interface Props {
  project: Project;
  onNewAct: () => void;
}

/**
 * Home project card. The header mirrors the /projects ProjectCard exactly — the
 * project-location map fills it (greyscale, radially faded toward the bottom-left
 * so the map peeks at the top-right), the round logo sits top-left and the name +
 * address bottom-left over the map. The recent-activity list is attached on a
 * clean surface below.
 */
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
      // from harness via the joined template.category.
      const cat = Array.isArray(i.template) ? i.template[0]?.category : null;
      const type: ActivityItem['type'] =
        cat === 'xaracho' || cat === 'mobile_scaffold' || cat === 'mobile_scaffold_n3'
          ? cat
          : 'harness';
      // Generic harness/scaffold acts open the shared result page (read-only
      // summary + signature + PDF), matching the History list.
      const href = routes.inspections.detail(i.id);
      return { id: i.id, label: inspectionName(i.template_id), date: i.created_at ?? '', status: i.status, href, type };
    }),
    ...bobs.map(i  => ({ id: i.id, label: equipmentInspectionName('bobcat'),          date: i.createdAt, status: i.status, href: `/bobcat/${i.id}`,             type: 'bobcat' as const })),
    ...gens.map(i  => ({ id: i.id, label: equipmentInspectionName('general'),         date: i.createdAt, status: i.status, href: `/general-equipment/${i.id}`,  type: 'general' as const })),
    ...excs.map(i  => ({ id: i.id, label: equipmentInspectionName('excavator'),       date: i.createdAt, status: i.status, href: `/excavator/${i.id}`,          type: 'excavator' as const })),
    ...cargo.map(i => ({ id: i.id, label: equipmentInspectionName('cargo_platform'),  date: i.createdAt, status: i.status, href: `/cargo-platform/${i.id}`,     type: 'cargo_platform' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const visible = all.slice(0, PREVIEW);
  const remaining = all.length - PREVIEW;

  const tileUrl =
    project.latitude != null && project.longitude != null
      ? osmTileUrl(project.latitude, project.longitude)
      : null;
  const subline =
    project.company_name && project.company_name !== project.name
      ? project.company_name
      : project.address || null;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 dark:border-neutral-800 dark:bg-neutral-900">
      {/* ── Map header (mirrors the /projects card) ── */}
      <div className="relative flex h-[148px] flex-col justify-between border-b border-neutral-100 p-4 dark:border-neutral-800">
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
            <span className="absolute left-[80%] top-[26%] h-2 w-2 animate-pulse rounded-full bg-brand-500 ring-2 ring-white dark:ring-neutral-900" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-neutral-100 dark:from-brand-950/30 dark:to-neutral-800" />
        )}

        {/* Top row: logo + new-act */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900/40">
            {project.logo ? (
              <img src={project.logo} alt={project.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-base font-semibold text-brand-700 dark:text-brand-300">
                {projectInitials(project.name)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onNewAct}
            aria-label="ახალი აქტი"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/90 text-neutral-700 backdrop-blur-sm transition hover:bg-white hover:text-brand-600 dark:bg-neutral-800/90 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Bottom: name + address */}
        <div className="relative z-10 min-w-0">
          <p className="truncate text-[18px] font-medium leading-tight text-neutral-900 dark:text-neutral-100">
            {project.name}
          </p>
          {subline && (
            <p className="mt-0.5 truncate text-[11px] text-neutral-500 dark:text-neutral-400">{subline}</p>
          )}
        </div>
      </div>

      {/* ── Recent activity ── */}
      <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
        ბოლო აქტები
      </p>
      {all.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">ჯერ ჩანაწერი არ არის</div>
      ) : (
        <ul className="mt-1 px-2">
          {visible.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href}
                className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
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
          className="mt-1 flex items-center justify-center gap-1 border-t border-neutral-100 px-4 py-2.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-brand-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
        >
          კიდევ {remaining} ჩანაწერი <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}
