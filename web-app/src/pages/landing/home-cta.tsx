import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, BookOpen, ArrowRight } from 'lucide-react';
import { routes } from '@/app/routes';
import { REGULATIONS } from '@/lib/data/regulations';
import { DotGrid } from '@/components/marketing/BrandPattern';
import { Kicker, SectionHeading } from './shared';
import { freeFeatures } from './marketing-data';

// ─── Price teaser ───────────────────────────────────────────────────────────────
export function PriceTeaser() {
  return (
    <section id="pricing" className="py-24 px-5 bg-offwhite">
      <div className="mx-auto max-w-3xl text-center">
        <Kicker>ფასი</Kicker>
        <SectionHeading className="mb-3 mt-4">მარტივი, გამჭვირვალე ფასი</SectionHeading>
        <motion.p
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-lg text-neutral-500 mb-10"
        >
          დაიწყე უფასოდ — გადაიხადე მხოლოდ მაშინ, როცა გაიზრდები.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-8"
        >
          <div className="rounded-2xl border border-neutral-200 bg-white p-7 transition-transform duration-300 hover:-translate-y-1">
            <p className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-1">უფასო</p>
            <p className="text-4xl font-black text-neutral-900 mb-5">₾0<span className="text-sm font-normal text-neutral-500"> / თვეში</span></p>
            <ul className="space-y-2.5">
              {freeFeatures.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                  <Check size={15} className="text-safety-500 shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-2xl border-2 border-safety-500 bg-safety-500 p-7 text-white transition-transform duration-300 hover:-translate-y-1">
            <DotGrid id="price-pro-dots" className="pointer-events-none absolute inset-0 h-full w-full text-white/[0.14]" />
            <div className="relative">
              <p className="text-sm font-semibold text-white/80 uppercase tracking-wide mb-1">PRO</p>
              <p className="text-4xl font-black mb-5">₾19<span className="text-sm font-normal text-white/80"> / თვეში</span></p>
              <p className="text-sm leading-relaxed text-white/90">შეუზღუდავი PDF, ისტორია და პრიორიტეტული მხარდაჭერა.</p>
            </div>
          </div>
        </motion.div>

        <Link
          to={routes.pricing}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-safety-600 hover:text-safety-700 hover:gap-3 transition-all"
        >
          სრული ფასები <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

// ─── Regulations teaser ──────────────────────────────────────────────────────────
export function RegulationsTeaser() {
  const items = REGULATIONS.slice(0, 3);
  return (
    <section className="py-24 px-5 bg-white">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={20} className="text-safety-600" />
              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900">რეგულაციები</h2>
            </div>
            <p className="text-neutral-500 max-w-xl">
              ქართული შრომის უსაფრთხოების კანონმდებლობა ერთ ადგილას, ყოველთვის განახლებული.
            </p>
          </div>
          <Link
            to={routes.legislation}
            className="inline-flex items-center gap-2 text-sm font-semibold text-safety-600 hover:text-safety-700 transition-colors shrink-0"
          >
            ყველა კანონი <ArrowRight size={16} />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-neutral-200 bg-white p-6"
            >
              <div className="h-0.5 w-10 bg-safety-500 rounded mb-4" />
              <h3 className="text-sm font-semibold text-neutral-900 leading-snug mb-2">{item.title}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
