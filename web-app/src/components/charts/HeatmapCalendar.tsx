import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface HeatmapCalendarProps {
  data: { date: string; count: number }[];
  color?: string;
}

const DAY_LABELS = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი'];
const MONTH_NAMES = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

const WEEKS = 10; // fewer weeks → bigger cells that breathe

export function HeatmapCalendar({ data }: HeatmapCalendarProps) {
  const [hovered, setHovered] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  const { weeks, monthLabels, maxCount, counts } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of data) {
      const key = d.date.slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + d.count);
    }

    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const weeks: { date: string; dayIndex: number }[][] = [];
    const monthLabels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < WEEKS; w++) {
      const weekDays: { date: string; dayIndex: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(endDate);
        dt.setDate(dt.getDate() - ((WEEKS - 1 - w) * 7 + (6 - d)));
        const iso = dt.toISOString().slice(0, 10);
        weekDays.push({ date: iso, dayIndex: d });

        if (dt.getDate() <= 7 && dt.getMonth() !== lastMonth) {
          monthLabels.push({ label: MONTH_NAMES[dt.getMonth()], weekIndex: w });
          lastMonth = dt.getMonth();
        }
      }
      weeks.push(weekDays);
    }

    const maxCount = Math.max(1, ...Array.from(counts.values()));
    return { weeks, monthLabels, maxCount, counts };
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-neutral-100 dark:bg-neutral-800/60';
    const intensity = Math.min(1, count / maxCount);
    if (intensity <= 0.25) return 'bg-brand-200 dark:bg-brand-900/40';
    if (intensity <= 0.5)  return 'bg-brand-300 dark:bg-brand-800/50';
    if (intensity <= 0.75) return 'bg-brand-400 dark:bg-brand-700/60';
    return 'bg-brand-500 dark:bg-brand-500/70';
  };

  const totalActive = useMemo(() => Array.from(counts.values()).filter((c) => c > 0).length, [counts]);
  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (counts.get(d.toISOString().slice(0, 10)) || i === 0) s++;
      else if (i > 0) break;
    }
    return s;
  }, [counts]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Stats row */}
      <div className="flex gap-6">
        <div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{totalActive}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">აქტიური დღე</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{streak}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">დღე სერიაში</p>
        </div>
      </div>

      {/* Month labels — sits above the grid, aligned to week columns */}
      <div className="flex pl-9 gap-1">
        {weeks.map((_, wi) => {
          const label = monthLabels.find((m) => m.weekIndex === wi);
          return (
            <div key={wi} className="flex-1 text-[10px] font-medium text-neutral-400 dark:text-neutral-500 truncate">
              {label?.label ?? ''}
            </div>
          );
        })}
      </div>

      {/* Grid — fills remaining space */}
      <div className="flex flex-1 gap-1 min-h-0">
        {/* Day labels column */}
        <div className="flex flex-col justify-around w-8 shrink-0">
          {DAY_LABELS.map((d, i) => (
            <span key={i} className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 leading-none">
              {d}
            </span>
          ))}
        </div>

        {/* Week columns — each takes equal width */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-1 flex-col gap-1">
            {week.map((day, di) => {
              const c = counts.get(day.date) || 0;
              return (
                <motion.div
                  key={di}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: wi * 0.01 + di * 0.005, type: 'spring', stiffness: 500, damping: 30 }}
                  className={`flex-1 min-h-0 rounded-md transition-all hover:ring-2 hover:ring-brand-300 hover:ring-offset-1 dark:hover:ring-brand-700 cursor-default ${getColor(c)}`}
                  onMouseEnter={(e) => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setHovered({ date: day.date, count: c, x: rect.left + rect.width / 2, y: rect.top });
                  }}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">ნაკლები</span>
        <div className="flex gap-1">
          {[0, 0.25, 0.5, 0.75, 1].map((level) => (
            <div
              key={level}
              className={`h-3 w-3 rounded-sm ${
                level === 0       ? 'bg-neutral-100 dark:bg-neutral-800/60' :
                level <= 0.25     ? 'bg-brand-200 dark:bg-brand-900/40' :
                level <= 0.5      ? 'bg-brand-300 dark:bg-brand-800/50' :
                level <= 0.75     ? 'bg-brand-400 dark:bg-brand-700/60' :
                                    'bg-brand-500 dark:bg-brand-500/70'
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">მეტი</span>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          className="fixed z-50 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs text-white shadow-xl dark:bg-white dark:text-neutral-900"
          style={{ left: hovered.x, top: hovered.y - 44, transform: 'translateX(-50%)' }}
        >
          <p className="font-medium">{new Date(hovered.date).toLocaleDateString('ka-GE', { day: 'numeric', month: 'long' })}</p>
          <p className="text-[10px] opacity-80">{hovered.count} ჩანაწერი</p>
        </div>
      )}
    </div>
  );
}
