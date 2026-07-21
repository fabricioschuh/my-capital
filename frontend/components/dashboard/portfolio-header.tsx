'use client';

import { PortfolioSummary } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRefreshExchangeRates } from '@/hooks/use-portfolio';
import { useRefreshPrices } from '@/hooks/use-assets';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/i18n-context';

interface PortfolioHeaderProps {
  summary: PortfolioSummary;
}

export function PortfolioHeader({ summary }: PortfolioHeaderProps) {
  const { mutate: refreshRates, isPending: refreshingRates } = useRefreshExchangeRates();
  const { mutate: refreshPrices, isPending: refreshingPrices } = useRefreshPrices();
  const { locale, t } = useI18n();

  const isPending = refreshingRates || refreshingPrices;

  const { currencyBreakdown: cb, exchangeRates } = summary;
  const hasUSD = cb?.totalUSD > 0;
  const hasEUR = cb?.totalEUR > 0;

  const dateLocale = locale === 'pt-BR' ? 'pt-BR' : 'en-US';

  return (
    <div className="mb-8 space-y-4">
      {/* Total value hero */}
      <div>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
          {t('ph.total')}
        </p>
        <h2 className="mt-1 text-4xl font-bold tracking-tight text-foreground">
          {formatCurrency(summary.totalValue)}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('ph.calculatedAt', { date: new Date(summary.calculatedAt).toLocaleString(dateLocale) })}
        </p>
      </div>

      {/* Currency breakdown */}
      {cb && (hasUSD || hasEUR) && (
        <div className="flex flex-wrap gap-2">
          {cb.totalBRL > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground">BRL</span>
              <span className="font-semibold tabular-nums">{formatCurrency(cb.totalBRL, 'BRL')}</span>
            </div>
          )}
          {hasUSD && (
            <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground">USD</span>
              <span className="font-semibold tabular-nums">{formatCurrency(cb.totalUSD, 'USD')}</span>
              <span className="text-xs text-muted-foreground">
                ≈ {formatCurrency(cb.totalUSD * exchangeRates.USD)}
              </span>
            </div>
          )}
          {hasEUR && (
            <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm">
              <span className="text-xs font-medium text-muted-foreground">EUR</span>
              <span className="font-semibold tabular-nums">{formatCurrency(cb.totalEUR, 'EUR')}</span>
              <span className="text-xs text-muted-foreground">
                ≈ {formatCurrency(cb.totalEUR * exchangeRates.EUR)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Exchange rates + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          <span className="font-medium text-muted-foreground">USD</span>
          <span className="font-bold">{formatCurrency(summary.exchangeRates.USD)}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          <span className="font-medium text-muted-foreground">EUR</span>
          <span className="font-bold">{formatCurrency(summary.exchangeRates.EUR)}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
          {t('ph.updatedAt')} {new Date(summary.exchangeRates.updatedAt).toLocaleTimeString(dateLocale)}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshPrices()}
          disabled={isPending}
        >
          <TrendingUp className={cn('mr-2 h-4 w-4', refreshingPrices && 'animate-pulse')} />
          {t('ph.refreshPrices')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refreshRates()}
          disabled={isPending}
          className="text-muted-foreground"
        >
          <RefreshCw className={cn('mr-2 h-4 w-4', refreshingRates && 'animate-spin')} />
          {t('ph.refreshRates')}
        </Button>
      </div>
    </div>
  );
}
