'use client';

import dynamic from 'next/dynamic';
import { PortfolioSummary } from '@/types';
import { formatCurrency, formatPercentage, getDifferenceColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18n-context';

const PortfolioPieChart = dynamic(
  () => import('./portfolio-pie-chart').then((m) => m.PortfolioPieChart),
  { ssr: false },
);

interface AnalysisTabProps {
  summary: PortfolioSummary;
}

/* ─── Allocation table ─────────────────────────────────────────────────────── */

function AllocationTable({ summary }: { summary: PortfolioSummary }) {
  const { t } = useI18n();
  const rows = summary.categories
    .filter((c) => c.assets > 0 || c.targetPercentage > 0)
    .sort((a, b) => b.total - a.total);

  const totalTarget = rows.reduce((sum, c) => sum + c.targetPercentage, 0);

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="text-base font-semibold">{t('at.tableTitle')}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-5 py-3 text-left font-medium">{t('at.category')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('at.total')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('cr.current')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('cr.target')}</th>
              <th className="px-4 py-3 text-right font-medium">{t('cr.diff')}</th>
              <th className="px-5 py-3 text-right font-medium">{t('at.toInvest')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cat) => {
              const DiffIcon = cat.difference > 0 ? TrendingUp : cat.difference < 0 ? TrendingDown : Minus;
              // How much to invest to reach target (if below)
              const toInvest = cat.difference < 0
                ? (cat.targetPercentage / 100) * summary.totalValue - cat.total
                : 0;
              return (
                <tr key={cat.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(cat.total)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {cat.assets > 0 ? formatPercentage(cat.currentPercentage) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPercentage(cat.targetPercentage)}</td>
                  <td className={cn('px-4 py-3 text-right tabular-nums font-semibold', cat.assets > 0 ? getDifferenceColor(cat.difference) : 'text-muted-foreground')}>
                    {cat.assets > 0 ? (
                      <span className="inline-flex items-center justify-end gap-1">
                        <DiffIcon className="h-3 w-3" />
                        {cat.difference > 0 ? '+' : ''}{formatPercentage(cat.difference)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                    {toInvest > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        +{formatCurrency(toInvest)}
                      </span>
                    ) : cat.difference === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 text-sm font-semibold">
              <td className="px-5 py-3">{t('at.total')}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(summary.totalValue)}</td>
              <td className="px-4 py-3 text-right tabular-nums">100%</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatPercentage(totalTarget)}</td>
              <td className="px-4 py-3" />
              <td className="px-5 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────────────────── */

export function AnalysisTab({ summary }: AnalysisTabProps) {
  return (
    <div className="space-y-6">
      <PortfolioPieChart categories={summary.categories} totalValue={summary.totalValue} />
      <AllocationTable summary={summary} />
    </div>
  );
}
