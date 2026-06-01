import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { FAQItem } from './marketing-data';

/**
 * Reusable FAQ accordion. Each marketing page passes its own `items` array
 * (faqs / aboutFaqs / contactFaqs / pricingFaqs in marketing-data.ts).
 */
export function FAQ({ items, title = 'ხშირი კითხვები' }: { items: FAQItem[]; title?: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section id="faq" className="py-24 px-5 bg-[#F5F3EE]">
      <div className="mx-auto max-w-2xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-3xl sm:text-4xl font-bold text-neutral-900 mb-12"
        >
          {title}
        </motion.h2>
        <div className="space-y-2">
          {items.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-neutral-200 bg-white overflow-hidden"
            >
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="font-semibold text-neutral-900 text-sm pr-4">{faq.q}</span>
                <motion.div animate={{ rotate: openIdx === i ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
                  <ChevronDown size={18} className="text-neutral-400" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {openIdx === i && (
                  <motion.div
                    key="body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p className="px-6 pb-5 text-sm text-neutral-500 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
