import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, buttonVariants } from '@/components/ui/button';
import { SkeletonList } from '@/components/SkeletonCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listProjects } from '@/lib/data/projects';

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

export default function Inspections() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project') ?? '';

  const { data: harness, isLoading: l1 } = useQuery({ queryKey: ['inspections'], queryFn: () => listInspections() });
  const { data: bobcats, isLoading: l2 } = useQuery({ queryKey: ['bobcatInspections'], queryFn: () => listBobcatInspections() });
  const { data: generalEq, isLoading: l3 } = useQuery({ queryKey: ['generalEquipmentInspections'], queryFn: () => listGeneralEquipmentInspections() });
  const { data: excavators, isLoading: l4 } = useQuery({ queryKey: ['excavatorInspections'], queryFn: () => listExcavatorInspections() });
  const { data: projectList } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const projects = projectList ? Object.fromEntries(projectList.map((p) => [p.id, p])) : {};
  const [filter, setFilter] = useState<string>(projectParam);

  const isLoading = l1 || l2 || l3 || l4;

  const allRows: Row[] = [
    ...(harness ?? []).map((i): Row => ({
      id: i.id, label: i.harness_name || `აქტი #${i.id.slice(0, 8)}`,
      projectId: i.project_id, type: 'harness', status: i.status,
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
  ]
    .filter((r) => !filter || r.projectId === filter)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          {filter && projects[filter] && (
            <Link to={`/projects/${filter}`} className="mb-2 inline-block text-sm text-brand-600 hover:underline">
              ← {projects[filter].name}
            </Link>
          )}
          <h1 className="font-display text-3xl font-bold text-neutral-900">შემოწმების აქტები</h1>
          <p className="mt-1 text-sm text-neutral-500">ყველა აქტი თქვენი ანგარიშიდან.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>+ ახალი შემოწმება</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => navigate(`/inspections/new${filter ? `?project=${filter}` : ''}`)}>
              ფასადის ხარაჩოს შემოწმების აქტი
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`/inspections/new${filter ? `?project=${filter}` : ''}`)}>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {Object.keys(projects).length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-600">პროექტი:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">ყველა</option>
            {Object.values(projects).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {isLoading && <SkeletonList />}

      {!isLoading && allRows.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center">
          <p className="text-sm text-neutral-500">
            {filter ? 'ამ პროექტში აქტები ვერ მოიძებნა.' : 'შემოწმების აქტები ჯერ არ გაქვთ.'}
          </p>
          {!filter && (
            <Link to="/inspections/new" className={buttonVariants({ size: 'sm' })}>+ ახალი აქტი</Link>
          )}
        </div>
      )}

      {allRows.length > 0 && (
        <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {allRows.map((row) => (
            <Link
              key={row.id}
              to={row.href}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-neutral-900">{row.label}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {projects[row.projectId]?.name ?? '—'}
                  {' · '}
                  {new Date(row.date).toLocaleDateString('ka-GE')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                  {TYPE_LABEL[row.type]}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  row.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
