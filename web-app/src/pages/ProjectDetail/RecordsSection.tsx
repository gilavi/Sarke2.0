import { ShieldCheck } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { SkeletonList } from '@/components/SkeletonCard';
import { ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section-header';
import { useActRows } from '@/lib/data/recordRows';
import { routes } from '@/app/routes';

const PREVIEW_SIZE = 5;

/**
 * The project's newest inspection acts (all types, via useActRows) as a
 * bordered ListRow stack. Links out to History for the full feed.
 */
export function RecordsSection({ projectId }: { projectId: string }) {
  const { rows, isLoading } = useActRows(projectId);
  const visible = rows.slice(0, PREVIEW_SIZE);

  return (
    <section>
      <SectionHeader title="შემოწმების აქტები" count={rows.length} to={routes.history} />
      {isLoading ? (
        <SkeletonList count={2} />
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-6 text-sm text-[var(--text-muted)]">
          აქტები ჯერ არ არის.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          {visible.map((row) => (
            <ListRow
              key={row.id}
              icon={ShieldCheck}
              tone="brand"
              title={row.label}
              subtitle={row.date ? new Date(row.date).toLocaleDateString('ka-GE') : undefined}
              trailing={<StatusBadge status={row.status} />}
              to={row.href}
            />
          ))}
        </div>
      )}
    </section>
  );
}
