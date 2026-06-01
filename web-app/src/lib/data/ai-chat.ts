import { supabase } from '@/lib/supabase';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/** Mirror of the edge function's caps — fail fast client-side. */
export const MAX_INPUT_CHARS = 1000;

/**
 * Send a short conversation to the `ai-chat` edge function (an Anthropic proxy)
 * and return the assistant's reply text. Throws on transport/upstream errors so
 * the widget can surface a toast.
 */
export async function sendChat(messages: ChatMessage[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ reply?: string; error?: string }>(
    'ai-chat',
    { body: { messages } },
  );
  if (error) throw error;
  if (!data || data.error) throw new Error(data?.error ?? 'unknown_error');
  return data.reply ?? '';
}
