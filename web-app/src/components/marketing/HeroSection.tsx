import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppStoreBadge, APP_STORE_URL, fadeUp, stagger } from '@/pages/landing/shared';
import { HeroPhone } from './HeroPhone';

const ROTATING_WORDS = ['შემოწმების აქტი', 'ინსტრუქტაჟი', 'რეპორტი', 'ბრძანება'];
const ROTATE_MS = 2600;

export function HeroSection() {
  const [scene, setScene] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAuto = () => {
    stopAuto();
    timer.current = setInterval(() => setScene(s => (s + 1) % ROTATING_WORDS.length), ROTATE_MS);
  };
  const stopAuto = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    startAuto();
    return stopAuto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (i: number) => {
    setScene(i);
    startAuto(); // restart the dwell timer on manual pick
  };

  return (
    <section className="relative overflow-hidden bg-offwhite" style={{ paddingTop: 128, paddingBottom: 88 }}>
      {/* soft auras */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[760px] w-[760px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,90,31,.15), rgba(255,90,31,0) 60%)' }} aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-56 -left-40 h-[520px] w-[520px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(230,255,77,.14), rgba(230,255,77,0) 62%)' }} aria-hidden="true" />
      {/* faint grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(20,20,20,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(20,20,20,.035) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 70% 40%,#000,transparent 75%)',
          maskImage: 'radial-gradient(ellipse 80% 60% at 70% 40%,#000,transparent 75%)',
        }}
        aria-hidden="true"
      />

      <div
        className="relative mx-auto grid items-center"
        style={{ maxWidth: 1280, padding: '24px 56px 56px', gridTemplateColumns: '1.05fr .95fr', gap: 40, minHeight: 620 }}
      >
        {/* ── Left: copy ── */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col">
          <motion.div variants={fadeUp}>
            <span
              className="mb-6 inline-flex items-center gap-2 rounded-full text-[13px] font-semibold"
              style={{ color: '#9a4a23', background: 'rgba(255,90,31,.1)', border: '1px solid rgba(255,90,31,.25)', padding: '7px 14px' }}
            >
              <span className="h-[7px] w-[7px] animate-hub-blink rounded-full bg-safety-500" />
              სამშენებლო კომპანიებისთვის
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            style={{ margin: '0 0 26px', fontSize: 'clamp(44px,5.4vw,66px)', lineHeight: 1.02, fontWeight: 900, letterSpacing: '-0.04em', color: '#141414' }}
          >
            შექმენი
            <br />
            <span style={{ display: 'block', perspective: '700px', overflow: 'hidden' }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={scene}
                  className="inline-block text-safety-500"
                  style={{ transformOrigin: 'center' }}
                  initial={{ rotateX: 90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } }}
                  exit={{ rotateX: -90, opacity: 0, transition: { duration: 0.3, ease: [0.5, 0, 0.8, 0] } }}
                >
                  {ROTATING_WORDS[scene]}
                </motion.span>
              </AnimatePresence>
            </span>
            2 წუთში
          </motion.h1>

          <motion.p variants={fadeUp} style={{ margin: '0 0 34px', fontSize: 19, lineHeight: 1.6, color: '#56564f', maxWidth: '44ch' }}>
            Hubble ათავისუფლებს შენს გუნდს ქაღალდისგან. შეავსე, მოაწერე ხელი, გაგზავნე — პირდაპირ სამშენებლო მოედნიდან.
          </motion.p>

          <motion.div variants={fadeUp} className="mb-10 flex flex-wrap items-center gap-3.5">
            <AppStoreBadge href={APP_STORE_URL} />
            <button
              onClick={() => document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 transition-colors hover:bg-black/5"
              style={{ border: '1px solid rgba(20,20,20,.2)', color: '#141414', fontWeight: 600, fontSize: 15, padding: '13px 22px', borderRadius: 13, background: 'transparent' }}
            >
              ნახე როგორ მუშაობს ↓
            </button>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center gap-3.5">
            <div className="flex">
              {[{ bg: '#C9C8C0' }, { bg: '#B0AFA6' }, { bg: '#FF5A1F', label: '+' }].map((a, i) => (
                <span
                  key={i}
                  className="flex items-center justify-center rounded-full border-2 border-offwhite text-[12px] font-bold text-white"
                  style={{ width: 38, height: 38, background: a.bg, marginRight: i < 2 ? -12 : 0 }}
                >
                  {a.label}
                </span>
              ))}
            </div>
            <span className="text-[14px] text-[#7a7a72]">450+ კომპანია ენდობა Hubble-ს</span>
          </motion.div>
        </motion.div>

        {/* ── Right: rotating phone ── */}
        <div className="relative" onMouseEnter={stopAuto} onMouseLeave={startAuto}>
          <HeroPhone scene={scene} />
          {/* scene dots */}
          <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-2.5">
            {ROTATING_WORDS.map((w, i) => (
              <button
                key={w}
                aria-label={w}
                onClick={() => goTo(i)}
                className="h-2 rounded-full transition-all"
                style={{ width: i === scene ? 26 : 8, background: i === scene ? '#FF5A1F' : 'rgba(20,20,20,.18)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
