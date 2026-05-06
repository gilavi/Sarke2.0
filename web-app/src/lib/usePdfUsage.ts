import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { PDF_FREE_LIMIT } from './pdfGate';

export interface PdfUsage {
  count: number;
  limit: number;
  isLocked: boolean;
  status: 'free' | 'active' | 'expired';
  expiresAt: string | null;
  cancelledAt: string | null;
}

export function usePdfUsage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery<PdfUsage>({
    queryKey: ['pdf-usage', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('pdf_count, subscription_status, subscription_expires_at, subscription_cancelled_at')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      const count = (data.pdf_count as number) ?? 0;
      let status = ((data.subscription_status as string) ?? 'free') as PdfUsage['status'];
      const expiresAt = data.subscription_expires_at
        ? new Date(data.subscription_expires_at as string)
        : null;
      // Mirror the SQL auto-expiry logic so the UI reflects lapsed subscriptions immediately.
      if (status === 'active' && expiresAt && expiresAt < new Date()) {
        status = 'expired';
      }
      return {
        count,
        limit: PDF_FREE_LIMIT,
        isLocked: count >= PDF_FREE_LIMIT && status !== 'active',
        status,
        expiresAt: (data.subscription_expires_at as string | null) ?? null,
        cancelledAt: (data.subscription_cancelled_at as string | null) ?? null,
      };
    },
    enabled: !!userId,
    staleTime: 0,
  });
}

export function useInvalidatePdfUsage() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['pdf-usage'] });
}
