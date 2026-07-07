import { AnimatePresence, motion } from 'framer-motion';
import { CHIP1, CHIP2, SCENES } from './HeroPhoneScenes';

/**
 * Hero phone stage — an orbital-ring backdrop, a device that cross-fades between
 * four "living" app screens (from `HeroPhoneScenes`), and two floating status chips
 * that update per scene. The active `scene` index is owned by the parent
 * (`HeroSection`) so the flip-word headline and the phone stay in lockstep.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export function HeroPhone({ scene }: { scene: number }) {
  const Scene = SCENES[scene] ?? SCENES[0];
  const c1 = CHIP1[scene];
  const c2 = CHIP2[scene];

  return (
    <div className="relative flex items-center justify-center" style={{ minHeight: 640 }}>
      {/* orbital ring backdrop */}
      <div className="pointer-events-none absolute" style={{ width: 460, height: 460 }} aria-hidden="true">
        <div className="absolute inset-0 animate-hub-spin rounded-full" style={{ border: '1px dashed rgba(20,20,20,.1)' }} />
        <div className="absolute animate-hub-spin-rev rounded-full" style={{ inset: 56, border: '1px solid rgba(20,20,20,.07)' }} />
        <div className="absolute inset-0 animate-hub-spin">
          <span className="absolute rounded-full bg-safety-500" style={{ width: 12, height: 12, top: -6, left: '50%' }} />
        </div>
      </div>

      {/* device */}
      <motion.div
        className="animate-hub-float relative z-[3]"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
        style={{ width: 300, height: 616, borderRadius: 48, background: '#0D0D0D', padding: 11, boxShadow: '0 60px 120px rgba(20,20,20,.34)' }}
      >
        <div className="absolute left-1/2 top-[22px] z-20 h-[26px] w-[104px] -translate-x-1/2 rounded-b-[16px] bg-[#0D0D0D]" />
        <div className="relative h-full w-full overflow-hidden rounded-[38px] bg-[#F2F1EC]">
          <AnimatePresence mode="wait">
            <motion.div
              key={scene}
              className="absolute inset-0 flex flex-col"
              initial={{ opacity: 0, y: 14, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <Scene />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* floating chips */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`c1-${scene}`}
          className="absolute z-[6] flex items-center gap-2.5 rounded-[14px] border border-black/[0.08] bg-white px-[15px] py-[11px]"
          style={{ left: -24, bottom: 96, boxShadow: '0 22px 48px rgba(20,20,20,.18)' }}
          initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.35 }}
        >
          <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] font-black" style={{ background: c1.bg, color: c1.fg }}>{c1.i}</span>
          <div>
            <div className="text-[13px] font-extrabold text-[#141414]">{c1.t}</div>
            <div className="text-[11px] text-[#9a9a93]">{c1.s}</div>
          </div>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.div
          key={`c2-${scene}`}
          className="absolute z-[6] flex items-center gap-2.5 rounded-[14px] border border-black/[0.08] bg-white px-3.5 py-2.5"
          style={{ right: -18, top: 120, boxShadow: '0 22px 48px rgba(20,20,20,.18)' }}
          initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.35, delay: 0.05 }}
        >
          <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] text-[15px] font-black" style={{ background: 'rgba(255,90,31,.12)', color: '#FF5A1F' }}>{c2.i}</span>
          <div className="text-[12px] font-extrabold text-[#141414]">{c2.t}</div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
