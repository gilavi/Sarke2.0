import { cn } from '@/lib/utils';

// External App Store listing. Placeholder until the real listing URL exists.
// Kept as an absolute-ish external link (NOT a "#anchor", which HashRouter would
// hijack into a route change). TODO: replace with the real App Store URL.
export const APP_STORE_URL = '#';

// ─── Brand mark ───────────────────────────────────────────────────────────────
/**
 * Hubble logo — the chunky rounded "H" monogram with a diagonal wave carved
 * through the middle. Single-color, `fill="currentColor"` so it inherits the
 * surrounding text color (graphite on light, white on the orange chip, …).
 * evenodd path: rounded square minus a top notch, bottom notch, and the wave.
 */
export function HubbleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 250 250" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" role="img">
      <path d="M247.5442,81.6993c-1.3564,0-2.4558,1.0994-2.4558,2.4558,0,7.9693-1.1761,15.8193-3.4966,23.3344-7.7204,25.0928-27.3102,44.6825-52.4025,52.4025l-.0019.001c-7.5122,2.3196-15.365,3.4957-23.3425,3.4957H43.3007c-23.8759,0-43.3007,19.4291-43.3007,43.3107s19.4248,43.3007,43.3007,43.3007,43.3103-19.4248,43.3103-43.3007c0-21.1736,17.2213-38.3991,38.3891-38.3991s38.3891,17.2256,38.3891,38.3991c0,23.8759,19.4286,43.3007,43.3103,43.3007s43.3007-19.4248,43.3007-43.3007v-122.5442c0-1.3564-1.0994-2.4558-2.4558-2.4558Z" />
      <path d="M2.4558,168.3002c1.3564,0,2.4558-1.0994,2.4558-2.4558,0-7.9722,1.1761-15.8221,3.4966-23.3358,3.7624-12.2507,10.5791-23.5541,19.7126-32.688,9.1056-9.1052,20.3745-15.9094,32.5959-19.6814.0393-.0101.0767-.0206.1151-.0326,7.5122-2.3196,15.3593-3.4957,23.3233-3.4957h122.5442c23.8759,0,43.3007-19.4291,43.3007-43.3107S230.5752,0,206.6993,0s-43.3103,19.4243-43.3103,43.3002c0,21.1736-17.2213,38.3991-38.3891,38.3991s-38.3891-17.2256-38.3891-38.3991C86.6109,19.4243,67.1823,0,43.3007,0S0,19.4243,0,43.3002v122.5442c0,1.3564,1.0994,2.4558,2.4558,2.4558Z" />
    </svg>
  );
}

// ─── Animation helpers ────────────────────────────────────────────────────────
export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};
export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

// ─── Phone mockup — app home screen ──────────────────────────────────────────
export function PhoneMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn('relative flex-shrink-0', className)}
      style={{ width: 280, height: 572, borderRadius: 46, background: '#141414', padding: 10, boxShadow: '0 50px 90px rgba(20,20,20,.28)' }}
    >
      {/* Dynamic island */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', width: 96, height: 22, background: '#141414', borderRadius: '0 0 14px 14px', zIndex: 10 }} />
      {/* Screen */}
      <div style={{ width: '100%', height: '100%', borderRadius: 38, overflow: 'hidden', background: '#F2F1EC', display: 'flex', flexDirection: 'column' }}>
        {/* Status bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 4px', fontSize: 12, fontWeight: 700, color: '#141414' }}>
          <span>9:41</span>
          <span style={{ fontSize: 10 }}>▮▮▮ ▾</span>
        </div>
        {/* App header */}
        <div style={{ padding: '6px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: '#7a7a72' }}>გამარჯობა,</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#141414', letterSpacing: '-0.02em' }}>გიორგი მ.</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HubbleLogo className="w-[18px] h-[18px] text-white" />
          </div>
        </div>
        {/* Safety status card */}
        <div style={{ margin: '12px 14px 0', background: '#1A1A1A', borderRadius: 18, padding: 15, color: '#F2F1EC', position: 'relative', overflow: 'hidden' }}>
          <div className="animate-hub-spin" style={{ position: 'absolute', right: -24, top: -24, width: 100, height: 100, border: '1.5px dashed rgba(230,255,77,.4)', borderRadius: '50%' }} />
          <div style={{ fontSize: 11, color: '#b8b8b0', marginBottom: 7 }}>დღევანდელი სტატუსი</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#E6FF4D', color: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15 }}>✓</span>
            <span style={{ fontSize: 18, fontWeight: 900 }}>უსაფრთხო</span>
          </div>
          <div style={{ marginTop: 12, height: 5, borderRadius: 99, background: 'rgba(255,255,255,.14)', overflow: 'hidden' }}>
            <div style={{ width: '95%', height: '100%', background: '#E6FF4D' }} />
          </div>
          <div style={{ fontSize: 10, color: '#b8b8b0', marginTop: 6 }}>38/40 ინსტრუქტაჟი ჩატარდა</div>
        </div>
        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 14px 0' }}>
          <div style={{ background: '#fff', border: '1px solid rgba(20,20,20,.07)', borderRadius: 14, padding: 11 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(255,90,31,.12)', color: '#FF5A1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: 8, fontSize: 13 }}>⚠</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#141414', lineHeight: 1.2 }}>რისკის შეფასება</div>
            <div style={{ fontSize: 10, color: '#9a9a93' }}>3 ღია</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(20,20,20,.07)', borderRadius: 14, padding: 11 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(20,20,20,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: 8, fontSize: 13, color: '#141414' }}>▤</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#141414', lineHeight: 1.2 }}>დოკუმენტები</div>
            <div style={{ fontSize: 10, color: '#9a9a93' }}>ყველა ხელთ</div>
          </div>
        </div>
        {/* Next instruction */}
        <div style={{ margin: '10px 14px 0', background: '#fff', border: '1px solid rgba(20,20,20,.07)', borderRadius: 14, padding: '10px 11px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: '#E6FF4D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#1A1A1A', fontSize: 16 }}>↗</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#141414' }}>სიმაღლეზე მუშაობა</div>
            <div style={{ fontSize: 10, color: '#9a9a93' }}>შემდეგი ინსტრუქტაჟი · 10:30</div>
          </div>
          <span style={{ fontSize: 16, color: '#c4c3bd' }}>›</span>
        </div>
        {/* Bottom nav */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-around', padding: '11px 16px 16px', borderTop: '1px solid rgba(20,20,20,.06)', background: '#F7F6F2' }}>
          {['#1A1A1A', '#d8d7cf', '#d8d7cf', '#d8d7cf'].map((bg, i) => (
            <span key={i} style={{ width: 22, height: 22, borderRadius: 6, background: bg }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── App Store badge ──────────────────────────────────────────────────────────
export const appleIcon = "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z";

export function AppStoreBadge({ href = '#', light = false, small = false, className }: { href?: string; light?: boolean; small?: boolean; className?: string }) {
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

export function PlayStoreBadge({ light = false, className }: { light?: boolean; className?: string }) {
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
