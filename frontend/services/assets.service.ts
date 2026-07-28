import { apiClient } from './api-client';
import { Asset, CreateAssetForm, UpdateAssetForm, TransactionForm, FundamentalsResult } from '@/types';

export const assetsService = {
  getAll: async (categoryId?: string): Promise<Asset[]> => {
    const params = categoryId ? { categoryId } : {};
    const { data } = await apiClient.get<Asset[]>('/assets', { params });
    return data;
  },

  getById: async (id: string): Promise<Asset> => {
    const { data } = await apiClient.get<Asset>(`/assets/${id}`);
    return data;
  },

  create: async (dto: CreateAssetForm): Promise<Asset> => {
    const { data } = await apiClient.post<Asset>('/assets', dto);
    return data;
  },

  update: async (id: string, dto: UpdateAssetForm): Promise<Asset> => {
    const { data } = await apiClient.put<Asset>(`/assets/${id}`, dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/assets/${id}`);
  },

  transact: async (
    id: string,
    dto: Omit<TransactionForm, 'assetId'>,
  ): Promise<Asset> => {
    const { data } = await apiClient.patch<Asset>(`/assets/${id}/transactions`, dto);
    return data;
  },

  refreshPrices: async (): Promise<{ updated: number; failed: number; skipped: number }> => {
    const { data } = await apiClient.post('/assets/refresh-prices');
    return data;
  },

  getFundamentals: async (ticker: string): Promise<FundamentalsResult> => {
    const { data } = await apiClient.get<FundamentalsResult>(`/assets/fundamentals/${encodeURIComponent(ticker)}`);
    return data;
  },

  importInvestidor10: async (file: File): Promise<{ inserted: number; updated: number; skipped: number; errors: string[] }> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/import/investidor10', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
