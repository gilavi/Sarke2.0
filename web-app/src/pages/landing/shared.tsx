import { cn } from '@/lib/utils';

// External App Store listing. Placeholder until the real listing URL exists.
// Kept as an absolute-ish external link (NOT a "#anchor", which HashRouter would
// hijack into a route change). TODO: replace with the real App Store URL.
export const APP_STORE_URL = '#';

// ─── Animation helpers ────────────────────────────────────────────────────────
export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};
export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

// ─── Phone mockup ─────────────────────────────────────────────────────────────
export function PhoneMockup() {
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
