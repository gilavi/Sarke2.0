import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { listOrdersByProject } from '@/lib/data/orders';
import { orderKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { EmptyState, SectionHeader, listShellClass, rowClass } from './_shared';

interface Props {
  projectId: string;
}

export function OrdersSection({ projectId }: Props) {
  const { data: orders = [] } = useQuery({
    queryKey: orderKeys.list(projectId),
    queryFn: () => listOrdersByProject(projectId),
  });

  return (
    <section>
      <SectionHeader
        title="ბრძანებები"
        count={orders.length}
        viewAllTo={orders.length > 5 ? routes.orders.list(projectId) : undefined}
        action={
          <Link to={routes.orders.new(projectId)}>
            <Button variant="outline" size="sm">
              <Plus size={14} className="mr-1" />
              ახალი
            </Button>
          </Link>
        }
      />
      {orders.length === 0 ? (
        <EmptyState text="ბრძანებები ჯერ არ არის." />
      ) : (
        <ul className={listShellClass}>
          {orders.slice(0, 5).map((o) => (
            <li key={o.id}>
              <Link to={routes.orders.detail(o.id)} className={rowClass}>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-neutral-800">
                    {o.documentType === 'labor_safety_specialist'
                      ? 'შრომის უსაფრთხოების სპეციალისტის დანიშვნა'
                      : 'ალკოჰოლური და ნარკოტიკული თრობის კონტროლი'}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {new Date(o.createdAt).toLocaleDateString('ka-GE')}
                  </span>
                </div>
                <StatusBadge status={o.status} showIcon={false} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
