import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioService, exchangeService } from '@/services/portfolio.service';
import { toast } from 'sonner';

export const PORTFOLIO_QUERY_KEY = ['portfolio', 'summary'];
export const EXCHANGE_RATES_QUERY_KEY = ['exchange-rates'];

export function usePortfolioSummary() {
  return useQuery({
    queryKey: PORTFOLIO_QUERY_KEY,
    queryFn: portfolioService.getSummary,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });
}

export function useExchangeRates() {
  return useQuery({
    queryKey: EXCHANGE_RATES_QUERY_KEY,
    queryFn: exchangeService.getRates,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useRefreshExchangeRates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exchangeService.refreshRates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXCHANGE_RATES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
      toast.success('Exchange rates refreshed');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to refresh exchange rates');
    },
  });
}
