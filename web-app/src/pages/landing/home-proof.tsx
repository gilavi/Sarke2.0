import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { fadeUp, stagger } from './shared';
import { DotGrid } from '@/components/marketing/BrandPattern';
import { stats, companies, testimonials } from './marketing-data';

// ─── Logo cloud ─────────────────────────────────────────────────────────────────
export function LogoCloud() {
  return (
    <section className="bg-offwhite pt-8 pb-12 px-5">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-6">
          ენდობათ საქართველოს მშენებელი კომპანიები
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {companies.map(name => (
            <span key={name} className="text-base font-bold text-neutral-400/80 tracking-tight">{name}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stats band ─────────────────────────────────────────────────────────────────
export function StatsBand() {
  return (
    <section className="relative overflow-hidden bg-graphite-900 py-16 px-5">
      <DotGrid id="stats-dots" className="pointer-events-none absolute inset-0 h-full w-full text-white/[0.05]" />
      <div className="relative mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="text-center"
          >
            <div className="font-display text-4xl sm:text-5xl font-black text-hivis tracking-tight">{s.value}</div>
            <div className="mt-2 text-sm text-concrete leading-snug">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Testimonials ───────────────────────────────────────────────────────────────
export function Testimonials() {
  return (
    <section className="py-24 px-5 bg-offwhite">
      <div className="mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-3">რას ამბობენ მომხმარებლები</h2>
          <p className="text-neutral-500">სპეციალისტები, რომლებმაც ქაღალდი HUBBLE-ით ჩაანაცვლეს.</p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {testimonials.map((t, i) => (
            <motion.figure key={i} variants={fadeUp} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-6">
              <Quote size={22} className="text-safety-300 mb-3" />
              <blockquote className="flex-1 text-sm text-neutral-700 leading-relaxed">{t.quote}</blockquote>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-safety-100 text-sm font-bold text-safety-700">
                  {t.initials}
                </div>
                <figcaption>
                  <div className="text-sm font-semibold text-neutral-900">{t.name}</div>
                  <div className="text-xs text-neutral-500">{t.role}</div>
                </figcaption>
              </div>
              <div className="mt-4 flex gap-0.5">
                {[...Array(5)].map((_, s) => <Star key={s} size={13} className="fill-amber-400 text-amber-400" />)}
              </div>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
