import { useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { useOrders, useCreateOrder, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { useTeam } from '@/hooks/useTeam';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { Button } from '@/components/ui/Button';
import { formatMoney, formatDateTime } from '@/lib/format';
import type { OrderStatus } from '@/types';

const selectClass =
  'rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring';

const orderSchema = z.object({
  customerId: z.string().min(1, 'Choose a customer'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Choose a product'),
        quantity: z.number().int('Whole numbers only').min(1, 'At least 1'),
      }),
    )
    .min(1, 'Add at least one item'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

const FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'All orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  const { data, isLoading, isError } = useOrders(
    statusFilter ? { status: statusFilter } : {},
  );
  const { data: productsData } = useProducts({ isActive: true, limit: 100 });
  const { data: teamData } = useTeam();

  const createOrder = useCreateOrder();
  const updateStatus = useUpdateOrderStatus();

  const products = productsData?.products ?? [];
  const customers = (teamData?.users ?? []).filter(
    (u) => u.role === 'customer' && u.isActive,
  );
  // For showing a customer's name in the table (includes inactive ones)
  const customerNames = new Map(
    (teamData?.users ?? []).map((u) => [u.id, u.name]),
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: '',
      items: [{ productId: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' });

  // Live total shown under the form
  const formTotal = (watchedItems ?? []).reduce((sum, item) => {
    const product = products.find((p) => p.id === item?.productId);
    const qty = Number(item?.quantity) || 0;
    return sum + (product ? product.price * qty : 0);
  }, 0);

  const onSubmit = (values: OrderFormValues) => {
    createOrder.mutate(values, {
      onSuccess: () => reset({ customerId: '', items: [{ productId: '', quantity: 1 }] }),
    });
  };

  const change = (id: string, status: OrderStatus) => {
    if (status === 'cancelled') {
      const ok = window.confirm('Cancel this order? The stock will be put back.');
      if (!ok) return;
    }
    updateStatus.mutate({ id, status });
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load orders.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Order list */}
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {data.pagination.total} {data.pagination.total === 1 ? 'order' : 'orders'}
            </span>
            <select
              className={selectClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {data.orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm font-medium text-foreground">No orders yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first order using the form below.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  {['Order', 'Customer', 'Items', 'Total', 'Status', 'Date', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-medium uppercase text-muted-foreground ${
                          h === 'Actions' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.orders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {customerNames.get(order.customerId) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {order.items.map((i) => `${i.nameSnapshot} × ${i.quantity}`).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatMoney(order.totalAmount, 'INR')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {order.status === 'pending' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={updateStatus.isPending}
                            onClick={() => change(order.id, 'confirmed')}
                          >
                            Confirm
                          </Button>
                        )}
                        {order.status === 'confirmed' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={updateStatus.isPending}
                            onClick={() => change(order.id, 'fulfilled')}
                          >
                            Mark fulfilled
                          </Button>
                        )}
                        {(order.status === 'pending' || order.status === 'confirmed') && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={updateStatus.isPending}
                            onClick={() => change(order.id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create order form */}
      <div className="max-w-xl">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Create an order</h2>

        {customers.length === 0 || products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {customers.length === 0 && (
              <p>
                You need at least one customer first. Add one on the Customers page.
              </p>
            )}
            {products.length === 0 && (
              <p>You need at least one active product first. Add one on the Products page.</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">Customer</label>
              <select className={selectClass} {...register('customerId')}>
                <option value="">Choose a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
              {errors.customerId && (
                <span className="text-xs text-destructive">{errors.customerId.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Items</label>

              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex flex-1 flex-col gap-1">
                    <select className={selectClass} {...register(`items.${index}.productId`)}>
                      <option value="">Choose a product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.stock === 0}>
                          {p.name} — {formatMoney(p.price, 'INR')} ({p.stock} in stock)
                        </option>
                      ))}
                    </select>
                    {errors.items?.[index]?.productId && (
                      <span className="text-xs text-destructive">
                        {errors.items[index]?.productId?.message}
                      </span>
                    )}
                  </div>

                  <div className="flex w-24 flex-col gap-1">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className={selectClass}
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                    {errors.items?.[index]?.quantity && (
                      <span className="text-xs text-destructive">
                        {errors.items[index]?.quantity?.message}
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}

              {errors.items?.message && (
                <span className="text-xs text-destructive">{errors.items.message}</span>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => append({ productId: '', quantity: 1 })}
              >
                <Plus size={14} /> Add another item
              </Button>
            </div>

            <p className="text-sm text-foreground">
              Total: <span className="font-semibold">{formatMoney(formTotal, 'INR')}</span>
            </p>

            <Button type="submit" isLoading={createOrder.isPending}>
              Create order
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}