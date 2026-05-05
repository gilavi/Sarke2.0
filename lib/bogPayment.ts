import { supabase } from './supabase';

export interface BogOrderResult {
  orderId: string;
  redirectUrl: string;
}

/** Calls the create-bog-order edge function and returns the order ID and redirect URL. */
export async function createBogOrder(): Promise<BogOrderResult> {
  const { data, error } = await supabase.functions.invoke<{
    order_id: string;
    redirect_url: string;
    error?: string;
  }>('create-bog-order');

  if (error) throw error;
  if (!data) throw new Error('No response from create-bog-order');
  if (data.error) throw new Error(data.error);
  if (!data.order_id || !data.redirect_url) {
    throw new Error('Invalid response from create-bog-order');
  }

  return { orderId: data.order_id, redirectUrl: data.redirect_url };
}
