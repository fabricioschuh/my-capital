'use client';

import { useState } from 'react';
import { CategorySummary } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatCurrency,
  formatPercentage,
  formatDifference,
  getDifferenceColor,
  getDifferenceBadgeClass,
} from '@/lib/utils';
import { Briefcase, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TransactionDialog } from '@/components/assets/transaction-dialog';

interface CategoryCardProps {
  category: CategorySummary;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const { difference } = category;
  const [transactionOpen, setTransactionOpen] = useState(false);

  const DifferenceIcon =
    difference > 0 ? TrendingUp : difference < 0 ? TrendingDown : Minus;

  return (
    <Card className="group relative overflow-hidden border border-border/60 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5">
      {/* Subtle top accent bar based on difference */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-0.5 transition-opacity',
          difference > 0
            ? 'bg-emerald-500'
            : difference < 0
              ? 'bg-red-500'
              : 'bg-muted-foreground/30',
        )}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-tight">
            {category.name}
          </CardTitle>
          <span
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
              getDifferenceBadgeClass(difference),
            )}
          >
            <DifferenceIcon className="h-3 w-3" />
            {formatDifference(difference)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total value */}
        <div>
          <p className="text-2xl font-bold tracking-tight">
            {formatCurrency(category.total)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {category.assets} {category.assets === 1 ? 'asset' : 'assets'}
          </p>
        </div>

        {/* Allocation bars */}
        <div className="space-y-2">
          {/* Current allocation bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Current</span>
              <span className="font-medium text-foreground">
                {formatPercentage(category.currentPercentage)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(category.currentPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Target allocation bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Target</span>
              <span className="font-medium text-foreground">
                {formatPercentage(category.targetPercentage)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-muted-foreground/40 transition-all duration-500"
                style={{ width: `${Math.min(category.targetPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Difference summary */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Difference</span>
          <span className={cn('font-semibold', getDifferenceColor(difference))}>
            {formatDifference(difference)}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setTransactionOpen(true)}
        >
          Lançar
        </Button>
      </CardContent>

      <TransactionDialog
        categoryId={category.id}
        categoryName={category.name}
        categorySlug={category.slug}
        open={transactionOpen}
        onOpenChange={setTransactionOpen}
      />
    </Card>
  );
}
