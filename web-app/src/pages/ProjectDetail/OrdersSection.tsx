import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/StatusBadge';
import { listOrdersByProject } from '@/lib/data/orders';
import { orderKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';

interface Props {
  projectId: string;
}

export function OrdersSection({ projectId }: Props) {
  const { data: orders = [] } = useQuery({
    queryKey: orderKeys.list(projectId),
    queryFn: () => listOrdersByProject(projectId),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          ბრძანებები
          <span className="ml-2 text-sm font-normal text-neutral-400">({orders.length})</span>
        </CardTitle>
        <div className="flex items-center gap-3">
          <Link to={routes.orders.new(projectId)}>
            <Button variant="outline" size="sm">
              <Plus size={14} className="mr-1" />
              ახალი
            </Button>
          </Link>
          {orders.length > 5 && (
            <Link to={routes.orders.list(projectId)} className="text-sm text-brand-600 hover:underline">
              ყველა →
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {orders.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-neutral-500 dark:text-neutral-400">ბრძანებები ჯერ არ არის.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link
                  to={routes.orders.detail(o.id)}
                  className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-neutral-800 dark:text-neutral-200">
                      {o.documentType === 'labor_safety_specialist'
                        ? 'შრომის უსაფრთხოების სპეციალისტის დანიშვნა'
                        : 'ალკოჰოლური და ნარკოტიკული თრობის კონტროლი'}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(o.createdAt).toLocaleDateString('ka-GE')}
                    </span>
                  </div>
                  <StatusBadge status={o.status} showIcon={false} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
