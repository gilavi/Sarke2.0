import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function ShimmerBlock({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-800 ${className}`}>
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      />
    </div>
  );
}

export default function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <ShimmerBlock className="mb-2 h-4 w-2/5" />
      <ShimmerBlock className="h-3 w-3/5" />
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900", className)}>
      <div className="mb-3 flex items-center justify-between">
        <ShimmerBlock className="h-3 w-24" />
        <ShimmerBlock className="h-4 w-4" />
      </div>
      <ShimmerBlock className="h-8 w-12" />
    </div>
  );
}

export function SkeletonGrid({ count = 6, cols = 3 }: { count?: number; cols?: 2 | 3 }) {
  return (
    <div className={`grid gap-6 md:grid-cols-2 ${cols === 3 ? 'xl:grid-cols-3' : ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2 dark:border-neutral-800 dark:bg-neutral-900">
          <ShimmerBlock className="h-5 w-3/4" />
          <ShimmerBlock className="h-3 w-1/2" />
          <ShimmerBlock className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetailPage() {
  return (
    <div className="space-y-8">
      <ShimmerBlock className="h-3 w-16" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <ShimmerBlock className="h-8 w-64" />
          <ShimmerBlock className="h-3 w-32" />
        </div>
        <ShimmerBlock className="h-9 w-20" />
      </div>
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <ShimmerBlock key={i} className="h-8 w-20" />
        ))}
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3 dark:border-neutral-800 dark:bg-neutral-900">
        <ShimmerBlock className="h-4 w-32" />
        <ShimmerBlock className="h-3 w-full" />
        <ShimmerBlock className="h-3 w-4/5" />
        <ShimmerBlock className="h-3 w-3/5" />
      </div>
    </div>
  );
}
