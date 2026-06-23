import { cn } from '@/lib/utils';
import { inspectionTypeMeta } from '@/lib/inspectionTypeMeta';

const BOX = { sm: 'h-9 w-9', md: 'h-11 w-11' } as const;
const IMG = { sm: 'h-6 w-6', md: 'h-7 w-7' } as const;

/**
 * Canonical inspection-type avatar: the type's illustration on a brand-tinted
 * square. Replaces the History (PNG) vs ProjectActivityWidget (emoji) split so
 * an act looks identical wherever it appears.
 */
export function InspectionTypeIcon({
  type,
  size = 'sm',
  className,
}: {
  type: string | null | undefined;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const meta = inspectionTypeMeta(type);
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/20',
        BOX[size],
        className,
      )}
    >
      <img src={meta.image} alt="" aria-hidden="true" className={cn('object-contain', IMG[size])} />
    </div>
  );
}
