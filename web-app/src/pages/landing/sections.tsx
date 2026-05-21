import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ChevronDown, Check, Menu, X, Smartphone, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeUp, stagger, AppStoreBadge, PlayStoreBadge, PhoneMockup } from './shared';
import { painPoints, steps, features, freeFeatures, proFeatures, faqs } from './marketing-data';

// ─── Navbar ───────────────────────────────────────────────────────────────────
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  };

  const links = [
    { label: 'ფუნქციები', id: '#features' },
    { label: 'ფასი', id: '#pricing' },
    { label: 'FAQ', id: '#faq' },
  ];

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-white/90 backdrop-blur-md border-b border-neutral-200/60' : 'bg-transparent',
    )}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900">HUBBLE</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <button key={l.label} onClick={() => scrollTo(l.id)} className="text-sm font-medium text-neutral-600 hover:text-brand-600 transition-colors">
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden md:inline-block text-sm font-medium text-neutral-600 hover:text-brand-600 transition-colors">
            შესვლა
          </Link>
          <button
            onClick={() => scrollTo('#download')}
            className="hidden md:inline-flex items-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            უფასოდ სცადე
          </button>
          <button
            onClick={() => setOpen(v => !v)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600"
            aria-label="მენიუ"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="md:hidden border-t border-neutral-200 bg-white px-5 py-4 flex flex-col gap-3"
          >
            {links.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.id)} className="text-left text-base font-medium text-neutral-700 hover:text-brand-600 py-1 transition-colors">
                {l.label}
              </button>
            ))}
            <Link to="/login" className="text-base font-medium text-neutral-600 py-1">შესვლა</Link>
            <button
              onClick={() => scrollTo('#download')}
              className="mt-1 w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white"
            >
              უფასოდ სცადე
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#F5F3EE] pt-24 pb-20">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-[560px] h-[560px] rounded-full bg-brand-50 opacity-70 blur-3xl" />
        <div className="absolute bottom-0 -left-24 w-[400px] h-[400px] rounded-full bg-brand-100 opacity-40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col md:flex-row items-center gap-12 px-5 min-h-[calc(100vh-6rem)]">
        {/* Text */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex-[3] flex flex-col items-start text-left">
          <motion.div variants={fadeUp}>
            <span className="inline-block rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-700 mb-6">
              შრომის უსაფრთხოების პლათფორმა
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-[2.5rem] sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight text-neutral-900 mb-6">
            შემოწმება სწრაფად.{' '}
            <span className="text-brand-500">PDF — წამებში.</span>
            {' '}ყველა კანონის შესაბამისად.
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg text-neutral-500 leading-relaxed mb-8 max-w-xl">
            HUBBLE ათავისუფლებს შრომის უსაფრთხოების სპეციალისტებს ქაღალდის ფორმებისგან.
            ციფრული შემოწმება, PDF გენერაცია, ხელმოწერები — პირდაპირ სამშენებლო მოედნიდან.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-8">
            <AppStoreBadge href="#download" />
            <button
              onClick={() => document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 hover:border-brand-300 hover:text-brand-700 transition-colors"
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
            <div className="absolute inset-0 scale-90 rounded-[60px] bg-brand-400 opacity-20 blur-3xl" />
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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-neutral-400"
      >
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}>
          <ChevronDown size={22} />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Pain section ─────────────────────────────────────────────────────────────
export function PainSection() {
  return (
    <section className="bg-[#0F2318] py-24 px-5">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-3xl sm:text-4xl font-bold text-white mb-14"
        >
          სიტუაცია ნაცნობია?
        </motion.h2>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
        >
          {painPoints.map(p => (
            <motion.div key={p.text} variants={fadeUp} className="rounded-2xl border border-[#1E4030] bg-[#0A1C12] p-7">
              <div className="text-4xl mb-4">{p.emoji}</div>
              <p className="text-[#A3D7C3] text-base leading-relaxed font-medium">{p.text}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }} whileInView={{ opacity: 1, scaleX: 1 }} viewport={{ once: true }}
          className="h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent mb-8"
        />
        <motion.p
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-xl font-semibold text-[#75C3A5]"
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
              <div className="text-6xl font-black text-brand-100 leading-none select-none">{s.n}</div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 mb-1">{s.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
              </div>
              <div className="rounded-2xl bg-neutral-50 border border-neutral-100 aspect-video flex flex-col items-center justify-center gap-2 p-4">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                  <Smartphone size={18} className="text-brand-600" />
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

// ─── Features grid ────────────────────────────────────────────────────────────
export function FeaturesGrid() {
  return (
    <section id="features" className="py-24 px-5 bg-[#F5F3EE]">
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
              className="rounded-2xl border border-neutral-200 bg-white p-6 hover:border-brand-200 transition-colors duration-200"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                <Icon size={20} className="text-brand-600" />
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">{title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-5 bg-white">
      <div className="mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-2">მარტივი ფასი</h2>
          <p className="text-neutral-500">არანაირი დამალული საკომისიო</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-2xl border-2 border-neutral-200 bg-white p-8"
          >
            <p className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-1">უფასო</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-black text-neutral-900">₾0</span>
              <span className="text-neutral-500 text-sm">/ თვეში</span>
            </div>
            <ul className="space-y-3 mb-8">
              {freeFeatures.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-neutral-700">
                  <Check size={16} className="text-brand-500 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link to="/register" className="block w-full rounded-xl border-2 border-neutral-200 py-3 text-center text-sm font-semibold text-neutral-700 hover:border-brand-300 hover:text-brand-700 transition-colors">
              დაიწყე უფასოდ
            </Link>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="rounded-2xl border-2 border-brand-500 bg-brand-500 p-8 relative overflow-hidden"
          >
            <span className="absolute top-4 right-4 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white uppercase tracking-wide">
              პოპულარული
            </span>
            <p className="text-sm font-semibold text-brand-200 uppercase tracking-wide mb-1">PRO</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-black text-white">₾19</span>
              <span className="text-brand-200 text-sm">/ თვეში</span>
            </div>
            <ul className="space-y-3 mb-8">
              {proFeatures.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-white">
                  <Check size={16} className="text-brand-200 shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link to="/register" className="block w-full rounded-xl bg-white py-3 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors">
              PRO-ს სცადე
            </Link>
            <p className="mt-3 text-center text-xs text-brand-200">BOG-ით გადახდა</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section id="faq" className="py-24 px-5 bg-[#F5F3EE]">
      <div className="mx-auto max-w-2xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center text-3xl sm:text-4xl font-bold text-neutral-900 mb-12"
        >
          ხშირი კითხვები
        </motion.h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
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

// ─── Final CTA ────────────────────────────────────────────────────────────────
export function FinalCTA() {
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
            <AppStoreBadge href="#" light />
            <PlayStoreBadge light />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 py-10 px-5">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500">
                <ShieldCheck size={15} className="text-white" />
              </div>
              <span className="text-lg font-bold text-neutral-900">HUBBLE</span>
            </div>
            <p className="text-sm text-neutral-500">შრომის უსაფრთხოების ციფრული პლათფორმა</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500">
            <Link to="/terms" className="hover:text-brand-600 transition-colors">კონფიდენციალობა</Link>
            <Link to="/terms" className="hover:text-brand-600 transition-colors">პირობები</Link>
            <a href="mailto:hello@hubble.ge" className="hover:text-brand-600 transition-colors">კონტაქტი</a>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-neutral-100 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-neutral-400">
          <span>© 2026 HUBBLE · გაკეთებულია საქართველოში 🇬🇪</span>
          <span>hello@hubble.ge</span>
        </div>
      </div>
    </footer>
  );
}
