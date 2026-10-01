import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { categoriesApi } from '@/api/categories';
import { getErrorMessage } from '@/lib/errors';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => categoriesApi.create(name),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not create category')),
    onSuccess: () => toast.success('Category created'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useRenameCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => categoriesApi.rename(id, name),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not rename category')),
    onSuccess: () => toast.success('Category renamed'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete category')),
    onSuccess: () => toast.success('Category deleted'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      // products that used this category lose it, so refresh them too
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}