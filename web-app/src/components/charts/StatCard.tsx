import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkline } from './Sparkline';
import { TrendIndicator } from './TrendIndicator';
import { ProgressRing } from './ProgressRing';
import { type LucideIcon } from 'lucide-react';
import { SPRING } from '@/lib/animations';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  sparklineData?: number[];
  trendCurrent?: number;
  trendPrevious?: number;
  trendLabel?: string;
  progressValue?: number;
  progressMax?: number;
  staggerIndex?: number;
  href?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, sparklineData, trendCurrent, trendPrevious, trendLabel, progressValue, progressMax, staggerIndex = 0, href, className }: StatCardProps) {
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', ...SPRING.cardEntrance, delay: staggerIndex * 0.08 }}
      className={cn(
        'rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900',
        href && 'cursor-pointer',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        {trendCurrent !== undefined && trendPrevious !== undefined && trendLabel && (
          <TrendIndicator current={trendCurrent} previous={trendPrevious} label={trendLabel} />
        )}
        {sparklineData && <Sparkline data={sparklineData} />}
        {progressValue !== undefined && progressMax !== undefined && (
          <ProgressRing value={progressValue} max={progressMax} />
        )}
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full">
        {card}
      </Link>
    );
  }

  return card;
}
