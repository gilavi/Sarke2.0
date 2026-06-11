import { ArrowUp, ArrowDown } from 'lucide-react';
interface TrendIndicatorProps { current: number; previous: number; label: string; }
export function TrendIndicator({ current, previous, label }: TrendIndicatorProps) {
  const diff = previous === 0 ? 0 : ((current - previous) / previous) * 100;
  const isUp = diff >= 0;
  return (
    <div className="flex items-center gap-1 text-xs">
      {isUp ? <ArrowUp size={12} className="text-brand-500" /> : <ArrowDown size={12} className="text-red-500" />}
      <span className={isUp ? 'text-brand-600' : 'text-red-600'}>{Math.abs(diff).toFixed(0)}%</span>
      <span className="text-neutral-400">{label}</span>
    </div>
  );
}
