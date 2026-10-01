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
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import type { Category } from '@/types';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export function CategoriesPage() {
  const { data, isLoading, isError } = useCategories();
  const createCategory = useCreateCategory();
  const renameCategory = useRenameCategory();
  const deleteCategory = useDeleteCategory();

  // Which row is being renamed right now, and what is typed in the box
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
    createCategory.mutate(values.name, { onSuccess: () => reset() });

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

  const handleDelete = (category: Category) => {
    const extra =
      category.productCount > 0
        ? ` ${category.productCount} ${category.productCount === 1 ? 'product uses' : 'products use'} it and will be left with no category.`
        : '';
    if (window.confirm(`Delete the category "${category.name}"?${extra}`)) {
      deleteCategory.mutate(category.id);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading categories…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-destructive">Could not load categories.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Category list */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <span className="text-sm text-muted-foreground">
            {data.categories.length} {data.categories.length === 1 ? 'category' : 'categories'}
          </span>
        </div>

        {data.categories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm font-medium text-foreground">No categories yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first category using the form below, then pick it when you create a
              product.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Products
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
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
                            className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-ring"
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

      {/* Add category form */}
      <div className="max-w-sm">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Add a category</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <TextField label="Name" error={errors.name?.message} {...register('name')} />
          <Button type="submit" isLoading={createCategory.isPending}>
            Add category
          </Button>
        </form>
      </div>
    </div>
  );
}