import { useActivityLogs } from '@/hooks/useActivityLogs';
import { formatDateTime } from '@/lib/format';
import type { ActivityLogEntry } from '@/types';

function describeActivity(log: ActivityLogEntry): string {
  const actor = log.actor?.name ?? 'Someone';
  const targetName = typeof log.metadata?.name === 'string' ? log.metadata.name : undefined;

  switch (log.action) {
    case 'user.invited':
      return `${actor} invited ${targetName ?? 'a new team member'}`;
    case 'user.deactivated':
      return `${actor} deactivated ${targetName ?? 'a team member'}`;
    case 'user.reactivated':
      return `${actor} reactivated ${targetName ?? 'a team member'}`;
    case 'user.deleted':
      return `${actor} deleted ${targetName ?? 'a team member'}`;
    case 'product.created':
      return `${actor} created product "${targetName ?? 'Unknown'}"`;
    case 'product.deleted':
      return `${actor} deleted product "${targetName ?? 'Unknown'}"`;
    default:
      return `${actor} performed ${log.action}`;
  }
}

export function ActivityLogPage() {
  const { data, isLoading, isError } = useActivityLogs();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading activity…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load activity log.</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Activity</h1>
        <span className="text-sm text-muted-foreground">Last {data.logs.length} events</span>
      </div>

      {data.logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm font-medium text-foreground">No activity yet</p>
          <p className="text-sm text-muted-foreground">
            Actions like invites and product changes will show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card shadow-sm">
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