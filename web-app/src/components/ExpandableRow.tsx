import { Accordion } from '@mantine/core';
import { cn } from '@/lib/utils';

interface ExpandableRowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ExpandableRow({
  title,
  subtitle,
  badge,
  trailing,
  children,
  className = '',
}: ExpandableRowProps) {
  return (
    <Accordion
      radius="xl"
      className={cn('border border-neutral-200 dark:border-neutral-800 overflow-hidden', className)}
      styles={{
        item: { border: 'none', backgroundColor: 'transparent' },
        control: { padding: '16px 24px' },
        panel: { borderTop: '1px solid var(--mantine-color-gray-2)' },
        content: { padding: '0 24px 16px' },
      }}
    >
      <Accordion.Item value="item">
        <Accordion.Control>
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{title}</span>
                {badge}
              </div>
              {subtitle && <p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
            </div>
            {trailing && <div className="shrink-0">{trailing}</div>}
          </div>
        </Accordion.Control>
        <Accordion.Panel>{children}</Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
