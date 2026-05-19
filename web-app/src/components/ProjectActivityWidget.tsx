import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Project } from '@/lib/data/projects';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listExcavatorInspections } from '@/lib/data/excavator';

interface ActivityItem {
  id: string;
  label: string;
  date: string;
  status: string;
  href: string;
  type: 'inspection' | 'bobcat' | 'general' | 'excavator';
}

/** Maps each inspection type to the emoji + pastel bg that mobile InspectionTypeAvatar uses. */
const ACTIVITY_TYPE_AVATAR: Record<ActivityItem['type'], { emoji: string; bg: string; label: string }> = {
  inspection: { emoji: '🦺', bg: 'bg-blue-50 dark:bg-blue-950/20',       label: 'შემოწმება' },
  bobcat:     { emoji: '🚜', bg: 'bg-amber-50 dark:bg-amber-950/20',     label: 'ციცხვიანი' },
  general:    { emoji: '⚙️', bg: 'bg-emerald-50 dark:bg-emerald-950/20', label: 'ტექ. აღჭ.' },
  excavator:  { emoji: '🚧', bg: 'bg-orange-50 dark:bg-orange-950/20',   label: 'ექსკავ.' },
};

const STALE = 1000 * 60 * 5;
const PREVIEW = 3;

interface Props {
  project: Project;
  onNewAct: () => void;
}

export function ProjectActivityWidget({ project, onNewAct }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { data: ins = [] }  = useQuery({ queryKey: ['inspections', project.id],         queryFn: () => listInspections(project.id),                staleTime: STALE });
  const { data: bobs = [] } = useQuery({ queryKey: ['bobcat', project.id],               queryFn: () => listBobcatInspections(project.id),           staleTime: STALE });
  const { data: gens = [] } = useQuery({ queryKey: ['generalEq', project.id],            queryFn: () => listGeneralEquipmentInspections(project.id),  staleTime: STALE });
  const { data: excs = [] } = useQuery({ queryKey: ['excavator', project.id],            queryFn: () => listExcavatorInspections(project.id),        staleTime: STALE });

  const all: ActivityItem[] = [
    ...ins.map(i  => ({ id: i.id, label: i.harness_name  || 'შემოწმების აქტი', date: i.created_at ?? '', status: i.status, href: `/inspections/${i.id}`,      type: 'inspection' as const })),
    ...bobs.map(i => ({ id: i.id, label: i.equipmentModel || 'ციცხვიანი',      date: i.createdAt,        status: i.status, href: `/bobcat/${i.id}`,             type: 'bobcat' as const })),
    ...gens.map(i => ({ id: i.id, label: i.objectName     || 'ტექ. აღჭ.',      date: i.createdAt,        status: i.status, href: `/general-equipment/${i.id}`,  type: 'general' as const })),
    ...excs.map(i => ({ id: i.id, label: i.serialNumber   || 'ექსკავატ.',      date: i.createdAt,        status: i.status, href: `/excavator/${i.id}`,          type: 'excavator' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const visible = expanded ? all.slice(0, PREVIEW * 2) : all.slice(0, PREVIEW);
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
        <button
          type="button"
          onClick={onNewAct}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-all hover:text-neutral-600 hover:ring-1 hover:ring-neutral-300 dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:ring-neutral-600"
          aria-label="ახალი აქტი"
        >
          <Plus size={15} />
        </button>
        <Link
          to={`/projects/${project.id}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          aria-label="პროექტის გახსნა"
        >
          <ChevronRight size={15} />
        </Link>
      </div>

      {/* ── Activity rows ── */}
      {all.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">ჯერ ჩანაწერი არ არის</div>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {visible.map((item) => {
            const av = ACTIVITY_TYPE_AVATAR[item.type];
            return (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  {/* Emoji avatar — matches mobile InspectionTypeAvatar style */}
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', av.bg)}>
                    <span className="text-lg leading-none">{av.emoji}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-neutral-800 dark:text-neutral-200">{item.label}</p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                      {av.label} · {item.date ? new Date(item.date).toLocaleDateString('ka-GE') : ''}
                    </p>
                  </div>
                  <span className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    item.status === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                  )}>
                    {item.status === 'completed' ? 'დასრულდა' : 'დრაფტი'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── View more ── */}
      {!expanded && remaining > 0 && (
        <li className="list-none border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="group flex w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
              <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500">+{remaining}</span>
            </div>
            <p className="flex-1 text-left text-[13px] font-medium text-neutral-500 dark:text-neutral-400">
              კიდევ {remaining} ჩანაწერი
            </p>
            <ChevronRight size={13} className="shrink-0 text-neutral-300 dark:text-neutral-600" />
          </button>
        </li>
      )}
    </div>
  );
}
