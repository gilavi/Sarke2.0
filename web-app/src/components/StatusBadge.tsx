import { AlertCircle, CheckCircle2, Clock, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status =
  | 'draft'
  | 'completed'
  | 'in_progress'
  | 'overdue'
  | 'due_today'
  | 'upcoming'
  | string;

type StatusConfig = {
  label: string;
  className: string;
  Icon: React.ElementType | null;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  completed:   { label: 'დასრულდა',    className: 'bg-green-100 text-green-700',    Icon: CheckCircle2 },
  draft:       { label: 'დრაფტი',      className: 'bg-amber-100 text-amber-700',    Icon: Hourglass    },
  in_progress: { label: 'მიმდინარე',   className: 'bg-blue-100 text-blue-700',     Icon: Clock        },
  overdue:     { label: 'ვადაგასული',  className: 'bg-red-100 text-red-700',       Icon: AlertCircle  },
  due_today:   { label: 'დღეს',        className: 'bg-orange-100 text-orange-700', Icon: Clock        },
  upcoming:    { label: 'დაგეგმილი',   className: 'bg-neutral-100 text-neutral-500', Icon: Clock      },
};

interface Props {
  status: Status;
  showIcon?: boolean;
  className?: string;
}

export default function StatusBadge({ status, showIcon = true, className }: Props) {
  const config: StatusConfig = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-neutral-100 text-neutral-700',
    Icon: null,
  };
  const Icon = config.Icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {showIcon && Icon && <Icon size={10} strokeWidth={2.5} />}
      {config.label}
    </span>
  );
}
