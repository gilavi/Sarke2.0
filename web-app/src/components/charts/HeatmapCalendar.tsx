import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface HeatmapCalendarProps {
  data: { date: string; count: number }[];
}

const DAY_LABELS = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი'];

const WEEKS = 5; // ~one calendar month

export function HeatmapCalendar({ data }: HeatmapCalendarProps) {
  const [hovered, setHovered] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  // rows = weeks (oldest top, newest bottom); cols = days (Mon→Sun left→right)
  const { rows, maxCount, counts } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of data) {
      const key = d.date.slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + d.count);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // align to end of current week (Sunday)
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon…
    const endSunday = new Date(today);
    endSunday.setDate(today.getDate() + (7 - dayOfWeek) % 7);

    // build WEEKS rows, each with 7 day cells (Mon-Sun), newest week first
    const rows: { date: string; dayIndex: number }[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const weekRow: { date: string; dayIndex: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(endSunday);
        dt.setDate(endSunday.getDate() - w * 7 - (6 - d));
        weekRow.push({ date: dt.toISOString().slice(0, 10), dayIndex: d });
      }
      rows.push(weekRow);
    }

    const maxCount = Math.max(1, ...Array.from(counts.values()));
    return { rows, maxCount, counts };
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-neutral-100 dark:bg-neutral-800/60';
    const intensity = Math.min(1, count / maxCount);
    if (intensity <= 0.25) return 'bg-brand-200 dark:bg-brand-900/40';
    if (intensity <= 0.5)  return 'bg-brand-300 dark:bg-brand-800/50';
    if (intensity <= 0.75) return 'bg-brand-400 dark:bg-brand-700/60';
    return 'bg-brand-500 dark:bg-brand-500/70';
  };

  return (
    <div className="flex flex-1 flex-col gap-2">

      {/* Day-of-week labels (top header) */}
      <div className="flex gap-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="flex-1 text-center text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
            {d}
          </div>
        ))}
      </div>

      {/* Grid - rows = weeks, cols = days */}
      <div className="flex flex-1 flex-col gap-1">
        {rows.map((week, wi) => (
          <div key={wi} className="flex flex-1 gap-1">
            {week.map((day, di) => {
              const c = counts.get(day.date) || 0;
              return (
                <motion.div
                  key={di}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: wi * 0.01 + di * 0.005, type: 'spring', stiffness: 500, damping: 30 }}
                  className={`flex-1 rounded-md transition-all hover:ring-2 hover:ring-brand-300 hover:ring-offset-1 dark:hover:ring-brand-700 cursor-default ${getColor(c)}`}
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
                level === 0   ? 'bg-neutral-100 dark:bg-neutral-800/60' :
                level <= 0.25 ? 'bg-brand-200 dark:bg-brand-900/40' :
                level <= 0.5  ? 'bg-brand-300 dark:bg-brand-800/50' :
                level <= 0.75 ? 'bg-brand-400 dark:bg-brand-700/60' :
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
          className="fixed z-50 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs text-white dark:bg-white dark:text-neutral-900"
          style={{ left: hovered.x, top: hovered.y - 44, transform: 'translateX(-50%)' }}
        >
          <p className="font-medium">{new Date(hovered.date).toLocaleDateString('ka-GE', { day: 'numeric', month: 'long' })}</p>
          <p className="text-[10px] opacity-80">{hovered.count} ჩანაწერი</p>
        </div>
      )}
    </div>
  );
}
