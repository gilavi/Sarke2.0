import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, ScrollText } from 'lucide-react';
import { InspectionTypeIcon } from '@/components/InspectionTypeIcon';
import DeleteButton from '@/components/DeleteButton';
import StatusBadge from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/SkeletonCard';
import { ListRow } from '@/components/ui/list-row';
import { deleteInspection } from '@/lib/data/inspections';
import { deleteOrder, listOrders, ORDER_DOCUMENT_TYPE_LABEL } from '@/lib/data/orders';
import { deleteReport, listReports, type Report } from '@/lib/data/reports';
import { listProjects } from '@/lib/data/projects';
import { useActRows } from '@/lib/data/recordRows';
import { ReportCoverThumb } from '@/features/reports/ReportCoverThumb';
import { STRUCTURED_ACTS } from '@/features/inspections/structured/acts';
import { inspectionKeys, orderKeys, projectKeys, reportKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { cn } from '@/lib/utils';

interface Row {
  kind: 'act' | 'order' | 'report';
  id: string;
  label: string;
  /** Inspection type tag (drives the illustration avatar); null for orders. */
  type: string | null;
  projectId: string | null;
  /** Structured-act registry key (drives delete dispatch); null for generic acts + orders. */
  actKey: string | null;
  status: string;
  date: string;
  /** Orders have no detail page yet — they render without a link. */
  href: string | null;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return 'დღეს';
  if (isSameDay(d, yesterday)) return 'გუშინ';
  return d.toLocaleDateString('ka-GE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
}

type Filter = 'all' | 'acts' | 'orders' | 'reports';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'ყველა' },
  { key: 'acts', label: 'შემოწმების აქტები' },
  { key: 'orders', label: 'ბრძანებები' },
  { key: 'reports', label: 'რეპორტები' },
];

export default function History() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');

  const { rows: acts, isLoading: actsLoading } = useActRows();
  const ordersQ = useQuery({ queryKey: orderKeys.lists(), queryFn: listOrders });
  const reportsQ = useQuery({ queryKey: reportKeys.lists(), queryFn: () => listReports() });
  const { data: projectList } = useQuery({ queryKey: projectKeys.lists(), queryFn: listProjects });

  const projects = projectList ? Object.fromEntries(projectList.map((p) => [p.id, p])) : {};
  const reportsById: Record<string, Report> = Object.fromEntries(
    (reportsQ.data ?? []).map((r) => [r.id, r]),
  );
  const isLoading = actsLoading || ordersQ.isLoading || reportsQ.isLoading;

  const allRows: Row[] = useMemo(() => {
    const actRows: Row[] = acts.map((a) => ({
      kind: 'act',
      id: a.id,
      label: a.label,
      type: a.type,
      projectId: a.projectId,
      actKey: a.actKey,
      status: a.status,
      date: a.date,
      href: a.href,
    }));
    const orderRows: Row[] = (ordersQ.data ?? []).map((o) => ({
      kind: 'order',
      id: o.id,
      label: ORDER_DOCUMENT_TYPE_LABEL[o.documentType] ?? o.documentType,
      type: null,
      projectId: o.projectId,
      actKey: null,
      status: o.status,
      date: o.createdAt,
      href: null,
    }));
    const reportRows: Row[] = (reportsQ.data ?? []).map((r) => ({
      kind: 'report',
      id: r.id,
      label: r.title || 'ფოტო-რეპორტი',
      type: null,
      projectId: r.project_id,
      actKey: null,
      status: r.status,
      date: r.created_at,
      href: routes.reports.detail(r.id),
    }));
    return [...actRows, ...orderRows, ...reportRows].sort((a, b) =>
      (b.date || '').localeCompare(a.date || ''),
    );
  }, [acts, ordersQ.data, reportsQ.data]);

  const KIND_BY_FILTER: Record<Exclude<Filter, 'all'>, Row['kind']> = {
    acts: 'act',
    orders: 'order',
    reports: 'report',
  };
  const visibleRows = useMemo(
    () => (filter === 'all' ? allRows : allRows.filter((r) => r.kind === KIND_BY_FILTER[filter])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRows, filter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of visibleRows) {
      const header = fmtDateHeader(row.date);
      if (!map.has(header)) map.set(header, []);
      map.get(header)!.push(row);
    }
    return Array.from(map.entries());
  }, [visibleRows]);

  const delGeneric = useMutation({
    mutationFn: deleteInspection,
    onSuccess: () => qc.invalidateQueries({ queryKey: inspectionKeys.lists() }),
  });
  const delStructured = useMutation({
    mutationFn: ({ actKey, id }: { actKey: string; id: string }) =>
      STRUCTURED_ACTS[actKey].descriptor.remove(id),
    onSuccess: (_res, vars) =>
      qc.invalidateQueries({ queryKey: STRUCTURED_ACTS[vars.actKey].descriptor.listKey() }),
  });
  const delOrder = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.lists() }),
  });
  const delReport = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.lists() }),
  });

  function handleDelete(row: Row) {
    if (row.kind === 'order') delOrder.mutate(row.id);
    else if (row.kind === 'report') {
      const report = reportsById[row.id];
      if (report) delReport.mutate(report);
    } else if (row.actKey) delStructured.mutate({ actKey: row.actKey, id: row.id });
    else delGeneric.mutate(row.id);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-heading-1 text-neutral-900 dark:text-neutral-100">ისტორია</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">ბოლო ჩანაწერები ყველა ტიპიდან.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
              filter === f.key
                ? 'border-transparent bg-[var(--text-primary)] text-[var(--bg-card)]'
                : 'border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <SkeletonList />}

      {!isLoading && visibleRows.length === 0 && (
        <EmptyState icon={ClipboardList} title="ჩანაწერები არ არის" />
      )}

      {!isLoading &&
        grouped.map(([header, rows]) => (
          <div key={header} className="space-y-2">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {header}
            </h2>
            <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
              {rows.map((row) => (
                <ListRow
                  key={`${row.kind}-${row.id}`}
                  icon={row.kind === 'order' ? ScrollText : undefined}
                  tone={row.kind === 'order' ? 'cert' : undefined}
                  leading={
                    row.kind === 'order' ? undefined
                    : row.kind === 'report' ? <ReportCoverThumb report={reportsById[row.id]} />
                    : <InspectionTypeIcon type={row.type} size="md" />
                  }
                  title={row.label}
                  subtitle={`${projects[row.projectId ?? '']?.name ?? '-'} · ${fmtTime(row.date)}`}
                  trailing={<StatusBadge status={row.status} />}
                  to={row.href ?? undefined}
                  actions={<DeleteButton iconOnly onDelete={() => handleDelete(row)} />}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
