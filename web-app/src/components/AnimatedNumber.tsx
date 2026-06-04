import { useEffect, useState } from 'react';
import { useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { SPRING } from '@/lib/animations';

type Format = (n: number) => string;
const defaultFormat: Format = (n) => Math.round(n).toLocaleString('ka-GE');

/**
 * Count-up animation for a dashboard stat. Springs from 0 to `value` on mount and
 * whenever `value` changes. Honors prefers-reduced-motion (renders the final number
 * immediately, with no spring/effect).
 */
export function AnimatedNumber({
  value,
  className,
  format = defaultFormat,
}: {
  value: number;
  className?: string;
  format?: Format;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{format(value)}</span>;
  return <CountingNumber value={value} className={className} format={format} />;
}

function CountingNumber({ value, className, format }: { value: number; className?: string; format: Format }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { ...SPRING.counter });
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    mv.set(value); // motion-value setter, not React state — drives the spring
    return spring.on('change', (v) => setDisplay(format(v)));
  }, [value, mv, spring, format]);

  return <span className={className}>{display}</span>;
}
