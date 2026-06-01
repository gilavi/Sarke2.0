import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { fadeUp, stagger } from './shared';
import { trustPoints } from './marketing-data';

/**
 * Dark security/compliance band. Reused on Home and Pricing to build trust.
 */
export function TrustSecurity() {
  return (
    <section className="bg-[#0F2318] py-24 px-5">
      <div className="mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#1E4030] bg-[#0A1C12] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#75C3A5] mb-5">
            <ShieldCheck size={14} /> უსაფრთხოება და კანონიერება
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">დოკუმენტი, რომელსაც ენდობა ინსპექცია</h2>
          <p className="text-[#A3D7C3] max-w-xl mx-auto">
            ყოველი PDF დაცული, დათარიღებული და კანონიერი ძალის მქონეა — ნაგებია ქართულ კანონმდებლობაზე.
          </p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {trustPoints.map(({ Icon, title, desc }) => (
            <motion.div key={title} variants={fadeUp} className="rounded-2xl border border-[#1E4030] bg-[#0A1C12] p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#162B1E]">
                <Icon size={20} className="text-[#75C3A5]" />
              </div>
              <h3 className="font-bold text-white mb-1 text-sm">{title}</h3>
              <p className="text-sm text-[#A3D7C3] leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
