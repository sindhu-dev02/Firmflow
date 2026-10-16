import { useActivityLogs } from '@/hooks/useActivityLogs';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { ActivityLogEntry } from '@/types';
import { History } from 'lucide-react';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

function describeActivity(log: ActivityLogEntry): string {
  const actor = log.actor?.name ?? 'Someone';
  const meta = log.metadata ?? {};
  const text = (key: string) => (typeof meta[key] === 'string' ? (meta[key] as string) : undefined);
  const targetName = text('name');
  const isCustomer = meta.role === 'customer';
  const person = (fallback: string) => targetName ?? (isCustomer ? 'a customer' : fallback);

  switch (log.action) {
    case 'user.invited':
      return isCustomer
        ? `${actor} added customer ${targetName ?? ''}`.trim()
        : `${actor} invited ${targetName ?? 'a new team member'}`;
    case 'user.deactivated':
      return `${actor} deactivated ${person('a team member')}`;
    case 'user.reactivated':
      return `${actor} reactivated ${person('a team member')}`;
    case 'user.updated':
      return `${actor} updated the details of ${person('a team member')}`;
    case 'user.deleted':
      return `${actor} deleted ${person('a team member')}`;
    case 'product.created':
      return `${actor} created product "${targetName ?? 'Unknown'}"`;
    case 'product.updated':
      return `${actor} edited product "${targetName ?? 'Unknown'}"`;
    case 'product.deleted':
      return `${actor} deleted product "${targetName ?? 'Unknown'}"`;
    case 'category.created':
      return `${actor} created category "${targetName ?? 'Unknown'}"`;
    case 'category.renamed':
      return `${actor} renamed category "${text('oldName') ?? 'Unknown'}" to "${targetName ?? 'Unknown'}"`;
    case 'category.deleted':
      return `${actor} deleted category "${targetName ?? 'Unknown'}"`;
    case 'order.created': {
      const total = typeof meta.totalAmount === 'number' ? ` (${formatMoney(meta.totalAmount, 'INR')})` : '';
      const customer = text('customerName');
      return `${actor} created order #${text('ref') ?? ''}${customer ? ` for ${customer}` : ''}${total}`;
    }
    case 'order.status_changed':
      return `${actor} marked order #${text('ref') ?? ''} as ${text('status') ?? 'updated'}`;
    default:
      // Unknown action: show a readable version, e.g. "order.created" -> "order created"
      return `${actor}: ${log.action.replace(/[._]/g, ' ')}`;
  }
}

export function ActivityLogPage() {
  const { data, isLoading, isError } = useActivityLogs();

  if (isLoading) {
    return <PageSkeleton cols={2} />;
  }

  if (isError || !data) {
    return <ErrorState message="Could not load the activity log." />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Activity</h1>
        <span className="text-sm text-muted-foreground">Last {data.logs.length} events</span>
      </div>

      {data.logs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="Actions like invites, orders and product changes will show up here."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {data.logs.map((log) => (
            <li key={log.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground">{describeActivity(log)}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}