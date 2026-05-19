import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, HardHat } from 'lucide-react';
import { routes } from '@/app/routes';

const BRICKS = Array.from({ length: 6 });

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      {/* Falling bricks animation */}
      <div className="relative mb-8 h-24 w-64 overflow-visible">
        {BRICKS.map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-7 w-14 rounded bg-brand-500 dark:bg-brand-400"
            style={{ left: `${(i % 3) * 80}px` }}
            initial={{ y: -80, opacity: 0, rotate: Math.random() * 20 - 10 }}
            animate={{ y: i < 3 ? 0 : 36, opacity: 1, rotate: 0 }}
            transition={{
              delay: 0.1 * i,
              type: 'spring',
              stiffness: 120,
              damping: 14,
            }}
          />
        ))}
      </div>

      {/* Hard hat */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 16 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950"
      >
        <HardHat size={40} className="text-brand-500 dark:text-brand-400" />
      </motion.div>

      {/* 404 */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="font-display text-[96px] font-bold leading-none tracking-tight text-brand-500 dark:text-brand-400"
      >
        404
      </motion.h1>

      {/* Caution tape stripe */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.0, duration: 0.4, ease: 'easeOut' }}
        className="my-4 h-6 w-72 origin-left overflow-hidden rounded"
        style={{
          background:
            'repeating-linear-gradient(90deg, #FBBF24 0px, #FBBF24 18px, #1a1a1a 18px, #1a1a1a 36px)',
        }}
      />

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="mb-1 font-display text-xl font-semibold text-neutral-800 dark:text-neutral-100"
      >
        Wrong site.
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mb-8 text-sm text-neutral-400 dark:text-neutral-500"
      >
        This page is under construction — or just doesn't exist.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
      >
        <Link
          to={routes.home}
          className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 dark:border-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
        >
          <Home size={16} />
          Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
