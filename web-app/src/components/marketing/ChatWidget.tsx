import { useState, useRef, useEffect, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sendChat, MAX_INPUT_CHARS, type ChatMessage } from '@/lib/data/ai-chat';

const GREETING: ChatMessage = {
  role: 'assistant',
  content: 'გამარჯობა! მე ვარ HUBBLE-ის ასისტენტი. დამისვი შეკითხვა შრომის უსაფრთხოებაზე, ფუნქციებზე ან ფასებზე.',
};

const SUGGESTIONS = ['რა არის HUBBLE?', 'რა ღირს?', 'iOS-ზე მუშაობს?'];

function ChatRow({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        isUser ? 'bg-neutral-200 text-neutral-600' : 'bg-brand-500 text-white',
      )}>
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
        isUser ? 'bg-brand-500 text-white' : 'bg-neutral-100 text-neutral-700',
      )}>
        {msg.content}
      </div>
    </div>
  );
}

/** Live AI support chat — talks to the `ai-chat` edge function. */
export function ChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function ask(text: string) {
    const trimmed = text.trim().slice(0, MAX_INPUT_CHARS);
    if (!trimmed || loading) return;
    const next = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const reply = await sendChat(next);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch {
      toast.error('ასისტენტი ვერ პასუხობს. სცადე მოგვიანებით ან მოგვწერე hello@hubble.ge');
      setMessages(next);
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = (e: FormEvent) => { e.preventDefault(); ask(input); };

  return (
    <section className="bg-[#0F2318] py-24 px-5">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 mb-4">
            <Bot size={22} className="text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">AI ასისტენტი</h2>
          <p className="text-[#A3D7C3]">მყისიერი პასუხები HUBBLE-ზე — ნებისმიერ დროს.</p>
        </div>

        <div className="rounded-3xl border border-[#1E4030] bg-white overflow-hidden">
          <div ref={scrollRef} className="h-80 overflow-y-auto p-5 flex flex-col gap-4">
            {messages.map((m, i) => <ChatRow key={i} msg={m} />)}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                  <Bot size={15} />
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-neutral-100 px-4 py-3">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-neutral-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-5 pb-3">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-brand-300 hover:text-brand-600 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-neutral-200 p-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={MAX_INPUT_CHARS}
              placeholder="დაწერეთ შეკითხვა..."
              className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
              aria-label="გაგზავნა"
            >
              <Send size={17} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
