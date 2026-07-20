'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CategorySummary } from '@/types';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface PortfolioPieChartProps {
  categories: CategorySummary[];
  totalValue: number;
}

// Distinct palette that works on light and dark backgrounds
const COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#8b5cf6', // violet
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#e11d48', // rose
  '#a855f7', // purple
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; total: number; currentPercentage: number };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-sm">
      <p className="font-semibold mb-1">{item.name}</p>
      <p className="text-muted-foreground">
        {formatCurrency(item.total)} &middot; {formatPercentage(item.currentPercentage)}
      </p>
    </div>
  );
}

interface LegendItemProps {
  name: string;
  color: string;
  percentage: number;
  total: number;
}

function LegendItem({ name, color, percentage, total }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 truncate text-foreground">{name}</span>
      <span className="tabular-nums text-muted-foreground">{formatPercentage(percentage)}</span>
      <span className="tabular-nums font-medium w-28 text-right">{formatCurrency(total)}</span>
    </div>
  );
}

export function PortfolioPieChart({ categories, totalValue }: PortfolioPieChartProps) {
  const data = categories
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  if (data.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border border-border/60 bg-card p-5">
      <h3 className="text-base font-semibold mb-4">Composição da carteira</h3>
      <div className="flex flex-col lg:flex-row gap-6 items-center">

        {/* Pie */}
        <div className="w-full lg:w-64 shrink-0 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={entry.id} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2.5">
          {data.map((cat, i) => (
            <LegendItem
              key={cat.id}
              name={cat.name}
              color={COLORS[i % COLORS.length]}
              percentage={cat.currentPercentage}
              total={cat.total}
            />
          ))}
          {/* Total row */}
          <div className="border-t border-border/50 pt-2 mt-1 flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
