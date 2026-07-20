import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesService } from '@/services/categories.service';
import { toast } from 'sonner';
import { PORTFOLIO_QUERY_KEY } from './use-portfolio';

export const CATEGORIES_QUERY_KEY = ['categories'];

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: categoriesService.getAll,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, targetPercentage }: { id: string; targetPercentage: number }) =>
      categoriesService.update(id, { targetPercentage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
      toast.success('Meta atualizada');
    },
    onError: () => {
      toast.error('Falha ao atualizar meta');
    },
  });
}
