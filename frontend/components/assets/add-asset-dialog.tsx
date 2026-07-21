'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateAsset } from '@/hooks/use-assets';
import { useCategories } from '@/hooks/use-categories';
import { useI18n } from '@/lib/i18n/i18n-context';
import { PlusCircle, Loader2 } from 'lucide-react';

const createAssetSchema = z.object({
  categoryId: z.string().uuid('Select a valid category'),
  name: z.string().min(1, 'Name is required').max(100),
  ticker: z.string().optional(),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unitPrice: z.coerce.number().positive('Unit price must be positive'),
  currency: z.enum(['BRL', 'USD', 'EUR']),
  broker: z.string().optional(),
  notes: z.string().optional(),
});

type CreateAssetFormValues = z.infer<typeof createAssetSchema>;

export function AddAssetDialog({ categoryId: defaultCategoryId }: { categoryId?: string } = {}) {
  const [open, setOpen] = useState(false);
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { mutate: createAsset, isPending } = useCreateAsset();
  const { t } = useI18n();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateAssetFormValues>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      currency: 'BRL',
      categoryId: defaultCategoryId,
      quantity: undefined,
      unitPrice: undefined,
    },
  });

  const currency = watch('currency');
  const categoryId = watch('categoryId');

  const onSubmit = (data: CreateAssetFormValues) => {
    createAsset(
      {
        ...data,
        ticker: data.ticker || undefined,
        broker: data.broker || undefined,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          reset();
          setOpen(false);
        },
      },
    );
  };

  const handleClose = () => {
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => (val ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('aa.trigger')}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('aa.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="categoryId">{t('aa.category')}</Label>
            <Select
              value={categoryId}
              onValueChange={(val) => setValue('categoryId', val, { shouldValidate: true })}
              disabled={loadingCategories}
            >
              <SelectTrigger id="categoryId">
                <SelectValue placeholder={t('aa.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-xs text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">{t('aa.name')}</Label>
            <Input
              id="name"
              placeholder="e.g. Tesouro IPCA+ 2035"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Ticker */}
          <div className="space-y-1.5">
            <Label htmlFor="ticker">{t('aa.ticker')}</Label>
            <Input
              id="ticker"
              placeholder="e.g. ITUB3, AAPL"
              {...register('ticker')}
            />
          </div>

          {/* Quantity and Unit Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">{t('aa.quantity')}</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0"
                placeholder="100"
                {...register('quantity')}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unitPrice">{t('aa.unitPrice')}</Label>
              <Input
                id="unitPrice"
                type="number"
                step="any"
                min="0"
                placeholder="36.50"
                {...register('unitPrice')}
              />
              {errors.unitPrice && (
                <p className="text-xs text-destructive">{errors.unitPrice.message}</p>
              )}
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-1.5">
            <Label>{t('aa.currency')}</Label>
            <Select
              value={currency}
              onValueChange={(val) =>
                setValue('currency', val as 'BRL' | 'USD' | 'EUR', { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">{t('aa.currencyBRL')}</SelectItem>
                <SelectItem value="USD">{t('aa.currencyUSD')}</SelectItem>
                <SelectItem value="EUR">{t('aa.currencyEUR')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Broker */}
          <div className="space-y-1.5">
            <Label htmlFor="broker">{t('aa.broker')}</Label>
            <Input
              id="broker"
              placeholder="e.g. XP Investimentos"
              {...register('broker')}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">{t('aa.notes')}</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              rows={2}
              {...register('notes')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('aa.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('aa.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
