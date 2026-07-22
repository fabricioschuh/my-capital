'use client';

import { useState, useEffect } from 'react';
import { CategorySummary } from '@/types';
import {
  formatCurrency,
  formatPercentage,
  formatDifference,
  getDifferenceColor,
} from '@/lib/utils';
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, Plus,
  ShieldCheck, Banknote, BarChart3, Globe, Landmark, CandlestickChart,
  Globe2, Building2, Bitcoin, Building, GripVertical, PieChart, AreaChart,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TransactionDialog } from '@/components/assets/transaction-dialog';
import { useAssets } from '@/hooks/use-assets';
import { Skeleton } from '@/components/ui/skeleton';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useI18n } from '@/lib/i18n/i18n-context';

interface CategoryRowProps {
  category: CategorySummary;
  isDragging?: boolean;
  forceOpen?: boolean;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'emergency-reserve':          ShieldCheck,
  'cash':                       Banknote,
  'fixed-income':               BarChart3,
  'fixed-income-international': Globe,
  'private-pension':            Landmark,
  'brazilian-stocks':           CandlestickChart,
  'international-stocks':       Globe2,
  'sap-stocks':                 Building2,
  'cryptocurrencies':           Bitcoin,
  'real-estate':                Building,
  'international-etfs':         PieChart,
  'brazilian-etfs':             AreaChart,
};

/* ─── Fixed-income subcategory detection ───────────────────────────────────── */

type FixedIncomeSubcategory = 'CDI' | 'IPCA+' | 'Pré-fixado' | 'Outros';

function detectFixedIncomeSubcategory(name: string): FixedIncomeSubcategory {
  const n = name.toUpperCase();
  if (/\bIPCA\b/.test(n)) return 'IPCA+';
  if (/\bCDI\b/.test(n)) return 'CDI';
  if (/\bPRE[F]?\b|PREFIXADO|A\.A\.|% A\.A/.test(n)) return 'Pré-fixado';
  return 'Outros';
}

const SUBCATEGORY_ORDER: FixedIncomeSubcategory[] = ['CDI', 'IPCA+', 'Pré-fixado', 'Outros'];

