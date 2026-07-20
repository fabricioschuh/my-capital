import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsService } from '@/services/assets.service';
import { CreateAssetForm, UpdateAssetForm, TransactionForm } from '@/types';
import { toast } from 'sonner';
import { PORTFOLIO_QUERY_KEY } from './use-portfolio';

export const ASSETS_QUERY_KEY = ['assets'];

export function useAssets(categoryId?: string) {
  return useQuery({
    queryKey: categoryId ? [...ASSETS_QUERY_KEY, categoryId] : ASSETS_QUERY_KEY,
    queryFn: () => assetsService.getAll(categoryId),
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAssetForm) => assetsService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
      toast.success('Asset created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to create asset');
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAssetForm }) =>
      assetsService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
      toast.success('Asset updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to update asset');
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
      toast.success('Asset deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Failed to delete asset');
    },
  });
}

export function useRefreshPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => assetsService.refreshPrices(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
      toast.success(
        `Cotações atualizadas: ${result.updated} ativo${result.updated !== 1 ? 's' : ''}${result.failed > 0 ? `, ${result.failed} sem cotação` : ''}`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Falha ao atualizar cotações');
    },
  });
}

export function useTransactAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Omit<TransactionForm, 'assetId'> }) =>
      assetsService.transact(id, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
      toast.success(variables.dto.type === 'BUY' ? 'Compra registrada' : 'Venda registrada');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Transaction failed');
    },
  });
}

export function useFundamentals(ticker: string | null) {
  return useQuery({
    queryKey: ['fundamentals', ticker],
    queryFn: () => assetsService.getFundamentals(ticker!),
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 1,
  });
}
