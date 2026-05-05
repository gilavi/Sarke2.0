import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listInspections, type Inspection } from '@/lib/data/inspections';
import { listBriefings, type Briefing } from '@/lib/data/briefings';
import { listProjects, type Project } from '@/lib/data/projects';

interface CalendarItem {
  id: string;
  href: string;
  title: string;
  projectName: string;
  date: Date;
  kind: 'inspection' | 'briefing';
  status: string;
}

interface MonthBucket {
  key: string;
  label: string;
  items: CalendarItem[];
}

const MONTH_NAMES = [
  'იანვარი',
  'თებერვალი',
  'მარტი',
  'აპრილი',
  'მაისი',
  'ივნისი',
  'ივლისი',
  'აგვისტო',
  'სექტემბერი',
  'ოქტომბერი',
  'ნოემბერი',
  'დეკემბერი',
];

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function buildItems(
  inspections: Inspection[],
  briefings: Briefing[],
  projects: Map<string, Project>,
): CalendarItem[] {
  const out: CalendarItem[] = [];
  for (const i of inspections) {
    if (i.status !== 'completed' || !i.completed_at) continue;
    const date = new Date(i.completed_at);
    if (Number.isNaN(date.getTime())) continue;
    out.push({
      id: `insp-${i.id}`,
      href: `/inspections/${i.id}`,
      title: i.harness_name || `აქტი #${i.id.slice(0, 8)}`,
      projectName: projects.get(i.project_id)?.name ?? '—',
      date,
      kind: 'inspection',
      status: 'completed',
    });
  }
  for (const b of briefings) {
    const date = new Date(b.dateTime);
    if (Number.isNaN(date.getTime())) continue;
    out.push({
      id: `brief-${b.id}`,
      href: `/briefings/${b.id}`,
      title: 'ბრიფინგი',
      projectName: projects.get(b.projectId)?.name ?? '—',
      date,
      kind: 'briefing',
      status: b.status,
    });
  }
  return out;
}

function bucketByMonth(items: CalendarItem[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>();
  for (const it of items) {
    const key = `${it.date.getFullYear()}-${String(it.date.getMonth()).padStart(2, '0')}`;
    const label = `${MONTH_NAMES[it.date.getMonth()]} ${it.date.getFullYear()}`;
    if (!map.has(key)) map.set(key, { key, label, items: [] });
    map.get(key)!.items.push(it);
  }
  const out = [...map.values()];
  out.sort((a, b) => (a.key < b.key ? 1 : -1));
  for (const b of out) b.items.sort((a, c) => c.date.getTime() - a.date.getTime());
  return out;
}

interface Summary {
  today: number;
  thisWeek: number;
  overdueDrafts: number;
}

function summarize(items: CalendarItem[]): Summary {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let todayCount = 0;
  let weekCount = 0;
  let overdue = 0;
  for (const it of items) {
    const d = startOfDay(it.date);
    if (d.getTime() === today.getTime()) todayCount++;
    if (d >= today && d < weekEnd) weekCount++;
    if (it.kind === 'briefing' && it.status === 'draft' && d < today) overdue++;
  }
  return { today: todayCount, thisWeek: weekCount, overdueDrafts: overdue };
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'brand' | 'warn';
}) {
  const toneClass =
    tone === 'warn'
      ? 'text-red-700'
      : tone === 'brand'
        ? 'text-brand-700'
        : 'text-neutral-900';
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

export default function Calendar() {
  const [inspections, setInspections] = useState<Inspection[] | null>(null);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listInspections(), listBriefings(), listProjects()])
      .then(([ins, bs, ps]) => {
        setInspections(ins);
        setBriefings(bs);
        setProjects(ps);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const items = useMemo(() => {
    if (!inspections) return null;
    return buildItems(inspections, briefings, new Map(projects.map((p) => [p.id, p])));
  }, [inspections, briefings, projects]);

  const buckets = useMemo(() => (items ? bucketByMonth(items) : null), [items]);
  const summary = useMemo(() => (items ? summarize(items) : null), [items]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900">კალენდარი</h1>
        <p className="mt-1 text-sm text-neutral-500">
          შემოწმებები და ბრიფინგები თარიღების მიხედვით.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid gap-3 md:grid-cols-3">
          <StatTile label="დღეს" value={summary.today} tone="brand" />
          <StatTile label="ამ კვირაში" value={summary.thisWeek} tone="neutral" />
          <StatTile label="ვადაგადაცილებული" value={summary.overdueDrafts} tone="warn" />
        </div>
      )}

      {!buckets && !error && <p className="text-sm text-neutral-500">იტვირთება…</p>}
      {buckets && buckets.length === 0 && (
        <p className="text-sm text-neutral-500">ჩანაწერები ჯერ არ არის.</p>
      )}

      {buckets &&
        buckets.map((b) => (
          <section key={b.key}>
            <h2 className="mb-3 font-display text-lg font-semibold text-neutral-700">{b.label}</h2>
            <div className="grid gap-2">
              {b.items.map((it) => (
                <Link key={it.id} to={it.href}>
                  <Card className="transition hover:border-brand-300 hover:shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              it.kind === 'briefing'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-brand-50 text-brand-700'
                            }`}
                          >
                            {it.kind === 'briefing' ? 'ბრიფინგი' : 'აქტი'}
                          </span>
                          <span>{it.title}</span>
                        </span>
                        <span className="text-xs font-normal text-neutral-500">
                          {it.date.toLocaleDateString('ka-GE', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-neutral-600">
                      {it.projectName}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
