import { PageHeaderSkeleton } from './PageHeaderSkeleton';

// A gray block that pulses while real content is loading
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <div className="flex gap-4 bg-muted px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 bg-border" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-4 flex-1 ${c === 0 ? 'max-w-[10rem]' : ''}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// A whole page while it loads: heading, then a table
export function PageSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div>
      <PageHeaderSkeleton />
      <TableSkeleton cols={cols} />
    </div>
  );
}