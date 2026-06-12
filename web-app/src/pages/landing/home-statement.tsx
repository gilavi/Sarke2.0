import { motion } from 'framer-motion';
import { OrbitRings, HazardSticker } from '@/components/marketing/BrandPattern';

/**
 * Editorial brand-statement band the board's bold "Safety isn't a slogan.
 * It's a system." poster, rendered in Georgian over the graphite + orbital
 * motif. A dark punctuation moment between the lighter product sections.
 */
export function BrandStatement() {
  return (
    <section className="relative overflow-hidden bg-graphite-950 py-28 px-5">
      <OrbitRings
        dotted
        className="pointer-events-none absolute top-1/2 -right-40 h-[700px] w-[700px] -translate-y-1/2 text-white/[0.09]"
      />
      <div className="relative mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <div className="mb-7 flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-safety-500" />
            <span className="text-xs font-bold uppercase tracking-[0.28em] text-concrete">ჩვენი ფილოსოფია</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-white">
            უსაფრთხოება არ არის ლოზუნგი.<br />
            ეს არის <span className="text-safety-500">სისტემა.</span>
          </h2>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-concrete">
            უფრო უსაფრთხო ობიექტი. ძლიერი გუნდი. უკეთესი შედეგი HUBBLE ყოველდღიურ
            შემოწმებას აქცევს სანდო სისტემად, რომელიც მუშაობს მაშინაც, როცა ვერავინ უყურებს.
          </p>
        </motion.div>
      </div>
      <HazardSticker className="pointer-events-none absolute bottom-10 right-10 hidden w-16 rotate-[-10deg] md:block" />
    </section>
  );
}
