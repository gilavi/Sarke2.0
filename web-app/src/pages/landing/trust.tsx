import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { fadeUp, stagger } from './shared';
import { OrbitRings } from '@/components/marketing/BrandPattern';
import { trustPoints } from './marketing-data';

/**
 * Dark security/compliance band. Reused on Home and Pricing to build trust.
 */
export function TrustSecurity() {
  return (
    <section className="relative overflow-hidden bg-graphite-900 py-24 px-5">
      <OrbitRings dotted className="pointer-events-none absolute top-1/2 -left-48 h-[620px] w-[620px] -translate-y-1/2 text-white/[0.06]" />
      <div className="relative mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-hivis px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-graphite-900 mb-5">
            <ShieldCheck size={14} /> უსაფრთხოება და კანონიერება
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">დოკუმენტი, რომელსაც ენდობა ინსპექცია</h2>
          <p className="text-concrete max-w-xl mx-auto">
            ყოველი PDF დაცული, დათარიღებული და კანონიერი ძალის მქონეა ნაგებია ქართულ კანონმდებლობაზე.
          </p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {trustPoints.map(({ Icon, title, desc }) => (
            <motion.div key={title} variants={fadeUp} className="rounded-2xl border border-graphite-700 bg-graphite-800 p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-safety-500/15">
                <Icon size={20} className="text-safety-400" />
              </div>
              <h3 className="font-bold text-white mb-1 text-sm">{title}</h3>
              <p className="text-sm text-concrete leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
