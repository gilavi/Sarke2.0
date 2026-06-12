import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppStoreBadge, APP_STORE_URL, fadeUp, stagger } from '@/pages/landing/shared';

const ROTATING_WORDS = ['შემოწმების აქტი', 'ინსტრუქტაჟი', 'რეპორტი', 'ბრძანება'];

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setWordIndex(i => (i + 1) % ROTATING_WORDS.length), 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden bg-offwhite" style={{ paddingTop: 112, paddingBottom: 80 }}>
      <div
        className="relative mx-auto"
        style={{
          maxWidth: 1280,
          padding: '36px 56px 72px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48,
          alignItems: 'center',
          minHeight: 640,
        }}
      >
        {/* Left: copy */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col">

          {/* Badge */}
          <motion.div variants={fadeUp}>
            <span
              className="inline-flex items-center gap-2 text-[13px] font-semibold rounded-full mb-6"
              style={{
                color: '#9a4a23',
                background: 'rgba(255,90,31,.1)',
                border: '1px solid rgba(255,90,31,.25)',
                padding: '7px 14px',
              }}
            >
              სამშენებლო კომპანიებისთვის
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            style={{
              margin: '0 0 24px',
              fontSize: 58,
              lineHeight: 1.08,
              fontWeight: 900,
              letterSpacing: '-0.035em',
              color: '#141414',
            }}
          >
            შექმენი
            <br />
            {/* Flip container perspective here gives the 3D depth to the child transform */}
            <span style={{ display: 'block', perspective: '600px', overflow: 'hidden' }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  className="text-safety-500"
                  style={{ display: 'inline-block', transformOrigin: 'center center' }}
                  initial={{ rotateX: 90 }}
                  animate={{ rotateX: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
                  exit={{ rotateX: -90, transition: { duration: 0.26, ease: [0.5, 0, 0.8, 0] } }}
                >
                  {ROTATING_WORDS[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
            2 წუთში
          </motion.h1>

          {/* Subline */}
          <motion.p
            variants={fadeUp}
            style={{
              margin: '0 0 34px',
              fontSize: 19,
              lineHeight: 1.6,
              color: '#56564f',
              maxWidth: '42ch',
            }}
          >
            Hubble ათავისუფლებს შენს გუნდს ქაღალდისგან. შეავსე, მოაწერე ხელი, გაგზავნე პირდაპირ სამშენებლო მოედნიდან.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex gap-3.5 items-center flex-wrap">
            <AppStoreBadge href={APP_STORE_URL} />
            <button
              onClick={() => document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 transition-colors hover:bg-black/5"
              style={{
                border: '1px solid rgba(20,20,20,.2)',
                color: '#141414',
                fontWeight: 600,
                fontSize: 17,
                padding: '16px 26px',
                borderRadius: 14,
                background: 'transparent',
              }}
            >
              ნახე როგორ მუშაობს ↓
            </button>
          </motion.div>

        </motion.div>

        {/* Right: phone mockup placeholder */}
        <div
          className="relative flex items-center justify-center rounded-3xl"
          style={{
            height: 580,
            border: '2px dashed rgba(20,20,20,.12)',
            background: 'rgba(20,20,20,.02)',
          }}
        >
          <span className="text-sm font-medium select-none" style={{ color: 'rgba(20,20,20,.22)' }}>
            phone mockup
          </span>
        </div>

      </div>
    </section>
  );
}
