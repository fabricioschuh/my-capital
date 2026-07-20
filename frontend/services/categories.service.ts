import { apiClient } from './api-client';
import { Category } from '@/types';

export const categoriesService = {
  getAll: async (): Promise<Category[]> => {
    const { data } = await apiClient.get<Category[]>('/categories');
    return data;
  },

  getById: async (id: string): Promise<Category> => {
    const { data } = await apiClient.get<Category>(`/categories/${id}`);
    return data;
  },

  create: async (dto: { name: string; targetPercentage: number; description?: string; order?: number }): Promise<Category> => {
    const { data } = await apiClient.post<Category>('/categories', dto);
    return data;
  },

  update: async (id: string, dto: Partial<Category>): Promise<Category> => {
    const { data } = await apiClient.put<Category>(`/categories/${id}`, dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};
