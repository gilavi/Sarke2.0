import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

export default function Inspections() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project') ?? '';

  const { data: items, error: itemsError } = useQuery({
    queryKey: ['inspections'],
    queryFn: () => listInspections(),
  });
  const { data: bobcats } = useQuery({
    queryKey: ['bobcatInspections'],
    queryFn: () => listBobcatInspections(),
  });
  const { data: generalEq } = useQuery({
    queryKey: ['generalEquipmentInspections'],
    queryFn: () => listGeneralEquipmentInspections(),
  });
  const { data: excavators } = useQuery({
    queryKey: ['excavatorInspections'],
    queryFn: () => listExcavatorInspections(),
  });
  const { data: projectList } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  });

  const projects = projectList
    ? Object.fromEntries(projectList.map((p) => [p.id, p]))
    : {};
  const [filter, setFilter] = useState<string>(projectParam);

  const filtered = items?.filter((i) => !filter || i.project_id === filter) ?? null;
  const error = itemsError;

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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {Object.keys(projects).length > 0 && (
        <div>
          <label className="mr-2 text-sm text-neutral-600">პროექტი:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">ყველა</option>
            {Object.values(projects).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!filtered && !error && <p className="text-sm text-neutral-500">იტვირთება…</p>}

      {filtered && filtered.length === 0 && (
        <p className="text-sm text-neutral-500">აქტები ვერ მოიძებნა.</p>
      )}

      {bobcats && bobcats.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            ციცხვიანი / დიდი დამტვირთველი
          </h2>
          <div className="grid gap-3">
            {bobcats
              .filter((b) => !filter || b.projectId === filter)
              .map((b) => (
                <Link key={b.id} to={`/bobcat/${b.id}`}>
                  <Card className="transition hover:border-brand-300 hover:shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {b.equipmentModel || b.company || `აქტი #${b.id.slice(0, 8)}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between text-sm text-neutral-600">
                      <span>{projects[b.projectId]?.name ?? '—'}</span>
                      <span className="text-xs text-neutral-500">{b.status}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </section>
      )}

      {excavators && excavators.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            ექსკავატორი
          </h2>
          <div className="grid gap-3">
            {excavators
              .filter((x) => !filter || x.projectId === filter)
              .map((x) => (
                <Link key={x.id} to={`/excavator/${x.id}`}>
                  <Card className="transition hover:border-brand-300 hover:shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">
                        ექსკავატორი — {x.serialNumber || `#${x.id.slice(0, 8)}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between text-sm text-neutral-600">
                      <span>{projects[x.projectId]?.name ?? '—'}</span>
                      <span className="text-xs text-neutral-500">{x.status}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </section>
      )}

      {generalEq && generalEq.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            ტექნიკური აღჭურვილობა
          </h2>
          <div className="grid gap-3">
            {generalEq
              .filter((g) => !filter || g.projectId === filter)
              .map((g) => (
                <Link key={g.id} to={`/general-equipment/${g.id}`}>
                  <Card className="transition hover:border-brand-300 hover:shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {g.objectName || `ტექ. აქტი #${g.id.slice(0, 8)}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between text-sm text-neutral-600">
                      <span>{projects[g.projectId]?.name ?? '—'}</span>
                      <span className="text-xs text-neutral-500">
                        {g.equipment.length} ერთეული · {g.status}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </section>
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid gap-3">
          {filtered.map((i) => {
            const proj = projects[i.project_id];
            return (
              <Link key={i.id} to={`/inspections/${i.id}`}>
                <Card className="transition hover:border-brand-300 hover:shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {i.harness_name || `აქტი #${i.id.slice(0, 8)}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-sm text-neutral-600">
                    <span>{proj?.name ?? '—'}</span>
                    <span className="text-xs text-neutral-500">{i.status}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
