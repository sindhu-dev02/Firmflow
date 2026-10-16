import { Link } from 'react-router';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Package, ShoppingCart, Users, UserCheck, IndianRupee } from 'lucide-react';
import { useDashboard } from '@/hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { formatMoney, formatDateTime } from '@/lib/format';
import type { DashboardBusiness } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon size={16} className="text-muted-foreground" />
        </div>
        <p className="mt-2 font-display text-3xl font-semibold text-foreground">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit === -1;
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const nearlyFull = !unlimited && percent >= 80;

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {used} of {unlimited ? 'unlimited' : limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${nearlyFull ? 'bg-warning' : 'bg-primary'}`}
          style={{ width: unlimited ? '8%' : `${percent}%` }}
        />
      </div>
    </div>
  );
}

function BusinessSections({ business }: { business: DashboardBusiness }) {
  const { counts, usage, last7Days, recentOrders, lowStock } = business;
  const isFull = (u: { used: number; limit: number }) => u.limit !== -1 && u.used >= u.limit;
  const isNearly = (u: { used: number; limit: number }) =>
    u.limit !== -1 && u.used / u.limit >= 0.8;
  const atLimit = isFull(usage.products) || isFull(usage.employees);
  const nearLimit = isNearly(usage.products) || isNearly(usage.employees);
  const hasSales = last7Days.some((d) => d.revenue > 0);

  const chartData = last7Days.map((d) => ({
    ...d,
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    }),
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total sales"
          value={formatMoney(business.totalRevenue, 'INR')}
          hint="Cancelled orders not counted"
          icon={IndianRupee}
        />
        <StatCard
          label="Orders"
          value={counts.orders}
          hint={`${counts.pendingOrders} pending`}
          icon={ShoppingCart}
        />
        <StatCard
          label="Products"
          value={counts.products}
          hint={`${counts.activeProducts} active`}
          icon={Package}
        />
        <StatCard label="Customers" value={counts.customers} icon={UserCheck} />
        <StatCard label="Team" value={usage.employees.used + 1} hint="Including the owner" icon={Users} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales, last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasSales ? (
              <div className="grid h-64 place-items-center rounded-md border border-dashed border-border text-center">
                <div>
                  <p className="text-sm font-medium text-foreground">No sales in the last 7 days</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <Link to="/orders" className="font-medium text-primary hover:underline">
                      Create an order
                    </Link>{' '}
                    and it will show up here.
                  </p>
                </div>
              </div>
            ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    width={56}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v: number) => `₹${Math.round(v / 100)}`}
                  />
                  <Tooltip
                    formatter={(v) => [formatMoney(Number(v), 'INR'), 'Sales']}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan usage{usage.planName ? ` · ${usage.planName}` : ''}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <UsageBar label="Products" used={usage.products.used} limit={usage.products.limit} />
            <UsageBar label="Employees" used={usage.employees.used} limit={usage.employees.limit} />
            {nearLimit && (
              <Link to="/billing/plans" className="text-sm font-medium text-primary hover:underline">
                {atLimit ? 'Limit reached. Upgrade your plan →' : 'Running low. See plans →'}
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No orders yet. They will show up here as soon as you create one.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{formatMoney(o.totalAmount, 'INR')}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.itemCount} item{o.itemCount === 1 ? '' : 's'} · {formatDateTime(o.createdAt)}
                      </p>
                    </div>
                    <OrderStatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            )}
            <Link to="/orders" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              View all orders →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Running low on stock</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products are well stocked.</p>
            ) : (
              <ul className="divide-y divide-border">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                    </div>
                    <span className={p.stock === 0 ? 'font-medium text-destructive' : 'text-amber-700 dark:text-warning'}>
                      {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/products" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Manage products →
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message="Could not load the dashboard." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{data.organization.name}</h1>
        <p className="text-sm text-muted-foreground">/{data.organization.slug}</p>
      </div>

      {data.business ? (
        <BusinessSections business={data.business} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-foreground">
              Welcome to {data.organization.name}.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account is ready. You can update your details on the{' '}
              <Link to="/profile" className="font-medium text-primary hover:underline">
                Profile
              </Link>{' '}
              page. More features for customers are coming soon.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}