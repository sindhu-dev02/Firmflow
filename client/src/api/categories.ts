import { apiClient } from '@/api/axios';
import type { Category } from '@/types';

export const categoriesApi = {
  list: async () => {
    const { data } = await apiClient.get<{ categories: Category[] }>('/categories');
    return data;
  },
  create: async (name: string) => {
    const { data } = await apiClient.post<{ category: Category }>('/categories', { name });
    return data;
  },
  rename: async (id: string, name: string) => {
    const { data } = await apiClient.patch<{ category: Category }>(`/categories/${id}`, { name });
    return data;
  },
  remove: async (id: string) => {
    await apiClient.delete(`/categories/${id}`);
  },
};