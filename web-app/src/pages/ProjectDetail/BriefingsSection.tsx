import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/StatusBadge';
import { listBriefings, topicLabel } from '@/lib/data/briefings';
import { briefingKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';

interface Props {
  projectId: string;
}

export function BriefingsSection({ projectId }: Props) {
  const { data: briefings = [] } = useQuery({
    queryKey: briefingKeys.list(projectId),
    queryFn: () => listBriefings(projectId),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          ინსტრუქტაჟები
          <span className="ml-2 text-sm font-normal text-neutral-400">({briefings.length})</span>
        </CardTitle>
        <div className="flex items-center gap-3">
          <Link to={routes.briefings.new(projectId)}>
            <Button variant="outline" size="sm">
              <Plus size={14} className="mr-1" />
              ახალი
            </Button>
          </Link>
          {briefings.length > 5 && (
            <Link to={routes.briefings.list(projectId)} className="text-sm text-brand-600 hover:underline">
              ყველა →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {briefings.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-neutral-500 dark:text-neutral-400">ინსტრუქტაჟები ჯერ არ არის.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {briefings.slice(0, 5).map((b) => (
              <li key={b.id}>
                <Link
                  to={routes.briefings.detail(b.id)}
                  className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-neutral-800 dark:text-neutral-200">
                      {new Date(b.dateTime).toLocaleDateString('ka-GE')}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {b.topics.slice(0, 2).map(topicLabel).join(', ')}
                      {b.topics.length > 2 && ` +${b.topics.length - 2}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                      {b.participants.length} მონაწილე
                    </span>
                    <StatusBadge status={b.status} showIcon={false} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
