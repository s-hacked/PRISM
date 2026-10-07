// Skeleton loaders using the shimmer treatment.
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`card p-4 flex flex-col gap-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="shimmer h-3 w-24" />
          <div className="shimmer h-2.5 w-32" />
        </div>
        <div className="shimmer w-10 h-10 rounded-xl" />
      </div>
      <div className="shimmer h-8 w-28" />
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="h-11 table-head border-b border-hairline-soft" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-hairline-soft">
          <div className="shimmer h-3.5 w-3.5 rounded" />
          <div className="shimmer h-3.5 flex-1" style={{ maxWidth: `${34 + (i % 3) * 16}%` }} />
          <div className="shimmer h-3.5 w-14" />
          <div className="shimmer h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="shimmer w-8 h-8 rounded-xl" />
        <div className="shimmer h-4 w-40" />
      </div>
      <div className="shimmer h-[280px] w-full" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-5 lg:p-6 space-y-5 animate-fade-in">
      <div className="shimmer h-[220px] w-full rounded-3xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <ChartSkeleton className="xl:col-span-7" />
        <ChartSkeleton className="xl:col-span-5" />
      </div>
    </div>
  );
}