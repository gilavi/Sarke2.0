import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { valueProps } from './marketing-data';

/**
 * Alternating image/text rows - the "deep dive" feature section. The visual
 * side is a branded illustrative panel (no stock photos), keeping the custom feel.
 */
export function ValueShowcase() {
  return (
    <section className="py-24 px-5 bg-white">
      <div className="mx-auto max-w-5xl flex flex-col gap-20">
        {valueProps.map(({ Icon, eyebrow, title, desc, bullets }, i) => {
          const flip = i % 2 === 1;
          return (
            <div key={title} className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              {/* Text */}
              <motion.div
                initial={{ opacity: 0, x: flip ? 30 : -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={cn(flip && 'md:order-2')}
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-safety-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-safety-700 mb-4">
                  <Icon size={14} /> {eyebrow}
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3 leading-tight">{title}</h3>
                <p className="text-neutral-500 leading-relaxed mb-6">{desc}</p>
                <ul className="space-y-2.5">
                  {bullets.map(b => (
                    <li key={b} className="flex items-center gap-3 text-sm font-medium text-neutral-700">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-safety-100 shrink-0">
                        <Check size={12} className="text-safety-600" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={cn('relative', flip && 'md:order-1')}
              >
                <div className="absolute inset-0 scale-95 rounded-3xl bg-safety-200/40 blur-2xl" />
                <div className="relative aspect-[4/3] rounded-3xl border border-safety-100 bg-gradient-to-br from-offwhite to-safety-50 overflow-hidden flex items-center justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-safety-500">
                    <Icon size={36} className="text-white" />
                  </div>
                  {/* decorative tiles */}
                  <div className="absolute top-6 left-6 h-3 w-24 rounded-full bg-safety-200/70" />
                  <div className="absolute top-12 left-6 h-3 w-16 rounded-full bg-safety-200/50" />
                  <div className="absolute bottom-6 right-6 h-10 w-28 rounded-xl border border-safety-200 bg-white/70" />
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
