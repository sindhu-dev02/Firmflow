import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCategories,
  useCreateCategory,
  useRenameCategory,
  useDeleteCategory,
} from '@/hooks/useCategories';
import { Plus, Tags } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import type { Category } from '@/types';
import { useConfirm } from '@/hooks/useConfirm';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export function CategoriesPage() {
  const confirm = useConfirm();
  const { data, isLoading, isError } = useCategories();
  const createCategory = useCreateCategory();
  const renameCategory = useRenameCategory();
  const deleteCategory = useDeleteCategory();

  // Which row is being renamed right now, and what is typed in the box
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '' },
  });

  const onSubmit = (values: CategoryFormValues) =>
    createCategory.mutate(values.name, {
      onSuccess: () => setFormOpen(false),
    });

  const openForm = () => {
    reset();
    setFormOpen(true);
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const saveEdit = (category: Category) => {
    const name = editName.trim();
    if (!name || name === category.name) {
      setEditingId(null);
      return;
    }
    renameCategory.mutate(
      { id: category.id, name },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const handleDelete = async (category: Category) => {
    const n = category.productCount;
    const ok = await confirm({
      title: `Delete “${category.name}”?`,
      message:
        n > 0
          ? `${n} ${n === 1 ? 'product uses' : 'products use'} this category. ${
              n === 1 ? 'It' : 'They'
            } will be left with no category.`
          : 'No products use this category.',
      confirmLabel: 'Delete category',
      tone: 'danger',
    });
    if (ok) deleteCategory.mutate(category.id);
  };

  if (isLoading) {
    return <PageSkeleton cols={3} />;
  }

  if (isError || !data) {
    return <ErrorState message="Could not load categories." />;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Category list */}
      <div>
        <PageHeader
          title="Categories"
          description={`${data.categories.length} ${data.categories.length === 1 ? 'category' : 'categories'} to group your products`}
          action={
            <Button type="button" onClick={openForm}>
              <Plus size={16} /> Add category
            </Button>
          }
        />

        {data.categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No categories yet"
            description="Group your products into categories, then pick one when you add a product."
            action={
              <Button type="button" onClick={openForm}><Plus size={16} /> Add category</Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Products
                  </th>
                  <th className="px-4 py-3 text-right text-[13px] font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.categories.map((category) => {
                  const isEditing = editingId === category.id;
                  return (
                    <tr key={category.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editName}
                            maxLength={100}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(category);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="w-full max-w-xs rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                        ) : (
                          category.name
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {category.productCount}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                isLoading={renameCategory.isPending}
                                onClick={() => saveEdit(category)}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(category)}
                              >
                                Rename
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                disabled={deleteCategory.isPending}
                                onClick={() => handleDelete(category)}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        size="sm"
        title="Add a category"
        description="Categories help you group products, like “Books” or “Electronics”."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="category-form" isLoading={createCategory.isPending}>
              Add category
            </Button>
          </>
        }
      >
        <form id="category-form"
          noValidate onSubmit={handleSubmit(onSubmit)}>
          <TextField label="Name" autoFocus error={errors.name?.message} {...register('name')} />
        </form>
      </Modal>
    </div>
  );
}