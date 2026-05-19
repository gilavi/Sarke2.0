import { lazy, Suspense, useState } from 'react';
import { cn } from '@/lib/utils';
import { CalendarDays, Infinity as InfinityIcon, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Paper, Skeleton } from '@mantine/core';
import { useAuth } from '@/lib/auth';
import { usePdfUsage, useInvalidatePdfUsage } from '@/lib/usePdfUsage';
import { cancelSubscription } from '@/lib/subscription';
import { PdfUsageBar } from './PdfUsageBar';
import { useNavigate } from 'react-router-dom';
import { fmtDateKa } from '@/lib/utils';

const PaywallModal = lazy(() =>
  import('./PaywallModal').then((m) => ({ default: m.PaywallModal })),
);

const formatDate = fmtDateKa;

export function SubscriptionCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: usage, isLoading } = usePdfUsage();
  const invalidate = useInvalidatePdfUsage();
  const [paywall, setPaywall] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  if (isLoading || !usage) {
    return <Skeleton height={64} radius="md" />;
  }

  const { status, count, limit, expiresAt, cancelledAt } = usage;
  const cancelled = !!cancelledAt;

  const handleCancel = async () => {
    if (!user) return;
    if (!window.confirm(
      expiresAt
        ? `გამოწერის გაუქმება? წვდომა გაგრძელდება ${formatDate(expiresAt)}-მდე. ავტომატური განახლება არ მოხდება.`
        : 'გამოწერის გაუქმება?',
    )) return;
    setCancelling(true);
    setCancelMsg(null);
    try {
      const res = await cancelSubscription(user.id);
      invalidate();
      setCancelMsg(
        res.active_until
          ? `წვდომა გაგრძელდება ${formatDate(res.active_until)}-მდე`
          : 'გამოწერა გაუქმდა',
      );
    } catch (e) {
      setCancelMsg(`შეცდომა: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCancelling(false);
    }
  };

  /* ── Active PRO ── */
  if (status === 'active') {
    return (
      <>
        <Paper withBorder radius="md" className="flex items-center gap-4 border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800/40 dark:bg-amber-950/20">
          {/* Badge — grayed out when cancelled */}
          <span className={cn(
            'shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
            cancelled
              ? 'bg-neutral-300 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
              : 'bg-amber-500 text-white',
          )}>
            PRO{!cancelled && ' ✓'}
          </span>

          {/* Info — stacked vertically */}
          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Sarke Pro</span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
              {expiresAt && (
                <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <CalendarDays size={12} className="shrink-0" />
                  მოქმედია {formatDate(expiresAt)}-მდე
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <InfinityIcon size={12} className="shrink-0" />
                შეუზღუდავი PDF
              </span>
              {cancelled && (
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  ავტომატური განახლება გამორთულია
                </span>
              )}
            </div>
            {cancelMsg && <span className="text-xs text-neutral-400">{cancelMsg}</span>}
          </div>

          {/* Action */}
          {!cancelled ? (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className={cn(
                'shrink-0 text-sm font-medium text-neutral-500 transition-colors',
                'hover:text-danger disabled:opacity-50 dark:text-neutral-400',
              )}
            >
              {cancelling ? 'მუშავდება…' : 'გაუქმება'}
            </button>
          ) : (
            <button
              onClick={() => navigate('/subscribe')}
              className="shrink-0 flex items-center gap-1 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              განახლება <ArrowRight size={13} />
            </button>
          )}
        </Paper>

        <Suspense fallback={null}>
          <PaywallModal open={paywall} onOpenChange={setPaywall} />
        </Suspense>
      </>
    );
  }

  /* ── Expired ── */
  if (status === 'expired') {
    return (
      <Paper withBorder radius="md" className="flex items-center gap-4 border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800/40 dark:bg-amber-950/20">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="text-sm font-semibold">გამოწერა ამოიწურა</span>
        </div>
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            PDF: {count} / {limit}
          </span>
          <div className="flex-1 min-w-0 max-w-xs">
            <PdfUsageBar value={count} max={limit} locked />
          </div>
        </div>
        <button
          onClick={() => navigate('/subscribe')}
          className="shrink-0 flex items-center gap-1 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          განახლება ₾19/თვე <ArrowRight size={13} />
        </button>
      </Paper>
    );
  }

  /* ── Free plan ── */
  return (
    <Paper withBorder radius="md" className="flex items-center gap-4 border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-800/40">
      <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1 min-w-0">
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">უფასო გეგმა</span>
        <span className={cn('text-sm', count >= limit ? 'font-semibold text-amber-700' : 'text-neutral-600 dark:text-neutral-400')}>
          PDF: {count} / {limit}
        </span>
        <div className="min-w-[120px] max-w-xs flex-1">
          <PdfUsageBar value={count} max={limit} locked={count >= limit} />
        </div>
      </div>
      <Button onClick={() => navigate('/subscribe')} size="sm" className="shrink-0 gap-1.5">
        PRO-ზე გადასვლა <ArrowRight size={14} />
      </Button>
    </Paper>
  );
}
