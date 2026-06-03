import { motion } from 'framer-motion';
import { Smartphone, Star } from 'lucide-react';
import { fadeUp, stagger, AppStoreBadge, PhoneMockup, APP_STORE_URL } from './shared';
import { OrbitRings } from '@/components/marketing/BrandPattern';
import { painPoints, steps } from './marketing-data';

// ─── Hero ─────────────────────────────────────────────────────────────────────
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-offwhite pt-32 pb-20">
      {/* Ambient blobs + orbital motif */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-[560px] h-[560px] rounded-full bg-safety-50 opacity-70 blur-3xl" />
        <div className="absolute bottom-0 -left-24 w-[400px] h-[400px] rounded-full bg-safety-100 opacity-40 blur-3xl" />
        <OrbitRings className="absolute -top-28 -right-44 h-[640px] w-[640px] text-graphite-900/[0.07]" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col md:flex-row items-center gap-12 px-5">
        {/* Text */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex-[3] flex flex-col items-start text-left">
          <motion.div variants={fadeUp}>
            <span className="inline-block rounded-full bg-hivis px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-graphite-900 mb-6">
              შრომის უსაფრთხოების პლათფორმა
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight text-neutral-900 mb-6">
            შემოწმება სწრაფად.{' '}
            <span className="text-safety-600">PDF — წამებში.</span>
            {' '}ყველა კანონის შესაბამისად.
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg text-neutral-500 leading-relaxed mb-8 max-w-xl">
            HUBBLE ათავისუფლებს შრომის უსაფრთხოების სპეციალისტებს ქაღალდის ფორმებისგან.
            ციფრული შემოწმება, PDF გენერაცია, ხელმოწერები — პირდაპირ სამშენებლო მოედნიდან.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-8">
            <AppStoreBadge href={APP_STORE_URL} />
            <button
              onClick={() => document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 hover:border-safety-300 hover:text-safety-700 transition-colors"
            >
              ნახე როგორ მუშაობს ↓
            </button>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-amber-400 text-amber-400" />)}
            </div>
            <span className="text-sm text-neutral-500">
              გამოიყენება <span className="font-semibold text-neutral-700">15+</span> კომპანიის მიერ საქართველოში
            </span>
          </motion.div>
        </motion.div>

        {/* Phone */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex-[2] flex items-center justify-center w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 scale-90 rounded-[60px] bg-safety-400 opacity-20 blur-3xl" />
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="relative"
            >
              <PhoneMockup />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Pain section ─────────────────────────────────────────────────────────────
export function PainSection() {
  return (
    <section className="bg-graphite-900 py-24 px-5">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-3xl sm:text-4xl font-bold text-white mb-14"
        >
          სიტუაცია ნაცნობია?
        </motion.h2>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {painPoints.map(p => (
            <motion.div key={p.text} variants={fadeUp} className="rounded-2xl border border-graphite-700 bg-graphite-800 p-7">
              <div className="text-4xl mb-4">{p.emoji}</div>
              <p className="text-concrete text-base leading-relaxed font-medium">{p.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Transition to solutions ────────────────────────────────────────────────────
export function Transition() {
  return (
    <section className="bg-graphite-900 pb-24 px-5">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }} whileInView={{ opacity: 1, scaleX: 1 }} viewport={{ once: true }}
          className="h-px bg-gradient-to-r from-transparent via-safety-500 to-transparent mb-8"
        />
        <motion.p
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-xl font-semibold text-safety-400"
        >
          HUBBLE ამოხსნის ამ პრობლემებს
        </motion.p>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-5 bg-white">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-3xl sm:text-4xl font-bold text-neutral-900 mb-16"
        >
          როგორ მუშაობს
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="flex flex-col gap-4"
            >
              <div className="text-6xl font-black text-safety-100 leading-none select-none">{s.n}</div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 mb-1">{s.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
              </div>
              <div className="rounded-2xl bg-neutral-50 border border-neutral-100 aspect-video flex flex-col items-center justify-center gap-2 p-4">
                <div className="w-10 h-10 rounded-full bg-safety-100 flex items-center justify-center">
                  <Smartphone size={18} className="text-safety-600" />
                </div>
                <span className="text-xs text-neutral-400 font-mono text-center">[screenshot: {s.label}]</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
