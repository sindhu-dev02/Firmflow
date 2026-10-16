import type { SubscriptionStatus } from '@/types';

const STYLES: Record<SubscriptionStatus, string> = {
  active: 'bg-success/10 text-success ring-success/25',
  trialing: 'bg-primary/10 text-primary ring-primary/20',
  past_due: 'bg-warning/15 text-amber-800 ring-warning/30 dark:text-amber-300',
  cancelled: 'bg-muted text-muted-foreground ring-border',
  created: 'bg-muted text-muted-foreground ring-border',
};

const LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past due',
  cancelled: 'Cancelled',
  created: 'Pending',
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}