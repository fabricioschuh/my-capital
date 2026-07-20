'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { usePortfolioSummary } from '@/hooks/use-portfolio';
import { useUpdateCategory } from '@/hooks/use-categories';
import { CategoryRow } from './category-row';
import { PortfolioHeader } from './portfolio-header';
import { ConfigureTargetsDialog } from './configure-targets-dialog';
import dynamic from 'next/dynamic';

const AnalysisTab = dynamic(
  () => import('./analysis-tab').then((m) => m.AnalysisTab),
  { ssr: false },
);

const AnalysisTickerTab = dynamic(
  () => import('./analysis-ticker-tab').then((m) => m.AnalysisTickerTab),
  { ssr: false },
);
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { CategorySummary } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function CategoryRowSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="h-0.5 bg-muted" />
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
    </div>
  );
}

type Tab = 'assets' | 'portfolio' | 'analysis';

export function Dashboard() {
  const { data: summary, isLoading, isError, error, refetch } = usePortfolioSummary();
  const { mutate: updateCategory } = useUpdateCategory();

  const [tab, setTab] = useState<Tab>('assets');
  const [orderedCategories, setOrderedCategories] = useState<CategorySummary[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [allOpen, setAllOpen] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (summary?.categories) {
      setOrderedCategories([...summary.categories].sort((a, b) => a.order - b.order));
    }
  }, [summary?.categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedCategories((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);

      // Persist new order values
      reordered.forEach((cat, i) => {
        const newOrder = i + 1;
        if (cat.order !== newOrder) {
          updateCategory({ id: cat.id, targetPercentage: cat.targetPercentage });
          // Use the categories service directly for order update
          import('@/services/categories.service').then(({ categoriesService }) => {
            categoriesService.update(cat.id, { order: newOrder });
          });
        }
      });

      return reordered.map((cat, i) => ({ ...cat, order: i + 1 }));
    });
  };

  const draggingCategory = orderedCategories.find((c) => c.id === draggingId);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfólio</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie e analise seus investimentos
          </p>
        </div>
        <ConfigureTargetsDialog />
      </div>

      {/* Error state */}
      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Failed to load portfolio</p>
            <p className="text-sm opacity-80">{(error as Error)?.message}</p>
          </div>
          <button onClick={() => refetch()} className="ml-auto text-sm underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Portfolio summary header */}
      {summary && <PortfolioHeader summary={summary} />}

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border/60 bg-muted/40 p-1 w-fit">
        {([
          { key: 'assets', label: 'Meus Ativos' },
          { key: 'portfolio', label: 'Carteira' },
          { key: 'analysis', label: 'Análise' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
              tab === key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Meus Ativos tab ── */}
      {tab === 'assets' && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 9 }).map((_, i) => <CategoryRowSkeleton key={i} />)}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={orderedCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setAllOpen((prev) => (prev === true ? false : true))}
                    >
                      {allOpen === true
                        ? <><ChevronsDownUp className="mr-2 h-4 w-4" />Colapsar tudo</>
                        : <><ChevronsUpDown className="mr-2 h-4 w-4" />Expandir tudo</>
                      }
                    </Button>
                  </div>
                  {orderedCategories.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      isDragging={draggingId === category.id}
                      forceOpen={allOpen}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {draggingCategory && (
                  <div className="rounded-xl border border-primary/40 bg-card shadow-xl opacity-95 ring-2 ring-primary/20">
                    <div className="h-0.5 bg-primary/40" />
                    <div className="flex items-center gap-4 px-5 py-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted" />
                      <div className="flex-1">
                        <p className="font-semibold text-xl">{draggingCategory.name}</p>
                        <p className="text-sm text-muted-foreground">{draggingCategory.assets} ativos</p>
                      </div>
                    </div>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}

          {!isLoading && !isError && orderedCategories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No categories found</h3>
              <p className="text-muted-foreground mt-1">Run the seed script to populate initial data.</p>
            </div>
          )}
        </>
      )}

      {/* ── Carteira tab ── */}
      {tab === 'portfolio' && (
        <>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-72 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ) : summary ? (
            <AnalysisTab summary={summary} />
          ) : null}
        </>
      )}

      {/* ── Análise tab ── */}
      {tab === 'analysis' && <AnalysisTickerTab />}
    </div>
  );
}
