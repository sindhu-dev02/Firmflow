import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Receipt, Download } from 'lucide-react';
import { useSubscription, useInvoices, useCancelSubscription } from '@/hooks/useBilling';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/billing/StatusBadge';
import { formatMoney, formatDateTime } from '@/lib/format';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

export function BillingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'org_owner';

  const { data: subData, isLoading: subLoading, isError: subError } = useSubscription();
  const { data: invoiceData, isLoading: invoicesLoading } = useInvoices();
  const cancelSubscription = useCancelSubscription();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (subLoading) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <TableSkeleton rows={3} cols={4} />
      </div>
    );
  }

  if (subError || !subData) {
    return <ErrorState message="Could not load your subscription." />;
  }

  const { subscription } = subData;
  const plan = subscription.plan;
  const isFree = !plan || plan.price === 0;
  const canCancel =
    canManage &&
    !isFree &&
    !subscription.cancelAtPeriodEnd &&
    (subscription.status === 'active' || subscription.status === 'trialing');

  const handleCancel = () => {
    cancelSubscription.mutate(undefined, {
      onSuccess: () => setConfirmingCancel(false),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        {canManage && (
          <Button variant="outline" onClick={() => navigate('/billing/plans')}>
            Change plan
          </Button>
        )}
      </div>

      {/* Current plan */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{plan?.name ?? 'No plan'}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {isFree
                ? 'Free plan'
                : `${formatMoney(plan!.price, plan!.currency)} / ${plan!.billingCycle === 'monthly' ? 'month' : 'year'}`}
            </p>
          </div>
          <StatusBadge status={subscription.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {subscription.status === 'trialing' && subscription.trialEndsAt && (
            <p className="text-sm text-muted-foreground">
              Trial ends on <span className="font-medium text-foreground">{formatDateTime(subscription.trialEndsAt)}</span>
            </p>
          )}

          {subscription.currentPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              {subscription.cancelAtPeriodEnd ? 'Access ends on' : 'Renews on'}{' '}
              <span className="font-medium text-foreground">
                {formatDateTime(subscription.currentPeriodEnd)}
              </span>
            </p>
          )}

          {subscription.cancelAtPeriodEnd && (
            <p className="rounded-md bg-warning/15 px-3 py-2 text-sm text-foreground ring-1 ring-inset ring-warning/40">
              This plan is cancelled and won&apos;t renew. You&apos;ll keep access until the date above.
            </p>
          )}

          {subscription.status === 'past_due' && (
            <p className="rounded-md bg-warning/15 px-3 py-2 text-sm text-foreground ring-1 ring-inset ring-warning/40">
              Your last payment didn&apos;t go through. Update your payment details to avoid losing access.
            </p>
          )}

          {canCancel && (
            <div className="mt-2">
              {confirmingCancel ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">Cancel at the end of this billing period?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancel}
                    isLoading={cancelSubscription.isPending}
                  >
                    Confirm
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingCancel(false)}>
                    Back
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setConfirmingCancel(true)}>
                  Cancel plan
                </Button>
              )}
            </div>
          )}

          {!canManage && (
            <p className="text-xs text-muted-foreground">
              Only the org owner can change or cancel the subscription.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Invoices</h2>

        {invoicesLoading ? (
          <TableSkeleton rows={3} cols={4} />
        ) : !invoiceData || invoiceData.invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Invoices appear here after your first successful payment."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[13px] font-medium text-muted-foreground">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoiceData.invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatDateTime(invoice.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatMoney(invoice.amount, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          invoice.status === 'paid'
                            ? 'bg-success/10 text-success ring-success/25'
                            : invoice.status === 'failed'
                              ? 'bg-destructive/10 text-destructive ring-destructive/20'
                              : 'bg-muted text-muted-foreground ring-border'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {invoice.pdfUrl ? (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Download size={14} />
                          PDF
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}