import { useState } from 'react';
import { CalendarDays, Infinity as InfinityIcon, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { usePdfUsage, useInvalidatePdfUsage } from '@/lib/usePdfUsage';
import { cancelSubscription } from '@/lib/subscription';
import { PaywallModal } from './PaywallModal';
import { PdfUsageBar } from './PdfUsageBar';
import { useNavigate } from 'react-router-dom';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ka-GE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function SubscriptionCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: usage, isLoading } = usePdfUsage();
  const invalidate = useInvalidatePdfUsage();
  const [paywall, setPaywall] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  if (isLoading || !usage) {
    return (
      <Card>
        <CardContent>
          <div className="h-20 animate-pulse rounded-md bg-neutral-100" />
        </CardContent>
      </Card>
    );
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

  return (
    <>
      <Card>
        <CardContent>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            გამოწერა
          </div>

          {status === 'active' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  PRO ✓
                </span>
                <span className="text-sm font-semibold text-neutral-900">Sarke Pro</span>
              </div>
              {expiresAt && (
                <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                  <CalendarDays size={15} />
                  <span>მოქმედია: {formatDate(expiresAt)}-მდე</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                <InfinityIcon size={15} />
                <span>შეუზღუდავი PDF გენერაცია</span>
              </div>
              {cancelled ? (
                <p className="text-xs text-neutral-500">
                  გამოწერა გაუქმებულია — ავტომატური განახლება არ მოხდება.
                </p>
              ) : (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-sm font-semibold text-danger hover:underline disabled:opacity-50"
                >
                  {cancelling ? 'მუშავდება…' : 'გამოწერის გაუქმება'}
                </button>
              )}
              {cancelMsg ? <p className="text-xs text-neutral-500">{cancelMsg}</p> : null}
            </div>
          ) : status === 'expired' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                <AlertTriangle size={16} />
                <span>გამოწერა ამოიწურა</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">PDF გამოყენება</span>
                <span className="font-semibold text-amber-700">
                  {count} / {limit}
                </span>
              </div>
              <PdfUsageBar value={count} max={limit} locked />
              <Button onClick={() => navigate('/subscribe')} className="w-full">
                განახლება ₾19/თვე
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900">უფასო გეგმა</span>
                <span
                  className={
                    count >= limit
                      ? 'text-sm font-semibold text-amber-700'
                      : 'text-sm text-neutral-600'
                  }
                >
                  PDF: {count}/{limit} გამოყენებული
                </span>
              </div>
              <PdfUsageBar value={count} max={limit} locked={count >= limit} />
              <Button onClick={() => navigate('/subscribe')} className="w-full">
                PRO-ზე გადასვლა ₾19/თვე
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <PaywallModal open={paywall} onOpenChange={setPaywall} />
    </>
  );
}
