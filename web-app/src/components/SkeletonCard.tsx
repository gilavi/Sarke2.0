export default function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-2 h-4 w-2/5 rounded bg-neutral-200" />
      <div className="h-3 w-3/5 rounded bg-neutral-100" />
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-neutral-200" />
        <div className="h-4 w-4 rounded bg-neutral-200" />
      </div>
      <div className="h-8 w-12 rounded bg-neutral-200" />
    </div>
  );
}

export function SkeletonGrid({ count = 6, cols = 3 }: { count?: number; cols?: 2 | 3 }) {
  return (
    <div className={`grid gap-4 md:grid-cols-2 ${cols === 3 ? 'xl:grid-cols-3' : ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
          <div className="h-5 w-3/4 rounded bg-neutral-200" />
          <div className="h-3 w-1/2 rounded bg-neutral-100" />
          <div className="h-3 w-2/3 rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDetailPage() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-3 w-16 rounded bg-neutral-200" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded bg-neutral-200" />
          <div className="h-3 w-32 rounded bg-neutral-100" />
        </div>
        <div className="h-9 w-20 rounded bg-neutral-200" />
      </div>
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-20 rounded bg-neutral-200" />
        ))}
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
        <div className="h-4 w-32 rounded bg-neutral-200" />
        <div className="h-3 w-full rounded bg-neutral-100" />
        <div className="h-3 w-4/5 rounded bg-neutral-100" />
        <div className="h-3 w-3/5 rounded bg-neutral-100" />
      </div>
    </div>
  );
}
