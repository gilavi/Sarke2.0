import { motion } from 'framer-motion';
interface ProgressRingProps { value: number; max: number; size?: number; stroke?: string; }
export function ProgressRing({ value, max, size = 40, stroke = '#147A4F' }: ProgressRingProps) {
  const pct = max === 0 ? 0 : (value / max) * 100;
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={3} fill="none" className="text-neutral-200 dark:text-neutral-700" />
      <motion.circle cx={size/2} cy={size/2} r={r} stroke={stroke} strokeWidth={3} fill="none" strokeLinecap="round"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (c * pct / 100) }} transition={{ duration: 0.8, ease: 'easeOut' }} />
    </svg>
  );
}
