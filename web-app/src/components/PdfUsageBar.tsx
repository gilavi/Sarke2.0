import { cn } from '@/lib/utils';

export function PdfUsageBar({
  value,
  max,
  locked,
}: {
  value: number;
  max: number;
  locked?: boolean;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
      <div
        className={cn(
          'h-full rounded-full transition-all',
          locked ? 'bg-amber-500' : 'bg-brand-500',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
