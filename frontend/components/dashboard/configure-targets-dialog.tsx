'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCategories, useUpdateCategory } from '@/hooks/use-categories';
import { SlidersHorizontal, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n/i18n-context';

interface CategoryTarget {
  id: string;
  name: string;
  value: string; // string to allow free typing
}

export function ConfigureTargetsDialog() {
  const [open, setOpen] = useState(false);
  const { data: categories } = useCategories();
  const { mutate: updateCategory } = useUpdateCategory();
  const { t } = useI18n();

  const [targets, setTargets] = useState<CategoryTarget[]>([]);
  const [saving, setSaving] = useState(false);

  // Populate form when dialog opens
  useEffect(() => {
    if (open && categories) {
      setTargets(
        categories
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((c) => ({ id: c.id, name: c.name, value: String(c.targetPercentage) })),
      );
    }
  }, [open, categories]);

  const total = targets.reduce((sum, t) => sum + (parseFloat(t.value) || 0), 0);
  const isValid = targets.every((t) => {
    const n = parseFloat(t.value);
    return !isNaN(n) && n >= 0 && n <= 100;
  });

  const handleSave = async () => {
    if (!isValid) return;

    const changed = targets.filter((t) => {
      const original = categories?.find((c) => c.id === t.id);
      return original && parseFloat(t.value) !== original.targetPercentage;
    });

    if (changed.length === 0) {
      setOpen(false);
      return;
    }

    setSaving(true);
    let done = 0;
    for (const t of changed) {
      await new Promise<void>((resolve) =>
        updateCategory(
          { id: t.id, targetPercentage: parseFloat(t.value) },
          { onSettled: () => { done++; resolve(); } },
        ),
      );
    }
    setSaving(false);
    toast.success(done === 1 ? t('ct.toastSingle', { n: String(done) }) : t('ct.toastMultiple', { n: String(done) }));
    setOpen(false);
  };

  const diff = Math.round(total - 100);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <SlidersHorizontal className="h-4 w-4" />
        {t('ct.button')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('ct.title')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-1 max-h-[60vh] overflow-y-auto pr-1">
            {targets.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium truncate">{t.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={t.value}
                    onChange={(e) =>
                      setTargets((prev) =>
                        prev.map((x) => (x.id === t.id ? { ...x, value: e.target.value } : x)),
                      )
                    }
                    className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-muted-foreground w-4">%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Total indicator */}
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium
            ${Math.abs(diff) < 1 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
            <span>{t('ct.total')}</span>
            <span className="tabular-nums">
              {total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}%
              {Math.abs(diff) >= 1 && (
                <span className="ml-1 font-normal opacity-70">
                  ({diff > 0 ? '+' : ''}{diff.toLocaleString(undefined, { minimumFractionDigits: 0 })}%)
                </span>
              )}
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              {t('ct.cancel')}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !isValid}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('ct.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
