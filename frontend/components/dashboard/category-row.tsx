'use client';

import { useState, useEffect } from 'react';
import { CategorySummary, Asset } from '@/types';
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
  Pencil, Trash2, ArrowUp, ArrowDown,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TransactionDialog, EditAssetDialog } from '@/components/assets/transaction-dialog';
import { useAssets, useDeleteAsset } from '@/hooks/use-assets';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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

function detectFixedIncomeSubcategory(asset: Asset): FixedIncomeSubcategory {
  // Prefer explicit fiIndexer stored in DB
  if (asset.fiIndexer) {
    if (asset.fiIndexer === 'IPCA') return 'IPCA+';
    if (asset.fiIndexer === 'CDI') return 'CDI';
    if (asset.fiIndexer === 'Prefixado') return 'Pré-fixado';
  }
  // Fallback: parse from name
  const n = asset.name.toUpperCase();
  if (/\bIPCA\b/.test(n)) return 'IPCA+';
  if (/\bCDI\b/.test(n)) return 'CDI';
  if (/\bPRE[F]?\b|PREFIXADO|A\.A\.|% A\.A/.test(n)) return 'Pré-fixado';
  return 'Outros';
}

const SUBCATEGORY_ORDER: FixedIncomeSubcategory[] = ['CDI', 'IPCA+', 'Pré-fixado', 'Outros'];

type SortOrder = 'none' | 'asc' | 'desc';

function sortAssets(assets: Asset[], order: SortOrder): Asset[] {
  if (order === 'none') return assets;
  return [...assets].sort((a, b) => {
    const va = a.quantity * (a.marketPrice ?? a.unitPrice);
    const vb = b.quantity * (b.marketPrice ?? b.unitPrice);
    return order === 'asc' ? va - vb : vb - va;
  });
}

/* ─── Asset row ─────────────────────────────────────────────────────────────── */

function AssetRow({ asset, categorySlug }: { asset: Asset; categorySlug: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const { mutate: deleteAsset } = useDeleteAsset();
  const total = asset.quantity * (asset.marketPrice ?? asset.unitPrice);

  return (
    <>
      <div className="flex items-center justify-between py-3 px-4 hover:bg-muted/40 rounded-lg transition-colors group">
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
        <div className="shrink-0 ml-6 flex items-center gap-1">
          <p className="text-base font-bold tabular-nums">{formatCurrency(total, asset.currency)}</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
            title="Editar ativo"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                title="Remover ativo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover ativo</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover <span className="font-semibold">{asset.ticker ?? asset.name}</span>? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteAsset(asset.id)}
                >
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <EditAssetDialog
        asset={asset}
        categorySlug={categorySlug}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

export function CategoryRow({ category, isDragging = false, forceOpen }: CategoryRowProps) {
  const [open, setOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const { t } = useI18n();

  function cycleSortOrder() {
    setSortOrder((s) => s === 'desc' ? 'asc' : 'desc');
  }

  const SortIcon = sortOrder === 'asc' ? ArrowUp : ArrowDown;

  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);

  const isOpen = open;

  const { data: assets, isLoading } = useAssets(isOpen ? category.id : undefined);

  const { difference } = category;
  const hasAssets = category.assets > 0;

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
              {!hasAssets && (
                <p className="text-xs text-muted-foreground/50 text-right md:hidden">{t('cr.noAssets')}</p>
              )}
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
              {!isLoading && assets && assets.length > 1 && (
                <div className="flex justify-end px-1 pb-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cycleSortOrder(); }}
                    className="flex items-center gap-1 text-xs rounded px-2 py-1 transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <SortIcon className="h-3 w-3" />
                    Valor
                  </button>
                </div>
              )}
              {!isLoading && assets && assets.length > 0 && !['fixed-income', 'emergency-reserve', 'cash'].includes(category.slug) && (
                sortAssets(assets, sortOrder).map((asset) => (
                  <AssetRow key={asset.id} asset={asset} categorySlug={category.slug} />
                ))
              )}
              {!isLoading && assets && assets.length > 0 && ['fixed-income', 'emergency-reserve', 'cash'].includes(category.slug) && (
                SUBCATEGORY_ORDER.map((sub) => {
                  const grouped = sortAssets(assets.filter((a) => detectFixedIncomeSubcategory(a) === sub), sortOrder);
                  if (grouped.length === 0) return null;
                  const subTotal = grouped.reduce((sum, a) => sum + a.quantity * (a.marketPrice ?? a.unitPrice), 0);
                  return (
                    <div key={sub} className="mb-3">
                      <div className="px-1 pb-1.5 pt-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {sub}
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                          {formatCurrency(subTotal)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {grouped.map((asset) => (
                          <AssetRow key={asset.id} asset={asset} categorySlug={category.slug} />
                        ))}
                      </div>
                    </div>
                  );
                })
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
        initialMode="new"
      />
    </>
  );
}
