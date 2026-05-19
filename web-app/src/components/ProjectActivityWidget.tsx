import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ChevronRight, ClipboardCheck, Truck, Pickaxe, Wrench, ShieldCheck, Building2 } from 'lucide-react';
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

const TYPE_META = {
  inspection: { icon: ClipboardCheck, color: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-950/30', label: 'შემოწმება' },
  bobcat:     { icon: Truck,          color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30',  label: 'ციცხვიანი' },
  general:    { icon: Wrench,         color: 'text-purple-600',bg: 'bg-purple-50 dark:bg-purple-950/30',label: 'ტექ. აღჭ.' },
  excavator:  { icon: Pickaxe,        color: 'text-blue-600',  bg: 'bg-blue-50 dark:bg-blue-950/30',    label: 'ექსკავატ.' },
};

const STALE = 1000 * 60 * 5;
const PREVIEW = 3;

interface Props {
  project: Project;
  onNewAct: () => void;
}

export function ProjectActivityWidget({ project, onNewAct }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { data: ins = [] }   = useQuery({ queryKey: ['inspections', project.id],        queryFn: () => listInspections(project.id),               staleTime: STALE });
  const { data: bobs = [] }  = useQuery({ queryKey: ['bobcat', project.id],              queryFn: () => listBobcatInspections(project.id),          staleTime: STALE });
  const { data: gens = [] }  = useQuery({ queryKey: ['generalEq', project.id],           queryFn: () => listGeneralEquipmentInspections(project.id), staleTime: STALE });
  const { data: excs = [] }  = useQuery({ queryKey: ['excavator', project.id],           queryFn: () => listExcavatorInspections(project.id),       staleTime: STALE });

  const all: ActivityItem[] = [
    ...ins.map(i  => ({ id: i.id, label: i.harness_name || 'შემოწმების აქტი', date: i.created_at ?? '', status: i.status, href: `/inspections/${i.id}`,       type: 'inspection' as const })),
    ...bobs.map(i => ({ id: i.id, label: i.equipmentModel || 'ციცხვიანი',     date: i.createdAt,        status: i.status, href: `/bobcat/${i.id}`,              type: 'bobcat' as const })),
    ...gens.map(i => ({ id: i.id, label: i.objectName || 'ტექ. აღჭ.',         date: i.createdAt,        status: i.status, href: `/general-equipment/${i.id}`,   type: 'general' as const })),
    ...excs.map(i => ({ id: i.id, label: i.serialNumber || 'ექსკავატორი',     date: i.createdAt,        status: i.status, href: `/excavator/${i.id}`,           type: 'excavator' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const visible = expanded ? all.slice(0, PREVIEW * 2) : all.slice(0, PREVIEW);
  const remaining = all.length - PREVIEW;

  /* Project avatar: logo data-URL or initials */
  const initials = (project.name || '?').slice(0, 2).toUpperCase();

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
        {/* Avatar */}
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
          {project.logo ? (
            <img src={project.logo} alt={project.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800">
              <Building2 size={16} className="text-neutral-400" />
            </div>
          )}
        </div>

        {/* Name + company */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{project.name}</p>
          {project.company_name && (
            <p className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">{project.company_name}</p>
          )}
        </div>

        {/* New act button */}
        <button
          type="button"
          onClick={onNewAct}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-brand-700 dark:hover:bg-brand-950/20 dark:hover:text-brand-400"
          aria-label="ახალი აქტი"
        >
          <Plus size={15} />
        </button>

        {/* Link to project */}
        <Link
          to={`/projects/${project.id}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          aria-label="პროექტის გახსნა"
        >
          <ChevronRight size={15} />
        </Link>
      </div>

      {/* Activity list */}
      {all.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">
          ჯერ ჩანაწერი არ არის
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {visible.map((item) => {
            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            return (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', meta.bg, meta.color)}>
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-neutral-800 dark:text-neutral-200">{item.label}</p>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                      {meta.label} · {item.date ? new Date(item.date).toLocaleDateString('ka-GE') : ''}
                    </p>
                  </div>
                  <span className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    item.status === 'completed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                  )}>
                    {item.status === 'completed' ? 'დასრ.' : 'დრაფტი'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* View more */}
      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-center gap-1 border-t border-neutral-100 px-4 py-2.5 text-[12px] font-medium text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-300"
        >
          კიდევ {remaining} ჩანაწერი <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}
