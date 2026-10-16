import { useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, ShoppingCart, FilterX } from 'lucide-react';
import { useOrders, useCreateOrder, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { useTeam } from '@/hooks/useTeam';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { SelectField } from '@/components/ui/SelectField';
import { formatMoney, formatDateTime } from '@/lib/format';
import type { OrderStatus } from '@/types';
import { useConfirm } from '@/hooks/useConfirm';

const selectClass =
  'rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring';

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
  const confirm = useConfirm();
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useOrders({
    ...(statusFilter ? { status: statusFilter } : {}),
    page,
    limit: 20,
  });
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
      onSuccess: () => setFormOpen(false),
    });
  };

  const openForm = () => {
    reset({ customerId: '', items: [{ productId: '', quantity: 1 }] });
    setFormOpen(true);
  };

  const change = async (id: string, status: OrderStatus) => {
    if (status === 'cancelled') {
      const ok = await confirm({
        title: 'Cancel this order?',
        message: 'The stock for these items will be put back. This cannot be undone.',
        confirmLabel: 'Cancel order',
        cancelLabel: 'Keep order',
        tone: 'danger',
      });
      if (!ok) return;
    }
    updateStatus.mutate({ id, status });
  };

  if (isLoading) return <PageSkeleton cols={6} />;

  if (isError || !data) {
    return <ErrorState message="Could not load orders." onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Order list */}
      <div>
        <PageHeader
          title="Orders"
          description={`${data.pagination.total} ${data.pagination.total === 1 ? 'order' : 'orders'}${statusFilter ? ` · ${statusFilter}` : ''}`}
          extra={
            <select
              aria-label="Filter by status"
              className={selectClass}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as OrderStatus | '');
                setPage(1);
              }}
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          }
          action={
            <Button type="button" onClick={openForm}>
              <Plus size={16} /> New order
            </Button>
          }
        />

        {data.orders.length === 0 ? (
          statusFilter ? (
            <EmptyState
              icon={FilterX}
              title={`No ${statusFilter} orders`}
              description="There are no orders with this status right now."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('');
                    setPage(1);
                  }}
                >
                  Show all orders
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ShoppingCart}
              title="No orders yet"
              description="Create an order for one of your customers to see it here."
              action={
                <Button type="button" onClick={openForm}>
                  <Plus size={16} /> New order
                </Button>
              }
            />
          )
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  {['Order', 'Customer', 'Items', 'Total', 'Status', 'Date', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-[13px] font-medium text-muted-foreground ${
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

        <Pagination
          page={data.pagination.page}
          pages={data.pagination.pages}
          total={data.pagination.total}
          limit={data.pagination.limit}
          onPageChange={setPage}
          noun="orders"
        />
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        size="lg"
        title="New order"
        description="Pick a customer and add the products they are buying."
        footer={
          customers.length === 0 || products.length === 0 ? (
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Close
            </Button>
          ) : (
            <>
              <p className="mr-auto self-center text-sm text-muted-foreground">
                Total{' '}
                <span className="text-base font-semibold text-foreground">
                  {formatMoney(formTotal, 'INR')}
                </span>
              </p>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="order-form" isLoading={createOrder.isPending}>
                Create order
              </Button>
            </>
          )
        }
      >
        {customers.length === 0 || products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {customers.length === 0 && (
              <p>You need at least one customer first. Add one on the Customers page.</p>
            )}
            {products.length === 0 && (
              <p>You need at least one active product first. Add one on the Products page.</p>
            )}
          </div>
        ) : (
          <form id="order-form"
          noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <SelectField label="Customer" error={errors.customerId?.message} {...register('customerId')}>
              <option value="">Choose a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </SelectField>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2 text-sm font-medium text-foreground">
                <span className="flex-1">Product</span>
                <span className="w-20">Qty</span>
                <span className="w-24 text-right">Line total</span>
                <span className="w-9" />
              </div>

              {fields.map((field, index) => {
                const product = products.find((p) => p.id === watchedItems?.[index]?.productId);
                const qty = Number(watchedItems?.[index]?.quantity) || 0;
                return (
                  <div key={field.id} className="flex items-start gap-2">
                    <div className="flex flex-1 flex-col gap-1">
                      <select
                        aria-label={`Product ${index + 1}`}
                        className={selectClass}
                        {...register(`items.${index}.productId`)}
                      >
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

                    <div className="flex w-20 flex-col gap-1">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        aria-label={`Quantity ${index + 1}`}
                        className={selectClass}
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                      {errors.items?.[index]?.quantity && (
                        <span className="text-xs text-destructive">
                          {errors.items[index]?.quantity?.message}
                        </span>
                      )}
                    </div>

                    <span className="w-24 pt-2 text-right text-sm text-foreground">
                      {product ? formatMoney(product.price * qty, 'INR') : '—'}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-9 px-0"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                );
              })}

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
          </form>
        )}
      </Modal>
    </div>
  );
}