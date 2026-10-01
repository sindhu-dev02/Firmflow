import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCustomers,
  useAddCustomer,
  useToggleCustomer,
  useDeleteCustomer,
} from '@/hooks/useCustomers';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { formatMoney, formatDateTime } from '@/lib/format';
import type { Customer } from '@/types';

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export function CustomersPage() {
  const { data, isLoading, isError } = useCustomers();
  const addCustomer = useAddCustomer();
  const toggleCustomer = useToggleCustomer();
  const deleteCustomer = useDeleteCustomer();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === 'org_owner';

  const [search, setSearch] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = (values: CustomerFormValues) =>
    addCustomer.mutate(values, { onSuccess: () => reset() });

  const handleDelete = (customer: Customer) => {
    if (window.confirm(`Delete ${customer.name} for good? This cannot be undone.`)) {
      deleteCustomer.mutate(customer.id);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading customers…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load customers.</p>;
  }

  const term = search.trim().toLowerCase();
  const visible = term
    ? data.customers.filter(
        (c) => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term),
      )
    : data.customers;

  const headerClass =
    'px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground';

  return (
    <div className="flex flex-col gap-8">
      {/* Customer list */}
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {data.customers.length} {data.customers.length === 1 ? 'customer' : 'customers'}
            </span>
            <input
              type="search"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {data.customers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm font-medium text-foreground">No customers yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first customer using the form below.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No customers match “{search}”.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className={headerClass}>Name</th>
                  <th className={headerClass}>Email</th>
                  <th className={headerClass}>Orders</th>
                  <th className={headerClass}>Spent</th>
                  <th className={headerClass}>Last order</th>
                  <th className={headerClass}>Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((customer) => (
                  <tr key={customer.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm text-foreground">{customer.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{customer.email}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{customer.orderCount}</td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatMoney(customer.totalSpent, 'INR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {customer.lastOrderAt ? formatDateTime(customer.lastOrderAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={customer.isActive ? 'text-green-600' : 'text-muted-foreground'}
                      >
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isOwner && (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={toggleCustomer.isPending}
                            onClick={() =>
                              toggleCustomer.mutate({
                                id: customer.id,
                                activate: !customer.isActive,
                              })
                            }
                          >
                            {customer.isActive ? 'Deactivate' : 'Reactivate'}
                          </Button>
                          {!customer.isActive && customer.orderCount === 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              disabled={deleteCustomer.isPending}
                              onClick={() => handleDelete(customer)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add customer form */}
      <div className="max-w-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Add a customer</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TextField label="Name" error={errors.name?.message} {...register('name')} />
          <TextField
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Temporary password"
            type="password"
            error={errors.password?.message}
            {...register('password')}
          />
          <p className="text-xs text-muted-foreground">
            The customer will be asked to choose a new password when they first sign in.
          </p>
          <Button type="submit" isLoading={addCustomer.isPending}>
            Add customer
          </Button>
        </form>
      </div>
    </div>
  );
}