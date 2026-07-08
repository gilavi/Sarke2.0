/**
 * Route entry for a photo report (`/reports/:id`). Branches on the row's
 * status — same pattern as StructuredActPage:
 *   - draft     → ReportEditor (the SplitWizard slide editor)
 *   - completed → ReportView (read-only slide sheets)
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SkeletonDetailPage } from '@/components/SkeletonCard';
import { EmptyView } from '@/components/async/AsyncBoundary';
import { getReport } from '@/lib/data/reports';
import { reportKeys } from '@/app/queryKeys';
import { ReportEditor } from '@/features/reports/ReportEditor';
import { ReportView } from '@/features/reports/ReportView';

export default function ReportPage() {
  const { id = '' } = useParams<{ id: string }>();

  const q = useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => getReport(id),
    enabled: !!id,
  });

  if (q.isLoading) return <SkeletonDetailPage />;
  if (!q.data) return <EmptyView message="რეპორტი ვერ მოიძებნა." />;

  if (q.data.status === 'completed') return <ReportView report={q.data} />;
  return <ReportEditor report={q.data} />;
}
