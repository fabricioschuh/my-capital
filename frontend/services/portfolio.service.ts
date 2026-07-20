import { apiClient } from './api-client';
import { PortfolioSummary, ExchangeRates } from '@/types';

export const portfolioService = {
  getSummary: async (): Promise<PortfolioSummary> => {
    const { data } = await apiClient.get<PortfolioSummary>('/portfolio/summary');
    return data;
  },
};

export const exchangeService = {
  getRates: async (): Promise<ExchangeRates> => {
    const { data } = await apiClient.get<ExchangeRates>('/exchange-rates');
    return data;
  },

  refreshRates: async (): Promise<ExchangeRates> => {
    const { data } = await apiClient.post<ExchangeRates>('/exchange-rates/refresh');
    return data;
  },
};