function AssetRow({ asset }: {
  asset: { id: string; name: string; ticker?: string; quantity: number; unitPrice: number; marketPrice?: number; marketPriceUpdatedAt?: string; currency: string }
}) {
  const { t, locale } = useI18n();
  const effectivePrice = asset.marketPrice ?? asset.unitPrice;
  const total = asset.quantity * effectivePrice;
  const hasMarketPrice = asset.marketPrice != null;
  const priceChange = hasMarketPrice
    ? ((asset.marketPrice! - asset.unitPrice) / asset.unitPrice) * 100
    : null;

  const numLocale = locale === 'pt-BR' ? 'pt-BR' : 'en-US';

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-muted/40 rounded-lg transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold uppercase">
          {(asset.ticker ?? asset.name).slice(0, 3)}
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold leading-tight truncate">
            {asset.ticker ?? asset.name}
          </p>
          {asset.ticker && (
            <p className="text-sm text-muted-foreground truncate">{asset.name}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-8 shrink-0 ml-6 text-right">
        <div className="hidden sm:block">
          <p className="text-xs text-muted-foreground mb-0.5">{t('cr.quantity')}</p>
          <p className="text-sm font-medium tabular-nums">
            {asset.quantity.toLocaleString(numLocale, { maximumFractionDigits: 8 })}
          </p>
        </div>
        <div className="hidden sm:block">
          <p className="text-xs text-muted-foreground mb-0.5">
            {hasMarketPrice ? t('cr.currentPrice') : t('cr.avgPrice')}
          </p>
          <p className="text-sm font-medium tabular-nums">
            {formatCurrency(effectivePrice, asset.currency)}
          </p>
          {priceChange !== null && (
            <p className={cn('text-xs tabular-nums', priceChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400')}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t('cr.total')}</p>
          <p className="text-base font-bold tabular-nums">{formatCurrency(total, asset.currency)}</p>
        </div>
      </div>
    </div>
  );
}

export function CategoryRow({ category, isDragging = false, forceOpen }: CategoryRowProps) {
  const [open, setOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);

  const isOpen = open;

  const { data: assets, isLoading } = useAssets(isOpen ? category.id : undefined);

  const { difference } = category;
  const hasAssets = category.assets > 0;
  const DifferenceIcon = difference > 0 ? TrendingUp : difference < 0 ? TrendingDown : Minus;
  const CategoryIcon = CATEGORY_ICONS[category.slug] ?? Landmark;

  const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({
    id: category.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'rounded-xl border border-border/60 bg-card overflow-hidden transition-all duration-200 hover:border-primary/20 hover:shadow-sm',
          isDragging && 'opacity-40',
          isSorting && 'z-10',
        )}
      >
        {/* Accent bar */}
        <div className="h-0.5 bg-primary/30" />

        {/* Header row */}
        <div className="flex items-center gap-1 pr-4">
          {/* Drag handle */}
          <button
            type="button"
            className="flex-none px-2 py-5 text-muted-foreground/30 hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing touch-none transition-colors"
            {...attributes}
            {...listeners}
            tabIndex={-1}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Expand button */}
          <button
            type="button"
            className="flex flex-1 items-center gap-4 py-5 text-left min-w-0"
            onClick={() => setOpen((v) => !v)}
          >
            {/* Icon + name */}
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <CategoryIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xl leading-tight truncate">{category.name}</p>
                <p className="text-sm text-muted-foreground">
                  {category.assets} {category.assets === 1 ? t('cr.asset') : t('cr.assets')}
                </p>
              </div>
            </div>

            {/* Allocation columns */}
            <div className="hidden md:flex items-center gap-8 shrink-0 text-sm">
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">{t('cr.current')}</p>
                <p className="font-medium tabular-nums">
                  {hasAssets ? formatPercentage(category.currentPercentage) : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">{t('cr.target')}</p>
                <p className="font-medium tabular-nums">
                  {formatPercentage(category.targetPercentage)}
                </p>
              </div>
              <div className="w-16 text-right">
                <p className="text-xs text-muted-foreground mb-0.5">{t('cr.diff')}</p>
                <p className={cn('font-semibold tabular-nums', hasAssets ? getDifferenceColor(difference) : 'text-muted-foreground')}>
                  {hasAssets ? formatDifference(difference) : '—'}
                </p>
              </div>
            </div>

            {/* Total + badge */}
            <div className="shrink-0 text-right w-32">
              <p className="font-bold text-lg tabular-nums">
                {hasAssets ? formatCurrency(category.total) : formatCurrency(0)}
              </p>
              <div className="h-5 flex items-center justify-end">
                {hasAssets ? (
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                    difference > 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : difference < 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-muted text-muted-foreground',
                  )}>
                    <DifferenceIcon className="h-3 w-3" />
                    {formatDifference(difference)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/50">{t('cr.noAssets')}</span>
                )}
              </div>
            </div>

            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
            />
          </button>
        </div>

        {/* Expanded section */}
        {isOpen && (
          <div className="border-t border-border/50">
            {/* Mobile allocation info */}
            <div className="md:hidden px-4 pt-3 pb-2 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('cr.current')} {hasAssets ? formatPercentage(category.currentPercentage) : '—'}</span>
                <span>{t('cr.target')} {formatPercentage(category.targetPercentage)}</span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="absolute h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(category.currentPercentage, 100)}%` }}
                />
                <div
                  className="absolute h-full w-0.5 bg-muted-foreground/60"
                  style={{ left: `${Math.min(category.targetPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Asset list */}
            <div className="px-3 py-3 space-y-1">
              {isLoading && (
                <>
                  <Skeleton className="h-14 w-full rounded-lg" />
                  <Skeleton className="h-14 w-full rounded-lg" />
                </>
              )}
              {!isLoading && assets?.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t('cr.empty')}
                </p>
              )}
              {!isLoading && assets && assets.length > 0 && category.slug === 'fixed-income' ? (
                SUBCATEGORY_ORDER.map((sub) => {
                  const grouped = assets.filter((a) => detectFixedIncomeSubcategory(a.name) === sub);
                  if (grouped.length === 0) return null;
                  return (
                    <div key={sub} className="mb-3">
                      <div className="px-1 pb-1.5 pt-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {sub}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {grouped.map((asset) => (
                          <AssetRow key={asset.id} asset={asset} />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                assets?.map((asset) => (
                  <AssetRow key={asset.id} asset={asset} />
                ))
              )}
            </div>

            {/* Action button */}
            <div className="px-5 pb-4 pt-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => setTransactionOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('cr.addAsset')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <TransactionDialog
        categoryId={category.id}
        categoryName={category.name}
        categorySlug={category.slug}
        open={transactionOpen}
        onOpenChange={setTransactionOpen}
      />
    </>
  );
}
