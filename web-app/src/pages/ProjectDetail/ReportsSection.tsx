import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/StatusBadge';
import { listReports, signedReportPhotoUrl, type ReportSlide } from '@/lib/data/reports';
import { reportKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';

interface Props {
  projectId: string;
}

function ReportThumb({ slides }: { slides: ReportSlide[] | null }) {
  const first = slides?.[0];
  const path = first?.annotated_image_path || first?.image_path || null;

  const { data: url } = useQuery({
    queryKey: ['reportThumb', path],
    queryFn: () => signedReportPhotoUrl(path!),
    enabled: !!path,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : path ? (
        <div className="h-full w-full animate-pulse bg-neutral-200 dark:bg-neutral-700" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <FileText size={16} className="text-neutral-400 dark:text-neutral-600" />
        </div>
      )}
    </div>
  );
}

export function ReportsSection({ projectId }: Props) {
  const { data: reports = [] } = useQuery({
    queryKey: reportKeys.list(projectId),
    queryFn: () => listReports(projectId),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          რეპორტები
          <span className="ml-2 text-sm font-normal text-neutral-400">({reports.length})</span>
        </CardTitle>
        <div className="flex items-center gap-3">
          <Link to={routes.reports.new(projectId)}>
            <Button variant="outline" size="sm">
              <Plus size={14} className="mr-1" />
              ახალი
            </Button>
          </Link>
          {reports.length > 5 && (
            <Link to={routes.reports.list(projectId)} className="text-sm text-brand-600 hover:underline">
              ყველა →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {reports.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-neutral-500 dark:text-neutral-400">რეპორტები ჯერ არ არის.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {reports.slice(0, 5).map((r) => (
              <li key={r.id}>
                <Link
                  to={routes.reports.detail(r.id)}
                  className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ReportThumb slides={r.slides} />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="truncate text-sm text-neutral-800 dark:text-neutral-200">
                        {r.title || `რეპორტი #${r.id.slice(0, 8)}`}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {r.slides?.length ?? 0} სლაიდი ·{' '}
                        {new Date(r.created_at).toLocaleDateString('ka-GE')}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={r.status} showIcon={false} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
