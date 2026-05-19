import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { listBriefings, topicLabel } from '@/lib/data/briefings';
import { briefingKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { EmptyState, SectionHeader, listShellClass, rowClass } from './_shared';

interface Props {
  projectId: string;
}

export function BriefingsSection({ projectId }: Props) {
  const { data: briefings = [] } = useQuery({
    queryKey: briefingKeys.list(projectId),
    queryFn: () => listBriefings(projectId),
  });

  return (
    <section>
      <SectionHeader
        title="ინსტრუქტაჟები"
        count={briefings.length}
        viewAllTo={briefings.length > 5 ? routes.briefings.list(projectId) : undefined}
        action={
          <Link to={routes.briefings.new(projectId)}>
            <Button variant="outline" size="sm">
              <Plus size={14} className="mr-1" />
              ახალი
            </Button>
          </Link>
        }
      />
      {briefings.length === 0 ? (
        <EmptyState text="ინსტრუქტაჟები ჯერ არ არის." />
      ) : (
        <ul className={listShellClass}>
          {briefings.slice(0, 5).map((b) => (
            <li key={b.id}>
              <Link to={routes.briefings.detail(b.id)} className={rowClass}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-neutral-800">
                    {new Date(b.dateTime).toLocaleDateString('ka-GE')}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {b.topics.slice(0, 2).map(topicLabel).join(', ')}
                    {b.topics.length > 2 && ` +${b.topics.length - 2}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs text-neutral-500">
                    {b.participants.length} მონაწილე
                  </span>
                  <StatusBadge status={b.status} showIcon={false} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
