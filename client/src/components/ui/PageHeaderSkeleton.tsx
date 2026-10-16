export function PageHeaderSkeleton() {
  return (
    <div aria-hidden="true" className="mb-6 flex items-end justify-between gap-4">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
    </div>
  );
}