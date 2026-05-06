import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth';

export interface PaymentRecord {
  id: string;
  bog_order_id: string;
  amount: number | null;
  currency: string | null;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  created_at: string;
}

export interface CancelResult {
  cancelled: boolean;
  active_until: string | null;
}

export async function cancelSubscription(userId: string): Promise<CancelResult> {
  const { data, error } = await supabase.rpc('cancel_subscription', { user_id: userId });
  if (error) throw error;
  return data as CancelResult;
}

export function usePaymentHistory() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery<PaymentRecord[]>({
    queryKey: ['payment-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_records')
        .select('id, bog_order_id, amount, currency, status, created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PaymentRecord[];
    },
    enabled: !!userId,
  });
}
