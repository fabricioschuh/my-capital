import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'decimal',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value) + '%';
}

export function getDifferenceColor(difference: number): string {
  if (difference > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (difference < 0) return 'text-red-500 dark:text-red-400';
  return 'text-muted-foreground';
}

export function getDifferenceBadgeClass(difference: number): string {
  if (difference > 0)
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (difference < 0)
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-muted text-muted-foreground';
}

export function formatDifference(difference: number): string {
  const prefix = difference > 0 ? '+' : '';
  return `${prefix}${formatPercentage(difference)}`;
}
