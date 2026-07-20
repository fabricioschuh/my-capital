import { apiClient } from './api-client';

export const watchlistService = {
  getTickers: async (): Promise<string[]> => {
    const { data } = await apiClient.get<{ tickers: string[] }>('/watchlist');
    return data.tickers;
  },

  saveTickers: async (tickers: string[]): Promise<void> => {
    await apiClient.put('/watchlist', { tickers });
  },
};
