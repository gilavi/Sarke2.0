import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ClipboardCheck,
  Megaphone,
  AlertTriangle,
  X,
} from 'lucide-react';
import { listInspections } from '@/lib/data/inspections';
import { listBobcatInspections } from '@/lib/data/bobcat';
import { listExcavatorInspections } from '@/lib/data/excavator';
import { listGeneralEquipmentInspections } from '@/lib/data/generalEquipment';
import { listBriefings } from '@/lib/data/briefings';
import { listIncidents } from '@/lib/data/incidents';
import { listProjects } from '@/lib/data/projects';
import { SkeletonList } from '@/components/SkeletonCard';

/* ─── Types ─── */

interface CalendarEvent {
  id: string;
  href: string;
  title: string;
  projectName: string;
  date: Date;
  kind: 'inspection' | 'briefing' | 'incident';
  status: string;
}

/* ─── Constants ─── */

const MONTH_NAMES = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];

const WEEKDAYS = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

const KIND_STYLES = {
  inspection: {
    label: 'აქტი',
    icon: ClipboardCheck,
    bg: 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
    border: 'border-brand-200 dark:border-brand-900',
  },
  briefing: {
    label: 'ბრიფინგი',
    icon: Megaphone,
    bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-900',
  },
  incident: {
    label: 'ინციდენტი',
    icon: AlertTriangle,
    bg: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    border: 'border-red-200 dark:border-red-900',
  },
};

/* ─── Helpers ─── */

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildItems(
  inspections: Awaited<ReturnType<typeof listInspections>>,
  bobcats: Awaited<ReturnType<typeof listBobcatInspections>>,
  excavators: Awaited<ReturnType<typeof listExcavatorInspections>>,
  generalEq: Awaited<ReturnType<typeof listGeneralEquipmentInspections>>,
  briefings: Awaited<ReturnType<typeof listBriefings>>,
  incidents: Awaited<ReturnType<typeof listIncidents>>,
  projectMap: Map<string, { name: string }>,
): CalendarEvent[] {
  const out: CalendarEvent[] = [];

  for (const inc of incidents) {
    const date = new Date(inc.date_time);
    if (Number.isNaN(date.getTime())) continue;
    out.push({
      id: `inc-${inc.id}`,
      href: `/incidents/${inc.id}`,
      title: inc.type || 'ინციდენტი',
      projectName: projectMap.get(inc.project_id)?.name ?? '—',
      date,
      kind: 'incident',
      status: inc.status,
    });
  }

  for (const i of inspections) {
    const dateStr = i.completed_at || i.created_at;
    if (!dateStr) continue;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) continue;
    out.push({
      id: `insp-${i.id}`,
      href: `/inspections/${i.id}`,
      title: i.harness_name || `აქტი #${i.id.slice(0, 8)}`,
      projectName: projectMap.get(i.project_id)?.name ?? '—',
      date,
      kind: 'inspection',
      status: i.status,
    });
  }

  for (const i of bobcats) {
    const dateStr = i.completedAt || i.createdAt;
    if (!dateStr) continue;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) continue;
    out.push({
      id: `bobcat-${i.id}`,
      href: `/bobcat/${i.id}`,
      title: i.equipmentModel || i.company || `ციცხვიანი #${i.id.slice(0, 8)}`,
      projectName: projectMap.get(i.projectId)?.name ?? '—',
      date,
      kind: 'inspection',
      status: i.status,
    });
  }

  for (const i of excavators) {
    const dateStr = i.completedAt || i.createdAt;
    if (!dateStr) continue;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) continue;
    out.push({
      id: `exc-${i.id}`,
      href: `/excavator/${i.id}`,
      title: `ექსკავატორი${i.serialNumber ? ` — ${i.serialNumber}` : ''}`,
      projectName: projectMap.get(i.projectId)?.name ?? '—',
      date,
      kind: 'inspection',
      status: i.status,
    });
  }

  for (const i of generalEq) {
    const dateStr = i.completedAt || i.createdAt;
    if (!dateStr) continue;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) continue;
    out.push({
      id: `ge-${i.id}`,
      href: `/general-equipment/${i.id}`,
      title: i.objectName || `ტექ. აქტი #${i.id.slice(0, 8)}`,
      projectName: projectMap.get(i.projectId)?.name ?? '—',
      date,
      kind: 'inspection',
      status: i.status,
    });
  }

  for (const b of briefings) {
    const date = new Date(b.dateTime);
    if (Number.isNaN(date.getTime())) continue;
    out.push({
      id: `brief-${b.id}`,
      href: `/briefings/${b.id}`,
      title: b.topics?.[0] || 'ბრიფინგი',
      projectName: projectMap.get(b.projectId)?.name ?? '—',
      date,
      kind: 'briefing',
      status: b.status,
    });
  }

  return out.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/* ─── Calendar grid helpers ─── */

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getCalendarGrid(year: number, month: number): (Date | null)[] {
  const days = getDaysInMonth(year, month);
  const firstDay = days[0].getDay(); // 0 = Sunday
  const grid: (Date | null)[] = [];

  // Empty cells before the first day
  for (let i = 0; i < firstDay; i++) grid.push(null);

  // Days of the month
  grid.push(...days);

  // Pad to multiple of 7
  while (grid.length % 7 !== 0) grid.push(null);

  return grid;
}

