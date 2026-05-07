import { cn } from '@/lib/utils';

type Status = 'draft' | 'completed' | 'in_progress' | string;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed: { label: 'დასრულებული', className: 'bg-green-100 text-green-700' },
  draft: { label: 'დრაფტი', className: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'მიმდინარე', className: 'bg-blue-100 text-blue-700' },
};

interface Props {
  status: Status;
  className?: string;
}

export default function StatusBadge({ status, className }: Props) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-neutral-100 text-neutral-700' };
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', config.className, className)}>
      {config.label}
    </span>
  );
}
