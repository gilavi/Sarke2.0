import { Badge } from '@mantine/core';
import { AlertCircle, CheckCircle2, Clock, Hourglass, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
type LucideIcon = ComponentType<LucideProps>;

type Status = 'draft' | 'completed' | 'in_progress' | 'overdue' | 'due_today' | 'upcoming' | string;

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: LucideIcon | null }> = {
  completed:   { label: 'დასრულდა',   color: 'green',  Icon: CheckCircle2 },
  draft:       { label: 'დრაფტი',     color: 'yellow', Icon: Hourglass    },
  in_progress: { label: 'მიმდინარე',  color: 'blue',   Icon: Clock        },
  overdue:     { label: 'ვადაგასული', color: 'red',    Icon: AlertCircle  },
  due_today:   { label: 'დღეს',       color: 'orange', Icon: Clock        },
  upcoming:    { label: 'დაგეგმილი',  color: 'gray',   Icon: Clock        },
};

export default function StatusBadge({ status, showIcon = true, className }: { status: Status; showIcon?: boolean; className?: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'gray', Icon: null };
  const Icon = config.Icon;
  return (
    <Badge
      color={config.color}
      variant="light"
      size="sm"
      radius="xl"
      leftSection={showIcon && Icon ? <Icon size={10} strokeWidth={2.5} /> : undefined}
      className={className}
    >
      {config.label}
    </Badge>
  );
}