/* ─── Page ─── */

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [dayModal, setDayModal] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);

  const inspectionsQ = useQuery({ queryKey: ['inspections'], queryFn: () => listInspections() });
  const bobcatQ = useQuery({ queryKey: ['bobcatInspections'], queryFn: () => listBobcatInspections() });
  const excavatorQ = useQuery({ queryKey: ['excavatorInspections'], queryFn: () => listExcavatorInspections() });
  const generalQ = useQuery({ queryKey: ['generalEquipmentInspections'], queryFn: () => listGeneralEquipmentInspections() });
  const briefingQ = useQuery({ queryKey: ['briefings'], queryFn: () => listBriefings() });
  const incidentQ = useQuery({ queryKey: ['incidents'], queryFn: () => listIncidents() });
  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: () => listProjects() });

  const isLoading =
    inspectionsQ.isLoading ||
    bobcatQ.isLoading ||
    excavatorQ.isLoading ||
    generalQ.isLoading ||
    briefingQ.isLoading ||
    incidentQ.isLoading ||
    projectsQ.isLoading;

  const error =
    inspectionsQ.error ??
    bobcatQ.error ??
    excavatorQ.error ??
    generalQ.error ??
    briefingQ.error ??
    incidentQ.error ??
    projectsQ.error;

  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const p of projectsQ.data ?? []) map.set(p.id, p);
    return map;
  }, [projectsQ.data]);

  const allEvents = useMemo(() => {
    if (isLoading) return [];
    return buildItems(
      inspectionsQ.data ?? [],
      bobcatQ.data ?? [],
      excavatorQ.data ?? [],
      generalQ.data ?? [],
      briefingQ.data ?? [],
      incidentQ.data ?? [],
      projectMap,
    );
  }, [inspectionsQ.data, bobcatQ.data, excavatorQ.data, generalQ.data, briefingQ.data, incidentQ.data, projectMap, isLoading]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const grid = useMemo(() => getCalendarGrid(year, month), [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of allEvents) {
      const key = `${ev.date.getFullYear()}-${ev.date.getMonth()}-${ev.date.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [allEvents]);

  const today = startOfDay(new Date());

  function goPrev() {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function goNext() {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
  function goToday() {
    setCurrentMonth(new Date());
  }

  const monthEventsCount = useMemo(() => {
    let count = 0;
    for (const ev of allEvents) {
      if (ev.date.getFullYear() === year && ev.date.getMonth() === month) count++;
    }
    return count;
  }, [allEvents, year, month]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-neutral-900 dark:text-neutral-100">კალენდარი</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {monthEventsCount > 0 ? `${monthEventsCount} ჩანაწერი ამ თვეში` : 'შემოწმებები, ბრიფინგები და ინციდენტები'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            დღეს
          </button>
          <div className="flex items-center rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <button
              onClick={goPrev}
              className="rounded-l-lg p-2 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[140px] px-2 py-2 text-center text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              onClick={goNext}
              className="rounded-r-lg p-2 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {isLoading && <SkeletonList />}

      {!isLoading && allEvents.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <CalendarDays size={32} className="text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">ჩანაწერები ჯერ არ არის.</p>
        </div>
      )}

      {!isLoading && allEvents.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900 sm:p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="pb-2 text-center text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {wd}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            <AnimatePresence mode="popLayout">
              {grid.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="min-h-[80px] rounded-lg bg-neutral-50/50 dark:bg-neutral-800/30" />;
                }

                const isToday = isSameDay(day, today);
                const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                const dayEvents = eventsByDay.get(key) ?? [];

                return (
                  <motion.div
                    key={key}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className={`relative flex min-h-[80px] flex-col gap-0.5 rounded-lg border p-1.5 transition-colors sm:min-h-[100px] sm:p-2 ${
                      isToday
                        ? 'border-brand-300 bg-brand-50/60 dark:border-brand-800 dark:bg-brand-950/20'
                        : 'border-neutral-100 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    <span
                      className={`self-start rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                        isToday
                          ? 'bg-brand-500 text-white'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {day.getDate()}
                    </span>

                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {dayEvents.slice(0, 3).map((ev) => {
                        const style = KIND_STYLES[ev.kind];
                        return (
                          <Link
                            key={ev.id}
                            to={ev.href}
                            className={`truncate rounded border px-1.5 py-0.5 text-[10px] font-medium transition hover:brightness-95 sm:text-xs ${style.bg} ${style.border}`}
                            title={ev.title}
                          >
                            {ev.title}
                          </Link>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <button
                          onClick={() => setDayModal({ date: day, events: dayEvents })}
                          className="mt-0.5 text-left text-[10px] font-medium text-brand-600 hover:underline dark:text-brand-400"
                        >
                          +{dayEvents.length - 3} სხვა
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Legend */}
      {!isLoading && allEvents.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(KIND_STYLES).map(([kind, style]) => {
            const Icon = style.icon;
            return (
              <div key={kind} className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <div className={`flex h-5 w-5 items-center justify-center rounded ${style.bg}`}>
                  <Icon size={10} />
                </div>
                <span>{style.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Day overflow modal */}
      <AnimatePresence>
        {dayModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setDayModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
                <div>
                  <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {dayModal.date.getDate()} {MONTH_NAMES[dayModal.date.getMonth()]}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {dayModal.events.length} ჩანაწერი
                  </p>
                </div>
                <button
                  onClick={() => setDayModal(null)}
                  className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-3">
                <div className="flex flex-col gap-2">
                  {dayModal.events.map((ev) => {
                    const style = KIND_STYLES[ev.kind];
                    const Icon = style.icon;
                    return (
                      <Link
                        key={ev.id}
                        to={ev.href}
                        onClick={() => setDayModal(null)}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:brightness-95 ${style.bg} ${style.border}`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/60 dark:bg-black/20">
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{ev.title}</p>
                          <p className="truncate text-[11px] opacity-80">{ev.projectName}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
