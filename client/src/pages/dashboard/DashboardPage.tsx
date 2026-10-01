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
import { formatMoney, formatDateTime } from '@/lib/format';
import type { DashboardBusiness } from '@/types';

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
        <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
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

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  confirmed: 'bg-primary/15 text-primary',
  fulfilled: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/15 text-destructive',
};

function BusinessSections({ business }: { business: DashboardBusiness }) {
  const { counts, usage, last7Days, recentOrders, lowStock } = business;
  const nearLimit =
    (usage.products.limit !== -1 && usage.products.used / usage.products.limit >= 0.8) ||
    (usage.employees.limit !== -1 && usage.employees.used / usage.employees.limit >= 0.8);

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
                Running low. See plans →
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
              <p className="text-sm text-muted-foreground">No orders yet.</p>
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
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        STATUS_STYLES[o.status] ?? ''
                      }`}
                    >
                      {o.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
                    <span className={p.stock === 0 ? 'font-medium text-destructive' : 'text-warning'}>
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
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load dashboard.</p>;
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
            <p className="text-sm text-muted-foreground">
              Welcome to {data.organization.name}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}