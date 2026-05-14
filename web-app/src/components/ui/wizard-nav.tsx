import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WizardNavProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onFinish?: () => void;
  isSubmitting?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
  nextDisabled?: boolean;
  className?: string;
}

export function WizardNav({
  current,
  total,
  onPrev,
  onNext,
  onFinish,
  isSubmitting,
  prevLabel = 'წინა',
  nextLabel = 'შემდეგი',
  finishLabel = 'დასრულება',
  nextDisabled,
  className,
}: WizardNavProps) {
  const isFirst = current === 0;
  const isLast = current === total - 1;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between border-t border-neutral-200 bg-white px-4 py-3',
        className,
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrev}
        disabled={isFirst || isSubmitting}
        className={cn('gap-1.5', isFirst && 'invisible')}
      >
        <ArrowLeft size={16} />
        {prevLabel}
      </Button>

      <Button
        size="md"
        className="min-w-[140px] gap-1.5"
        onClick={isLast ? (onFinish ?? onNext) : onNext}
        disabled={isSubmitting || nextDisabled}
      >
        {isSubmitting && <Loader2 size={15} className="animate-spin" />}
        {isLast ? finishLabel : nextLabel}
        {!isLast && !isSubmitting && <ArrowRight size={16} />}
      </Button>
    </div>
  );
}
