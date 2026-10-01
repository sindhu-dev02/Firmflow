import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ordersApi, type ListOrdersParams, type CreateOrderPayload } from '@/api/orders';
import { getErrorMessage } from '@/lib/errors';
import type { OrderStatus } from '@/types';

export function useOrders(params: ListOrdersParams = {}) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.list(params),
  });
}

// An order changes product stock, and the dashboard shows orders and stock,
// so after any order change we refresh all three.
function refreshAfterOrderChange(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['orders'] });
  queryClient.invalidateQueries({ queryKey: ['products'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => ordersApi.create(payload),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not create order')),
    onSuccess: () => toast.success('Order created'),
    onSettled: () => refreshAfterOrderChange(queryClient),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.updateStatus(id, status),
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update order')),
    onSuccess: () => toast.success('Order updated'),
    onSettled: () => refreshAfterOrderChange(queryClient),
  });
}