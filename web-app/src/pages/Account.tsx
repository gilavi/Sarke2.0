import { Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { usePaymentHistory, type PaymentRecord } from '@/lib/subscription';

const STATUS_LABEL: Record<PaymentRecord['status'], string> = {
  success: 'წარმატებული',
  failed: 'წარუმატებელი',
  pending: 'მოლოდინში',
  refunded: 'დაბრუნებული',
};

const STATUS_CLASS: Record<PaymentRecord['status'], string> = {
  success: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  pending: 'bg-neutral-100 text-neutral-600',
  refunded: 'bg-amber-50 text-amber-700',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ka-GE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Account() {
  const { data: history, isLoading } = usePaymentHistory();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-neutral-900">ანგარიში</h1>
        <p className="mt-1 text-sm text-neutral-500">
          გამოწერა, PDF გამოყენება და გადახდის ისტორია.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SubscriptionCard />
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardContent>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                გადახდის ისტორია
              </div>

              {isLoading ? (
                <div className="h-20 animate-pulse rounded-md bg-neutral-100" />
              ) : !history || history.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-neutral-500">
                  <Receipt size={28} className="text-neutral-400" />
                  <span>ჩანაწერები არ არის</span>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {history.map((row) => (
                    <li key={row.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {row.amount != null
                            ? `${row.currency === 'GEL' ? '₾' : (row.currency ?? '')}${row.amount.toFixed(2)}`
                            : '—'}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {formatDateTime(row.created_at)} · #{row.bog_order_id.slice(0, 8)}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[row.status]}`}
                      >
                        {STATUS_LABEL[row.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
