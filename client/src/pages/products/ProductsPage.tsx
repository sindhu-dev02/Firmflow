import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useProducts, useCreateProduct } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import {
  productsApi,
  type ProductPayload,
} from '@/api/products';
import { Plus, Package, SearchX } from 'lucide-react';
import { TextField } from '@/components/ui/TextField';
import { SelectField } from '@/components/ui/SelectField';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/lib/errors';
import { formatMoney } from '@/lib/format';
import type { Product } from '@/types';
import { useConfirm } from '@/hooks/useConfirm';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  // typed in rupees (like 499 or 499.50); we turn it into paise before saving
  price: z
    .number({ error: 'Enter a price' })
    .min(0, 'Price must be 0 or greater')
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use at most 2 decimal places'),
  stock: z
    .number({ error: 'Enter the stock' })
    .int('Stock must be a whole number')
    .min(0, 'Stock must be 0 or greater'),
  isActive: z.boolean(),
  categoryId: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function ProductsPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounce(searchText.trim(), 300);
  const PAGE_SIZE = 20;
  const { data, isLoading, isError, refetch } = useProducts({
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.categories ?? [];
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const createProduct = useCreateProduct();

  const updateProduct = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<ProductPayload>;
    }) => productsApi.update(id, payload),

    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not update product'));
    },

    onSuccess: () => {
      toast.success('Product updated');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),

    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not delete product'));
    },

    onSuccess: () => {
      toast.success('Product deleted');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      price: 0,
      stock: 0,
      isActive: true,
      categoryId: '',
    },
  });

  const emptyForm: ProductFormValues = {
    name: '',
    sku: '',
    description: '',
    price: 0,
    stock: 0,
    isActive: true,
    categoryId: '',
  };

  const onSubmit = (values: ProductFormValues) => {
    const price = Math.round(values.price * 100); // rupees -> paise

    if (editingProduct) {
      updateProduct.mutate(
        {
          id: editingProduct.id,
          payload: {
            name: values.name,
            sku: values.sku,
            description: values.description ?? '',
            price,
            stock: values.stock,
            isActive: values.isActive,
            categoryId: values.categoryId || null,
          },
        },
        {
          onSuccess: () => setFormOpen(false),
        },
      );
      return;
    }

    const payload: ProductPayload = {
      name: values.name,
      sku: values.sku,
      description: values.description || undefined,
      price,
      stock: values.stock,
      isActive: values.isActive,
      categoryId: values.categoryId || undefined,
    };

    createProduct.mutate(payload, {
      onSuccess: () => setFormOpen(false),
    });
  };

  // "Add product" button
  const openCreate = () => {
    setEditingProduct(null);
    reset(emptyForm);
    setFormOpen(true);
  };

  // "Edit" button: open the same window with this product filled in
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    reset({
      name: product.name,
      sku: product.sku,
      description: product.description ?? '',
      price: product.price / 100,
      stock: product.stock,
      isActive: product.isActive,
      categoryId: product.categoryId ?? '',
    });
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);

  const handleDelete = async (product: Product) => {
    const ok = await confirm({
      title: `Delete “${product.name}”?`,
      message: 'This removes the product for good. It cannot be undone.',
      confirmLabel: 'Delete product',
      tone: 'danger',
    });
    if (ok) deleteProduct.mutate(product.id);
  };

  // Changing the category from the table asks first
  const handleCategoryChange = async (product: Product, newCategoryId: string) => {
    const oldName = (product.categoryId && categoryNames.get(product.categoryId)) || 'No category';
    const newName = (newCategoryId && categoryNames.get(newCategoryId)) || 'No category';
    if (oldName === newName) return;

    const ok = await confirm({
      title: 'Change category?',
      message: (
        <>
          Move <strong className="text-foreground">{product.name}</strong> from{' '}
          <strong className="text-foreground">{oldName}</strong> to{' '}
          <strong className="text-foreground">{newName}</strong>?
        </>
      ),
      confirmLabel: 'Change category',
    });
    if (!ok) return;

    updateProduct.mutate({ id: product.id, payload: { categoryId: newCategoryId || null } });
  };

  if (isLoading) return <PageSkeleton cols={6} />;

  if (isError || !data) {
    return <ErrorState message="Could not load products." onRetry={() => refetch()} />;
  }

  const total = data.pagination.total;
  const isSearching = search.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Product list */}
      <div>
        <PageHeader
          title="Products"
          description={
            isSearching
              ? `${total} ${total === 1 ? 'match' : 'matches'} for “${search}”`
              : `${total} ${total === 1 ? 'product' : 'products'} in your catalog`
          }
          action={
            <Button type="button" onClick={openCreate}>
              <Plus size={16} /> Add product
            </Button>
          }
        />

        {(total > 0 || isSearching || searchText) && (
          <div className="mb-4">
            <SearchInput
              label="Search products"
              placeholder="Search name or SKU"
              value={searchText}
              onChange={(v) => {
                setSearchText(v);
                setPage(1);
              }}
            />
          </div>
        )}

        {data.products.length === 0 ? (
          isSearching ? (
            <EmptyState
              icon={SearchX}
              title="No products match your search"
              description="Check the spelling, or try a shorter name or SKU."
              action={
                <Button type="button" variant="outline" onClick={() => setSearchText('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product so you can start taking orders."
              action={
                <Button type="button" onClick={openCreate}>
                  <Plus size={16} /> Add product
                </Button>
              }
            />
          )
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Name
                  </th>

                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    SKU
                  </th>

                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Category
                  </th>

                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Price
                  </th>

                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Stock
                  </th>

                  <th className="px-4 py-3 text-left text-[13px] font-medium text-muted-foreground">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right text-[13px] font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {data.products.map((product) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3 text-sm text-foreground">
                        {product.name}
                      </td>

                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {product.sku}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <select
                          aria-label={`Category for ${product.name}`}
                          className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                          value={
                            product.categoryId && categoryNames.has(product.categoryId)
                              ? product.categoryId
                              : ''
                          }
                          disabled={updateProduct.isPending}
                          onChange={(e) => handleCategoryChange(product, e.target.value)}
                        >
                          <option value="">No category</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3 text-sm text-foreground">
                        {formatMoney(product.price, 'INR')}
                      </td>

                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {product.stock}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <span
                          className={
                            product.isActive
                              ? 'text-success'
                              : 'text-muted-foreground'
                          }
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                            disabled={
                              updateProduct.isPending ||
                              deleteProduct.isPending
                            }
                          >
                            Edit
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDelete(product)}
                            disabled={
                              updateProduct.isPending ||
                              deleteProduct.isPending
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={data.pagination.page}
          pages={data.pagination.pages}
          total={total}
          limit={data.pagination.limit}
          onPageChange={setPage}
          noun="products"
        />
      </div>

      {/* Add / edit product window */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        size="lg"
        title={editingProduct ? 'Edit product' : 'Add a product'}
        description={
          editingProduct
            ? `Change the details of “${editingProduct.name}”.`
            : 'Fill in the details. Price is in rupees.'
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="product-form"
              isLoading={editingProduct ? updateProduct.isPending : createProduct.isPending}
            >
              {editingProduct ? 'Save changes' : 'Add product'}
            </Button>
          </>
        }
      >
        <form
          id="product-form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <TextField label="Name" autoFocus error={errors.name?.message} {...register('name')} />
          <TextField label="SKU" error={errors.sku?.message} {...register('sku')} />

          <div className="sm:col-span-2">
            <TextField
              label="Description (optional)"
              error={errors.description?.message}
              {...register('description')}
            />
          </div>

          <TextField
            label="Price (₹)"
            type="number"
            min="0"
            step="0.01"
            error={errors.price?.message}
            {...register('price', { valueAsNumber: true })}
          />
          <TextField
            label="Stock"
            type="number"
            min="0"
            step="1"
            error={errors.stock?.message}
            {...register('stock', { valueAsNumber: true })}
          />

          <SelectField label="Category (optional)" {...register('categoryId')}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>

          <label className="flex cursor-pointer items-center gap-3 self-end rounded-md border border-border px-3 py-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[hsl(var(--primary))]"
              {...register('isActive')}
            />
            <span>
              Active
              <span className="block text-xs text-muted-foreground">Can be added to orders</span>
            </span>
          </label>
        </form>
      </Modal>
    </div>
  );
}