import { motion } from 'framer-motion';
import { fadeUp, stagger } from './shared';
import { features, subModules, audiences } from './marketing-data';

// ─── Features grid ────────────────────────────────────────────────────────────
export function FeaturesGrid() {
  return (
    <section id="features" className="py-24 px-5 bg-offwhite">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-3xl sm:text-4xl font-bold text-neutral-900 mb-14"
        >
          ყველაფერი რაც გჭირდება
        </motion.h2>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map(({ Icon, title, desc }) => (
            <motion.div
              key={title} variants={fadeUp}
              className="rounded-2xl border border-neutral-200 bg-white p-6 hover:border-safety-200 transition-colors duration-200"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-safety-50">
                <Icon size={20} className="text-safety-600" />
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">{title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Four product pillars */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {subModules.map(({ Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-safety-100 bg-safety-50/40 p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-safety-500">
                <Icon size={20} className="text-white" />
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">{title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── For who ──────────────────────────────────────────────────────────────────
export function ForWho() {
  return (
    <section className="py-24 px-5 bg-white">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-3xl sm:text-4xl font-bold text-neutral-900 mb-4"
        >
          ვისთვის
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-neutral-500 mb-14 max-w-xl mx-auto"
        >
          HUBBLE შექმნილია ყველასთვის, ვინც პასუხს აგებს ობიექტის უსაფრთხოებაზე.
        </motion.p>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {audiences.map(({ Icon, title, desc }) => (
            <motion.div key={title} variants={fadeUp} className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-safety-50">
                <Icon size={20} className="text-safety-600" />
              </div>
              <h3 className="font-bold text-neutral-900 mb-1 text-sm">{title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
