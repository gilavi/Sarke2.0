import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DeleteButton from '@/components/DeleteButton';
import StatusBadge from '@/components/StatusBadge';
import { SkeletonList } from '@/components/SkeletonCard';
import { ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section-header';
import { deleteOrder, listOrdersByProject, ORDER_DOCUMENT_TYPE_LABEL } from '@/lib/data/orders';
import { orderKeys } from '@/app/queryKeys';
import { routes } from '@/app/routes';
import { humanizeError } from '@/lib/errors';

interface Props {
  projectId: string;
  onError: (msg: string) => void;
}

/**
 * The project's orders (ბრძანებები): create CTA + ListRow stack with a
 * confirm-gated delete on every row. Orders have no detail page yet, so rows
 * render without a link.
 */
export function OrdersSection({ projectId, onError }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: orderKeys.list(projectId),
    queryFn: () => listOrdersByProject(projectId),
  });

  const del = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: orderKeys.lists() }),
    onError: (e) => onError(humanizeError(e)),
  });

  return (
    <section>
      <SectionHeader
        title="ბრძანებები"
        count={orders.length}
        trailing={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`${routes.orders.new}?project=${projectId}`)}
          >
            ბრძანება
          </Button>
        }
      />
      {isLoading ? (
        <SkeletonList count={2} />
      ) : orders.length === 0 ? (
        <p className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-6 text-sm text-[var(--text-muted)]">
          ბრძანებები ჯერ არ არის.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          {orders.map((o) => (
            <ListRow
              key={o.id}
              icon={ScrollText}
              tone="cert"
              title={ORDER_DOCUMENT_TYPE_LABEL[o.documentType] ?? o.documentType}
              subtitle={new Date(o.createdAt).toLocaleDateString('ka-GE')}
              trailing={<StatusBadge status={o.status} />}
              actions={
                <DeleteButton
                  iconOnly
                  onDelete={() => del.mutate(o.id)}
                  isPending={del.isPending && del.variables === o.id}
                />
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
