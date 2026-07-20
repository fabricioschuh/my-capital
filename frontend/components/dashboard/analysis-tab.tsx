'use client';

import dynamic from 'next/dynamic';
import { PortfolioSummary } from '@/types';
import { formatCurrency, formatPercentage, getDifferenceColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const PortfolioPieChart = dynamic(
  () => import('./portfolio-pie-chart').then((m) => m.PortfolioPieChart),
  { ssr: false },
);

interface AnalysisTabProps {
  summary: PortfolioSummary;
}

/* ─── Allocation bar chart ─────────────────────────────────────────────────── */

interface AllocationChartProps {
  summary: PortfolioSummary;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function AllocationTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const atual = payload.find((p) => p.name === 'Atual')?.value ?? 0;
  const meta = payload.find((p) => p.name === 'Meta')?.value ?? 0;
  const diff = atual - meta;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-sm space-y-1 min-w-[160px]">
      <p className="font-semibold mb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Atual</span>
        <span className="font-medium tabular-nums">{formatPercentage(atual)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">Meta</span>
        <span className="font-medium tabular-nums">{formatPercentage(meta)}</span>
      </div>
      <div className="flex justify-between gap-4 border-t border-border/50 pt-1 mt-1">
        <span className="text-muted-foreground">Dif.</span>
        <span className={cn('font-semibold tabular-nums', diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : diff < 0 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground')}>
          {diff > 0 ? '+' : ''}{formatPercentage(diff)}
        </span>
      </div>
    </div>
  );
}

function AllocationChart({ summary }: AllocationChartProps) {
  const data = summary.categories
    .filter((c) => c.assets > 0 || c.targetPercentage > 0)
    .sort((a, b) => b.targetPercentage - a.targetPercentage)
    .map((c) => ({
      name: c.name.length > 18 ? c.name.slice(0, 16) + '…' : c.name,
      fullName: c.name,
      Atual: parseFloat(c.currentPercentage.toFixed(1)),
      Meta: parseFloat(c.targetPercentage.toFixed(1)),
      diff: c.difference,
    }));

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <h3 className="text-base font-semibold mb-4">Alocação atual vs meta</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              width={40}
            />
            <Tooltip content={<AllocationTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
            />
            <Bar dataKey="Atual" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={40}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.diff > 0 ? '#22c55e' : entry.diff < 0 ? '#ef4444' : '#6366f1'}
                  opacity={0.85}
                />
              ))}
            </Bar>
            <Bar dataKey="Meta" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={40} opacity={0.5} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Verde = acima da meta &nbsp;·&nbsp; Vermelho = abaixo da meta
      </p>
    </div>
  );
}

/* ─── Allocation table ─────────────────────────────────────────────────────── */

function AllocationTable({ summary }: { summary: PortfolioSummary }) {
  const rows = summary.categories
    .filter((c) => c.assets > 0 || c.targetPercentage > 0)
    .sort((a, b) => b.total - a.total);

  const totalTarget = rows.reduce((sum, c) => sum + c.targetPercentage, 0);

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="text-base font-semibold">Resumo por categoria</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-5 py-3 text-left font-medium">Categoria</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Atual</th>
              <th className="px-4 py-3 text-right font-medium">Meta</th>
              <th className="px-4 py-3 text-right font-medium">Dif.</th>
              <th className="px-5 py-3 text-right font-medium">A aportar</th>
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
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 text-sm font-semibold">
              <td className="px-5 py-3">Total</td>
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
      <AllocationChart summary={summary} />
      <AllocationTable summary={summary} />
    </div>
  );
}
