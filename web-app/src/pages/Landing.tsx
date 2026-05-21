import { memo, useState, useEffect, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ClipboardList,
  MapPin,
  Lock,
  PenLine,
  Calendar,
  BookOpen,
  X,
  ChevronDown,
  Check,
  Menu,
  Cookie,
  Smartphone,
  Star,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

// ─── Animation helpers ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

// ─── Phone mockup ─────────────────────────────────────────────────────────────
function PhoneMockup() {
  const rows = [
    { text: 'ხარაჩო — ზედა სართული', done: true },
    { text: 'სავარძლის ქამრები', done: true },
    { text: 'ელ. გამავლობა', done: true },
    { text: 'სახანძრო მოწყობ.', done: false },
    { text: 'ევაკუაციის გეგმა', done: false },
  ];
  return (
    <svg
      viewBox="0 0 280 560"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[260px]"
    >
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F2318" />
          <stop offset="100%" stopColor="#071410" />
        </linearGradient>
      </defs>
      {/* Frame */}
      <rect width="280" height="560" rx="44" fill="#1A1A1A" />
      {/* Side buttons */}
      <rect x="-3" y="120" width="5" height="36" rx="2" fill="#2A2A2A" />
      <rect x="-3" y="168" width="5" height="36" rx="2" fill="#2A2A2A" />
      <rect x="278" y="144" width="5" height="64" rx="2" fill="#2A2A2A" />
      {/* Screen */}
      <rect x="8" y="8" width="264" height="544" rx="38" fill="url(#sg)" />
      {/* Dynamic island */}
      <rect x="96" y="18" width="88" height="30" rx="15" fill="#0A0A0A" />
      {/* Status bar */}
      <text x="24" y="40" fill="rgba(255,255,255,0.4)" fontSize="11" fontFamily="system-ui">9:41</text>
      {/* Header */}
      <rect x="20" y="58" width="240" height="48" rx="12" fill="#1A2F22" />
      <text x="36" y="88" fill="white" fontSize="14" fontFamily="system-ui,sans-serif" fontWeight="700">HUBBLE</text>
      <rect x="180" y="70" width="68" height="24" rx="8" fill="#147A4F" />
      <text x="214" y="86" fill="white" fontSize="10" fontFamily="system-ui" fontWeight="600" textAnchor="middle">+ PDF</text>
      {/* Checklist rows */}
      {rows.map((r, i) => (
        <g key={i} transform={`translate(20,${118 + i * 50})`}>
          <rect width="240" height="42" rx="10" fill={r.done ? '#162B1E' : '#121F16'} />
          <rect x="8" y="9" width="24" height="24" rx="7" fill={r.done ? '#147A4F' : '#1E3527'} />
          {r.done && (
            <path d="M13 21 L17 25 L25 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
          <rect x="42" y="12" width={r.done ? 140 : 110} height="8" rx="4" fill={r.done ? '#75C3A5' : '#2D4A38'} opacity="0.9" />
          <rect x="42" y="24" width={r.done ? 90 : 75} height="6" rx="3" fill="#1E3527" />
        </g>
      ))}
      {/* Generate button */}
      <rect x="20" y="378" width="240" height="52" rx="15" fill="#147A4F" />
      <text x="140" y="409" fill="white" fontSize="15" fontFamily="system-ui,sans-serif" fontWeight="700" textAnchor="middle">PDF გენერაცია ↗</text>
      {/* PDF preview card */}
      <rect x="20" y="442" width="240" height="96" rx="12" fill="#0F2318" />
      <rect x="28" y="450" width="60" height="80" rx="8" fill="#1A3525" />
      <rect x="34" y="460" width="48" height="4" rx="2" fill="#147A4F" opacity="0.8" />
      {[470, 477, 484, 498, 505].map((y, i) => (
        <rect key={i} x="34" y={y} width={i % 2 === 0 ? 44 : 38} height="3" rx="1.5" fill="#2A4A35" />
      ))}
      <text x="100" y="462" fill="#75C3A5" fontSize="9" fontFamily="system-ui" fontWeight="600">ინსპექციის აქტი</text>
      {[466, 473, 480, 493].map((y, i) => (
        <rect key={i} x="100" y={y} width={[80, 72, 88, 60][i]} height="3" rx="1.5" fill={i === 3 ? '#147A4F' : '#1E3527'} opacity={i === 3 ? 0.5 : 1} />
      ))}
      <text x="100" y="513" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="system-ui">SHA256 ✓</text>
      {/* Home indicator */}
      <rect x="106" y="548" width="68" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
    </svg>
  );
}

// ─── App Store badge ──────────────────────────────────────────────────────────
const appleIcon = "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z";

function AppStoreBadge({ href = '#', light = false, small = false, className }: { href?: string; light?: boolean; small?: boolean; className?: string }) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex items-center gap-3 rounded-2xl transition-colors',
        small ? 'px-3 py-2' : 'px-5 py-3',
        light ? 'bg-white hover:bg-neutral-100' : 'bg-black hover:bg-neutral-800',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className={cn(small ? 'w-4 h-4' : 'w-6 h-6', light ? 'fill-neutral-800' : 'fill-white')}>
        <path d={appleIcon} />
      </svg>
      {!small && (
        <div className="text-left">
          <div className={cn('text-[10px] leading-none', light ? 'text-neutral-500' : 'text-white/70')}>Download on the</div>
          <div className={cn('text-base font-semibold leading-tight', light ? 'text-neutral-900' : 'text-white')}>App Store</div>
        </div>
      )}
      {small && <span className={cn('text-xs font-semibold', light ? 'text-neutral-900' : 'text-white')}>App Store</span>}
    </a>
  );
}

function PlayStoreBadge({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-3 rounded-2xl px-5 py-3 opacity-50 cursor-not-allowed',
      light ? 'bg-white' : 'bg-neutral-800',
      className,
    )}>
      <svg viewBox="0 0 24 24" className={cn('w-6 h-6', light ? 'fill-neutral-700' : 'fill-white')}>
        <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z" />
      </svg>
      <div className="text-left">
        <div className={cn('text-[10px] leading-none', light ? 'text-neutral-500' : 'text-white/70')}>Get it on</div>
        <div className={cn('text-base font-semibold leading-tight', light ? 'text-neutral-900' : 'text-white')}>
          Google Play <span className="text-xs font-normal opacity-60">— მალე</span>
        </div>
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
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
function Hero() {
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
const painPoints = [
  { emoji: '🗂', text: 'საათობით ქაღალდზე ხელით ავსებ ფორმებს' },
  { emoji: '📋', text: 'PDF-ს ვერ გააკეთებ სამშენებლო მოედნიდან — მოგიწევს ოფისში დაბრუნება' },
  { emoji: '⚠️', text: 'ინსპექცია ჩამოვა და დოკუმენტაცია არასრული' },
];

function PainSection() {
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
const steps = [
  { n: '01', title: 'შეარჩიე შემოწმების ტიპი', desc: '10+ შაბლონი: ხარაჩო, ექსკავატორი, ქამარი, ბობკატი და სხვა', label: 'template selector' },
  { n: '02', title: 'შეავსე პირდაპირ ობიექტზე', desc: 'GPS ფოტოები, ხელმოწერები, კომენტარები — ყველაფერი ერთ ადგილას', label: 'checklist screen' },
  { n: '03', title: 'PDF — 30 წამში', desc: 'სრული, დაცული, ციფრულად ხელმოწერილი დოკუმენტი', label: 'PDF result' },
];

function HowItWorks() {
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
const features = [
  { Icon: ClipboardList, title: '10+ შემოწმების შაბლონი', desc: 'ფასადის ხარაჩო, ქამარი, ბობკატი, ექსკავატორი...' },
  { Icon: MapPin, title: 'GPS ფოტო ტეგირება', desc: 'ყოველი ფოტო — ლოკაციით და დროის ნიშნულით' },
  { Icon: Lock, title: 'დაშიფრული PDF', desc: 'SHA256 ჰეში, კანონიერი ძალის მქონე დოკუმენტი' },
  { Icon: PenLine, title: 'ციფრული ხელმოწერები', desc: 'პირდაპირ ეკრანზე, PDF-ში ჩაშენებული' },
  { Icon: Calendar, title: 'კალენდარი და შეხსენებები', desc: '10-დღიანი ციკლი, ვადაგადაცილების გაფრთხილება' },
  { Icon: BookOpen, title: 'ქართული კანონმდებლობა', desc: '№477 დადგენილება, matsne.gov.ge მონიტორინგი' },
];

function FeaturesGrid() {
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
const freeFeatures = ['3 PDF გენერაცია', 'ყველა შაბლონი', 'GPS ფოტოები', 'ციფრული ხელმოწერები'];
const proFeatures = ['შეუზღუდავი PDF', 'ყველა უფასო ფუნქცია +', 'PDF ისტორია', 'პრიორიტეტული მხარდაჭერა', 'ყოველი ახალი შაბლონი'];

function Pricing() {
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
const faqs = [
  { q: 'რა ფორმატშია PDF?', a: 'HUBBLE გენერირებს სრულ PDF დოკუმენტს SHA256 ჰეშით, GPS კოორდინატებით, ფოტოებითა და ციფრული ხელმოწერებით. ფაილი ინახება Supabase Storage-ში და ხელმისაწვდომია ნებისმიერ დროს.' },
  { q: 'iOS-ზე ხელმისაწვდომია?', a: 'დიახ. HUBBLE ამჟამად iOS-ზეა ხელმისაწვდომი App Store-ის მეშვეობით. Android-ის ვერსია მუშავდება.' },
  { q: 'ინტერნეტის გარეშე მუშაობს?', a: 'შემოწმების ფორმების შევსება ოფლაინ რეჟიმშიც შესაძლებელია. PDF გენერაცია და ფოტოების ატვირთვა ინტერნეტ კავშირს საჭიროებს.' },
  { q: 'BOG-ის გარდა სხვა გადახდა?', a: 'ამჟამად მხოლოდ BOG-ს მხარს ვუჭერთ. სხვა ბანკებისა და Visa/Mastercard-ის მხარდაჭერა ახლო მომავალში დაემატება.' },
  { q: 'მონაცემები სად ინახება?', a: 'ყველა მონაცემი ინახება Supabase-ის EU-ზონაში. ორგანიზაციის მონაცემები სხვა ორგანიზაციისთვის მიუწვდომელია (Row Level Security).' },
  { q: 'კორპორატიული ტარიფი გაქვს?', a: '5-ზე მეტი სპეციალისტისთვის გთავაზობთ კორპორატიულ ტარიფს. კონტაქტი: hello@hubble.ge' },
];

function FAQ() {
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
function FinalCTA() {
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
function Footer() {
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

// ─── Sticky mobile bar ────────────────────────────────────────────────────────
function StickyMobileBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fn = () => setVisible(window.scrollY > window.innerHeight * 0.75);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-neutral-200 px-4 py-3 flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 shrink-0">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <p className="flex-1 min-w-0 text-sm font-semibold text-neutral-900 truncate">HUBBLE — გადმოწერე უფასოდ</p>
          <a
            href="#"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d={appleIcon} /></svg>
            App Store
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Exit intent popup ────────────────────────────────────────────────────────
function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const fn = (e: MouseEvent) => { if (e.clientY <= 20) setShow(true); };
    document.addEventListener('mouseleave', fn);
    return () => document.removeEventListener('mouseleave', fn);
  }, [dismissed]);

  const dismiss = () => { setShow(false); setDismissed(true); };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: POST to Formspree / Supabase leads table
    setSubmitted(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="hidden md:flex fixed inset-0 z-50 items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="relative rounded-3xl bg-white p-8 w-full max-w-md mx-4"
          >
            <button onClick={dismiss} className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 transition-colors">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 shrink-0">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-neutral-900">დაველოდე!</p>
                <p className="text-sm text-neutral-500">3 PDF უფასოდ →</p>
              </div>
            </div>
            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <p className="text-sm text-neutral-600 mb-1">მიიღე HUBBLE-ს შესახებ განახლებები პირველ რიგში:</p>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="შენი ელ.ფოსტა" required
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                <button type="submit" className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
                  გამომიგზავნე
                </button>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 mb-1">
                  <Check size={22} className="text-brand-600" />
                </div>
                <p className="font-semibold text-neutral-900">მადლობა!</p>
                <p className="text-sm text-neutral-500">ჩვენ გამოგიგზავნით განახლებებს</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Cookie banner ────────────────────────────────────────────────────────────
function CookieBanner() {
  const [accepted, setAccepted] = useState(() => localStorage.getItem('cookie-accepted') === 'true');
  if (accepted) return null;
  const accept = () => { localStorage.setItem('cookie-accepted', 'true'); setAccepted(true); };
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:bottom-4 md:left-4 md:right-auto md:max-w-sm md:rounded-2xl border-t md:border border-neutral-200 bg-white px-5 py-4">
      <div className="flex items-start gap-3">
        <Cookie size={17} className="shrink-0 text-neutral-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-600 mb-3">
            ვებ-გვერდი იყენებს Cookies-ებს სერვისის გასაუმჯობესებლად.{' '}
            <Link to="/terms" className="text-brand-600 hover:underline">დაწვრილებით</Link>
          </p>
          <div className="flex gap-2">
            <button onClick={accept} className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">
              მიღება
            </button>
            <button onClick={accept} className="rounded-lg px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors">
              დახურვა
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default memo(function Landing() {
  const { session } = useAuth();
  if (session) return <Navigate to="/home" replace />;

  return (
    <div className="font-sans antialiased">
      <Navbar />
      <Hero />
      <PainSection />
      <HowItWorks />
      <FeaturesGrid />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
      <StickyMobileBar />
      <ExitIntentPopup />
      <CookieBanner />
    </div>
  );
});
