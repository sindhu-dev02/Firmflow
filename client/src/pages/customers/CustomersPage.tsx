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
import { Plus, Users, SearchX } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EditMemberModal } from '@/components/team/EditMemberModal';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { formatMoney, formatDateTime } from '@/lib/format';
import type { Customer } from '@/types';
import { useConfirm } from '@/hooks/useConfirm';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export function CustomersPage() {
  const confirm = useConfirm();
  const { data, isLoading, isError } = useCustomers();
  const addCustomer = useAddCustomer();
  const toggleCustomer = useToggleCustomer();
  const deleteCustomer = useDeleteCustomer();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === 'org_owner';

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

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
    addCustomer.mutate(values, { onSuccess: () => setFormOpen(false) });

  const openForm = () => {
    reset();
    setFormOpen(true);
  };

  const handleDelete = async (customer: Customer) => {
    const ok = await confirm({
      title: `Delete ${customer.name}?`,
      message: 'This removes the customer for good. It cannot be undone.',
      confirmLabel: 'Delete customer',
      tone: 'danger',
    });
    if (ok) deleteCustomer.mutate(customer.id);
  };

  const handleToggle = async (customer: Customer) => {
    if (customer.isActive) {
      const ok = await confirm({
        title: `Deactivate ${customer.name}?`,
        message: 'They will be signed out and cannot log in until you reactivate them.',
        confirmLabel: 'Deactivate',
      });
      if (!ok) return;
    }
    toggleCustomer.mutate({ id: customer.id, activate: !customer.isActive });
  };

  if (isLoading) {
    return <PageSkeleton cols={5} />;
  }

  if (isError || !data) {
    return <ErrorState message="Could not load customers." />;
  }

  const term = search.trim().toLowerCase();
  const visible = term
    ? data.customers.filter(
        (c) => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term),
      )
    : data.customers;

  const headerClass =
    'px-4 py-3 text-left text-[13px] font-medium text-muted-foreground';

  return (
    <div className="flex flex-col gap-8">
      {/* Customer list */}
      <div>
        <PageHeader
          title="Customers"
          description={`${data.customers.length} ${data.customers.length === 1 ? 'customer' : 'customers'}`}
          extra={
            <input
              type="search"
              aria-label="Search customers"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          }
          action={
            <Button type="button" onClick={openForm}>
              <Plus size={16} /> Add customer
            </Button>
          }
        />

        {data.customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add the people you sell to, so you can create orders for them."
            action={
              <Button type="button" onClick={openForm}><Plus size={16} /> Add customer</Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No customers match your search"
            description={`Nothing found for “${search}”. Try a different name or email.`}
            action={
              <Button type="button" variant="outline" onClick={() => setSearch('')}>
                Clear search
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className={headerClass}>Name</th>
                  <th className={headerClass}>Email</th>
                  <th className={headerClass}>Orders</th>
                  <th className={headerClass}>Spent</th>
                  <th className={headerClass}>Last order</th>
                  <th className={headerClass}>Status</th>
                  <th className="px-4 py-3 text-right text-[13px] font-medium text-muted-foreground">
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
                        className={customer.isActive ? 'text-success' : 'text-muted-foreground'}
                      >
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(customer)}
                        >
                          Edit
                        </Button>
                        {isOwner && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={toggleCustomer.isPending}
                            onClick={() => handleToggle(customer)}
                          >
                            {customer.isActive ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        )}
                        {isOwner && !customer.isActive && customer.orderCount === 0 && (
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditMemberModal member={editing} onClose={() => setEditing(null)} />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add a customer"
        description="They will be asked to choose a new password when they first sign in."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="customer-form" isLoading={addCustomer.isPending}>
              Add customer
            </Button>
          </>
        }
      >
        <form id="customer-form"
          noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" autoFocus error={errors.name?.message} {...register('name')} />
          <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <div className="sm:col-span-2">
            <TextField
              label="Temporary password"
              type="password"
              error={errors.password?.message}
              {...register('password')}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}