import type { OrderStatus } from '@/types';

const STYLES: Record<OrderStatus, string> = {
  pending: 'bg-warning/15 text-amber-800 ring-warning/30 dark:text-amber-300',
  confirmed: 'bg-primary/10 text-primary ring-primary/20',
  fulfilled: 'bg-success/10 text-success ring-success/25',
  cancelled: 'bg-muted text-muted-foreground ring-border',
};

const LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}