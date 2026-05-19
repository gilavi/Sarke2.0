import { Skeleton } from '@mantine/core';
import { cn } from '@/lib/utils';

export default function SkeletonCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <Skeleton height={16} radius="md" mb={8} width="40%" />
      <Skeleton height={12} radius="md" width="60%" />
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
        <Skeleton height={12} radius="md" width={96} />
        <Skeleton height={16} width={16} radius="md" />
      </div>
      <Skeleton height={32} radius="md" width={48} />
    </div>
  );
}

export function SkeletonGrid({ count = 6, cols = 3 }: { count?: number; cols?: 2 | 3 }) {
  return (
    <div className={`grid gap-6 md:grid-cols-2 ${cols === 3 ? 'xl:grid-cols-3' : ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2 dark:border-neutral-800 dark:bg-neutral-900">
          <Skeleton height={20} radius="md" width="75%" />
          <Skeleton height={12} radius="md" width="50%" />
          <Skeleton height={12} radius="md" width="66%" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetailPage() {
  return (
    <div className="space-y-8">
      <Skeleton height={12} radius="md" width={64} />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton height={32} radius="md" width={256} />
          <Skeleton height={12} radius="md" width={128} />
        </div>
        <Skeleton height={36} radius="md" width={80} />
      </div>
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} height={32} radius="md" width={80} />
        ))}
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3 dark:border-neutral-800 dark:bg-neutral-900">
        <Skeleton height={16} radius="md" width={128} />
        <Skeleton height={12} radius="md" />
        <Skeleton height={12} radius="md" width="80%" />
        <Skeleton height={12} radius="md" width="60%" />
      </div>
    </div>
  );
}
