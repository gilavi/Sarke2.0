import { supabase } from '../../supabase';
import type { PaymentRecord } from '../../../types/models';

export const paymentRecordsApi = {
  list: async (): Promise<PaymentRecord[]> => {
    const { data, error } = await supabase
      .from('payment_records')
      .select('id, user_id, bog_order_id, amount, currency, status, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PaymentRecord[];
  },
};
