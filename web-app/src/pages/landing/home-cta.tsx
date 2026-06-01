import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, BookOpen, ArrowRight } from 'lucide-react';
import { routes } from '@/app/routes';
import { REGULATIONS } from '@/lib/data/regulations';
import { AppStoreBadge, PlayStoreBadge, APP_STORE_URL } from './shared';
import { freeFeatures } from './marketing-data';

// ─── Price teaser ───────────────────────────────────────────────────────────────
export function PriceTeaser() {
  return (
    <section className="py-24 px-5 bg-[#F5F3EE]">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-3">მარტივი, გამჭვირვალე ფასი</h2>
          <p className="text-neutral-500 mb-8">დაიწყე უფასოდ — გადაიხადე მხოლოდ მაშინ, როცა გაიზრდები.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-8"
        >
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <p className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-1">უფასო</p>
            <p className="text-3xl font-black text-neutral-900 mb-4">₾0<span className="text-sm font-normal text-neutral-500"> / თვეში</span></p>
            <ul className="space-y-2">
              {freeFeatures.slice(0, 3).map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                  <Check size={15} className="text-brand-500 shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-brand-500 bg-brand-500 p-6 text-white">
            <p className="text-sm font-semibold text-brand-200 uppercase tracking-wide mb-1">PRO</p>
            <p className="text-3xl font-black mb-4">₾19<span className="text-sm font-normal text-brand-200"> / თვეში</span></p>
            <p className="text-sm text-brand-50">შეუზღუდავი PDF, ისტორია და პრიორიტეტული მხარდაჭერა.</p>
          </div>
        </motion.div>

        <Link
          to={routes.pricing}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          სრული ფასები <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

// ─── Download CTA ────────────────────────────────────────────────────────────────
export function DownloadCTA() {
  return (
    <section id="download" className="py-28 px-5 bg-brand-700">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            დაიწყე უფასოდ დღესვე
          </h2>
          <p className="text-brand-200 text-lg mb-10">
            3 PDF — გადახდის გარეშე. საკრედიტო ბარათი არ გჭირდება.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <AppStoreBadge href={APP_STORE_URL} light />
            <PlayStoreBadge light />
          </div>
        </motion.div>
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
              <BookOpen size={20} className="text-brand-600" />
              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900">რეგულაციები</h2>
            </div>
            <p className="text-neutral-500 max-w-xl">
              ქართული შრომის უსაფრთხოების კანონმდებლობა — ერთ ადგილას, ყოველთვის განახლებული.
            </p>
          </div>
          <Link
            to={routes.legislation}
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors shrink-0"
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
              <div className="h-0.5 w-10 bg-brand-500 rounded mb-4" />
              <h3 className="text-sm font-semibold text-neutral-900 leading-snug mb-2">{item.title}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
