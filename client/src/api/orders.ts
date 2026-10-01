import { apiClient } from '@/api/axios';
import type { Order, OrdersResponse, OrderStatus } from '@/types';

export interface ListOrdersParams {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export interface CreateOrderPayload {
  customerId?: string;
  items: { productId: string; quantity: number }[];
}

export const ordersApi = {
  list: async (params: ListOrdersParams = {}) => {
    const { data } = await apiClient.get<OrdersResponse>('/orders', { params });
    return data;
  },
  create: async (payload: CreateOrderPayload) => {
    const { data } = await apiClient.post<{ order: Order }>('/orders', payload);
    return data;
  },
  updateStatus: async (id: string, status: OrderStatus) => {
    const { data } = await apiClient.patch<{ order: Order }>(`/orders/${id}/status`, { status });
    return data;
  },
};