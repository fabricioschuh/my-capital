'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFundamentals } from '@/hooks/use-assets';
import { FundamentalsResult, EtfData, RecentUpgrade } from '@/types';
import { watchlistService } from '@/services/watchlist.service';
import {
  Loader2, Search, TrendingUp, TrendingDown, Minus, Info,
  ChevronDown, X, Plus, ChevronsDownUp, ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/i18n-context';

/* ─── Valuation signal helpers ─────────────────────────────────────────────── */

type Signal = 'cheap' | 'fair' | 'expensive' | 'neutral';

function signalBg(s: Signal) {
  if (s === 'cheap') return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
  if (s === 'expensive') return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  if (s === 'fair') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
  return 'bg-muted text-muted-foreground';
}

function signalLabel(s: Signal, t: (key: string) => string) {
  if (s === 'cheap') return t('sig.cheap');
  if (s === 'expensive') return t('sig.expensive');
  if (s === 'fair') return t('sig.fair');
  return '—';
}

function peSignal(pe: number | undefined, market: 'BR' | 'US'): Signal {
  if (pe == null || pe <= 0) return 'neutral';
  const low = market === 'BR' ? 8 : 15;
  const high = market === 'BR' ? 20 : 30;
  if (pe < low) return 'cheap';
  if (pe > high) return 'expensive';
  return 'fair';
}

function pbSignal(pb: number | undefined): Signal {
  if (pb == null || pb <= 0) return 'neutral';
  if (pb < 1) return 'cheap';
  if (pb > 3) return 'expensive';
  return 'fair';
}

function evEbitdaSignal(ev: number | undefined, market: 'BR' | 'US'): Signal {
  if (ev == null || ev <= 0) return 'neutral';
  const low = market === 'BR' ? 5 : 10;
  const high = market === 'BR' ? 12 : 20;
  if (ev < low) return 'cheap';
  if (ev > high) return 'expensive';
  return 'fair';
}

function dySignal(dy: number | undefined): Signal {
  if (dy == null) return 'neutral';
  const pct = dy > 1 ? dy : dy * 100;
  if (pct >= 5) return 'cheap';
  if (pct < 1) return 'expensive';
  return 'fair';
}

function roeSignal(roe: number | undefined): Signal {
  if (roe == null) return 'neutral';
  const pct = roe > 1 ? roe : roe * 100;
  if (pct >= 15) return 'cheap';
  if (pct < 5) return 'expensive';
  return 'fair';
}

function debtSignal(de: number | undefined): Signal {
  if (de == null) return 'neutral';
  if (de < 50) return 'cheap';
  if (de > 200) return 'expensive';
  return 'fair';
}

function pricePositionSignal(
  current: number | undefined,
  low52: number | undefined,
  high52: number | undefined,
): Signal {
  if (!current || !low52 || !high52 || high52 === low52) return 'neutral';
  const pos = (current - low52) / (high52 - low52);
  if (pos < 0.3) return 'cheap';
  if (pos > 0.75) return 'expensive';
  return 'fair';
}

function overallSignal(data: FundamentalsResult): { signal: Signal; score: number } {
  const signals: Signal[] = [
    peSignal(data.trailingPE, data.market),
    pbSignal(data.priceToBook),
    evEbitdaSignal(data.enterpriseToEbitda, data.market),
    dySignal(data.dividendYield),
    roeSignal(data.returnOnEquity),
    debtSignal(data.debtToEquity),
    pricePositionSignal(data.currentPrice, data.fiftyTwoWeekLow, data.fiftyTwoWeekHigh),
  ].filter((s) => s !== 'neutral');

  if (signals.length === 0) return { signal: 'neutral', score: 0 };

  const cheap = signals.filter((s) => s === 'cheap').length;
  const expensive = signals.filter((s) => s === 'expensive').length;
  const score = (cheap - expensive) / signals.length;

  let signal: Signal = 'fair';
  if (score > 0.3) signal = 'cheap';
  else if (score < -0.3) signal = 'expensive';

  return { signal, score };
}

/* ─── Formatters ────────────────────────────────────────────────────────────── */

function fmt(v: number | undefined, opts?: { pct?: boolean; dec?: number; mult100?: boolean }, numLocale = 'en-US'): string {
  if (v == null) return '—';
  let val = v;
  if (opts?.mult100) val = v * 100;
  if (opts?.pct) return `${val.toFixed(opts.dec ?? 1)}%`;
  return val.toLocaleString(numLocale, {
    minimumFractionDigits: opts?.dec ?? 2,
    maximumFractionDigits: opts?.dec ?? 2,
  });
}

function fmtCurrency(v: number | undefined, currency: string, numLocale = 'en-US'): string {
  if (v == null) return '—';
  return new Intl.NumberFormat(numLocale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(v);
}

function fmtMarketCap(v: number | undefined, numLocale = 'en-US'): string {
  if (v == null) return '—';
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return v.toLocaleString(numLocale);
}

function fmtDy(v: number | undefined): string {
  if (v == null) return '—';
  const pct = v > 1 ? v : v * 100;
  return `${pct.toFixed(2)}%`;
}

function recommendationBadge(key: string | undefined, t: (key: string) => string) {
  if (!key) return null;
  const map: Record<string, { label: string; cls: string }> = {
    strongBuy: { label: t('rec.strongBuy'), cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    buy: { label: t('rec.buy'), cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    hold: { label: t('rec.hold'), cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    sell: { label: t('rec.sell'), cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    strongSell: { label: t('rec.strongSell'), cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };
  const entry = map[key];
  if (!entry) return null;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', entry.cls)}>
      {entry.label}
    </span>
  );
}

/* ─── Metric row ────────────────────────────────────────────────────────────── */

function MetricRow({ label, value, signal, tooltip }: {
  label: string; value: string; signal?: Signal; tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        {tooltip && (
          <span className="group relative cursor-help">
            <Info className="h-3 w-3 text-muted-foreground/50" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 w-48 rounded-md border border-border bg-popover px-2 py-1.5 text-xs text-popover-foreground shadow-md">
              {tooltip}
            </span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        {signal && signal !== 'neutral' && (
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', signalBg(signal))}>
            {signalLabel(signal)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── 52-week range bar ─────────────────────────────────────────────────────── */

function RangeBar({ current, low, high, currency }: {
  current?: number; low?: number; high?: number; currency: string;
}) {
  const { t, locale } = useI18n();
  const numLocale = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
  if (!current || !low || !high || high === low) return null;
  const pct = Math.min(Math.max(((current - low) / (high - low)) * 100, 0), 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t('rb.min52')} {fmtCurrency(low, currency, numLocale)}</span>
        <span>{t('rb.max52')} {fmtCurrency(high, currency, numLocale)}</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div className="absolute h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 h-3 w-1 rounded-full bg-primary -translate-x-1/2" style={{ left: `${pct}%` }} />
      </div>
      <p className="text-xs text-center text-muted-foreground">
        {t('rb.currentPrice', { price: fmtCurrency(current, currency, numLocale), pct: pct.toFixed(0) })}
      </p>
    </div>
  );
}

/* ─── ETF panel ─────────────────────────────────────────────────────────────── */

function EtfPanel({ etf, currency }: { etf: EtfData; currency: string }) {
  const { t, locale } = useI18n();
  const numLocale = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
  return (
    <div className="space-y-4">
      {/* Fund info + returns */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('etf.fundInfo')}</h4>
          {etf.fundFamily && (
            <MetricRow label={t('etf.manager')} value={etf.fundFamily} />
          )}
          {etf.categoryName && (
            <MetricRow label={t('etf.category')} value={etf.categoryName} />
          )}
          <MetricRow
            label={t('etf.expenseRatio')}
            value={etf.expenseRatio != null ? `${(etf.expenseRatio * 100).toFixed(2)}%` : '—'}
            tooltip={t('etf.expenseRatioTip')}
          />
          <MetricRow
            label={t('etf.netAssets')}
            value={etf.totalAssets != null ? fmtMarketCap(etf.totalAssets, numLocale) : '—'}
          />
          {etf.morningStarRating != null && (
            <MetricRow label={t('etf.morningstar')} value={'★'.repeat(etf.morningStarRating) + '☆'.repeat(5 - etf.morningStarRating)} />
          )}
        </div>

        <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('etf.returns')}</h4>
          <MetricRow label="YTD" value={etf.ytdReturn != null ? `${(etf.ytdReturn * 100).toFixed(2)}%` : '—'} />
          <MetricRow label="1Y" value={etf.oneYearReturn != null ? `${(etf.oneYearReturn * 100).toFixed(2)}%` : '—'} />
          <MetricRow label="3Y" value={etf.threeYearReturn != null ? `${(etf.threeYearReturn * 100).toFixed(2)}%` : '—'} />
          <MetricRow label="5Y" value={etf.fiveYearReturn != null ? `${(etf.fiveYearReturn * 100).toFixed(2)}%` : '—'} />
        </div>
      </div>

      {/* Risk metrics + holdings valuations */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('etf.risk')}</h4>
          <MetricRow label={t('etf.beta3y')} value={fmt(etf.beta3Year, { dec: 2 }, numLocale)} tooltip={t('etf.beta3yTip')} />
          <MetricRow label={t('etf.sharpe')} value={fmt(etf.sharpeRatio, { dec: 2 }, numLocale)} tooltip={t('etf.sharpeTip')} />
          <MetricRow label={t('etf.alpha')} value={fmt(etf.alpha, { dec: 2 }, numLocale)} tooltip={t('etf.alphaTip')} />
          <MetricRow label={t('etf.stdDev')} value={etf.standardDeviation != null ? `${(etf.standardDeviation * 100).toFixed(2)}%` : '—'} tooltip={t('etf.stdDevTip')} />
        </div>

        {(etf.holdingsPE != null || etf.holdingsPB != null || etf.holdingsPS != null) && (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('etf.holdingsValuation')}</h4>
            <MetricRow label={t('etf.avgPE')} value={fmt(etf.holdingsPE, { dec: 1 }, numLocale)} tooltip={t('etf.avgPETip')} />
            <MetricRow label={t('etf.avgPB')} value={fmt(etf.holdingsPB, { dec: 2 }, numLocale)} />
            <MetricRow label={t('etf.avgPS')} value={fmt(etf.holdingsPS, { dec: 2 }, numLocale)} />
          </div>
        )}
      </div>

      {/* Top holdings */}
      {etf.topHoldings && etf.topHoldings.length > 0 && (
        <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('etf.topHoldings')}</h4>
          <div className="space-y-2">
            {etf.topHoldings.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{h.name ?? h.symbol ?? '—'}</span>
                    <span className="text-sm tabular-nums shrink-0">{h.pct != null ? `${(h.pct * 100).toFixed(2)}%` : '—'}</span>
                  </div>
                  {h.pct != null && (
                    <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(h.pct * 100 * 3, 100)}%` }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sector weightings */}
      {etf.sectorWeightings && etf.sectorWeightings.length > 0 && (
        <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('etf.sectorAlloc')}</h4>
          <div className="space-y-2">
            {etf.sectorWeightings
              .sort((a, b) => b.pct - a.pct)
              .slice(0, 8)
              .map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-32 shrink-0 truncate capitalize">{s.sector}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(s.pct * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs tabular-nums w-12 text-right">{(s.pct * 100).toFixed(1)}%</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Fair value panel (stocks) ─────────────────────────────────────────────── */

function FairValuePanel({ data }: { data: FundamentalsResult }) {
  const { t, locale } = useI18n();
  const numLocale = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
  const { analystTarget, grahamValue, recentUpgrades, currentPrice, currency } = data;
  const hasContent = analystTarget || grahamValue || (recentUpgrades && recentUpgrades.length > 0);
  if (!hasContent) return null;

  function gradeBadge(grade: string | undefined) {
    if (!grade) return null;
    const g = grade.toLowerCase();
    const isBuy = g.includes('buy') || g.includes('outperform') || g.includes('overweight') || g.includes('positive');
    const isSell = g.includes('sell') || g.includes('underperform') || g.includes('underweight') || g.includes('negative');
    const cls = isBuy
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : isSell
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-muted text-muted-foreground';
    return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', cls)}>{grade}</span>;
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Graham number */}
        {grahamValue && (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t('fv.grahamTitle')}
            </h4>
            <MetricRow
              label={t('fv.grahamNumber')}
              value={fmtCurrency(grahamValue.grahamNumber, currency, numLocale)}
              tooltip={t('fv.grahamTip')}
            />
            <MetricRow
              label={t('fv.eps')}
              value={fmtCurrency(grahamValue.eps, currency, numLocale)}
            />
            <MetricRow
              label={t('fv.bvps')}
              value={fmtCurrency(grahamValue.bookValuePerShare, currency, numLocale)}
            />
            {grahamValue.marginOfSafety != null && (
              <MetricRow
                label={t('fv.marginOfSafety')}
                value={`${grahamValue.marginOfSafety.toFixed(1)}%`}
                signal={grahamValue.marginOfSafety > 20 ? 'cheap' : grahamValue.marginOfSafety < -20 ? 'expensive' : 'fair'}
                tooltip={t('fv.marginTip')}
              />
            )}
          </div>
        )}

        {/* Analyst targets */}
        {analystTarget && (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              {t('fv.analystTitle')}
              {analystTarget.numberOfAnalysts != null && (
                <span className="ml-1.5 font-normal normal-case">({t('fv.analysts', { n: String(analystTarget.numberOfAnalysts) })})</span>
              )}
            </h4>
            {analystTarget.recommendationKey && (
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('fv.recommendation')}</span>
                {recommendationBadge(analystTarget.recommendationKey, t)}
              </div>
            )}
            <MetricRow
              label={t('fv.targetMean')}
              value={fmtCurrency(analystTarget.targetMean, currency, numLocale)}
              signal={analystTarget.upsideMean != null
                ? (analystTarget.upsideMean > 10 ? 'cheap' : analystTarget.upsideMean < -10 ? 'expensive' : 'fair')
                : undefined}
            />
            {analystTarget.upsideMean != null && (
              <MetricRow
                label={t('fv.upside')}
                value={`${analystTarget.upsideMean.toFixed(1)}%`}
                signal={analystTarget.upsideMean > 10 ? 'cheap' : analystTarget.upsideMean < -10 ? 'expensive' : 'fair'}
                tooltip={t('fv.upsideTip')}
              />
            )}
            <MetricRow label={t('fv.targetHigh')} value={fmtCurrency(analystTarget.targetHigh, currency, numLocale)} />
            <MetricRow label={t('fv.targetLow')} value={fmtCurrency(analystTarget.targetLow, currency, numLocale)} />
            {currentPrice && analystTarget.targetHigh && analystTarget.targetLow && (
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fmtCurrency(analystTarget.targetLow, currency, numLocale)}</span>
                  <span>{fmtCurrency(analystTarget.targetHigh, currency, numLocale)}</span>
                </div>
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  {(() => {
                    const range = analystTarget.targetHigh - analystTarget.targetLow;
                    const pos = range > 0 ? Math.min(Math.max(((currentPrice - analystTarget.targetLow) / range) * 100, 0), 100) : 50;
                    return (
                      <>
                        <div className="absolute h-full rounded-full bg-primary/30" style={{ width: '100%' }} />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-3 w-1.5 rounded-full bg-primary -translate-x-1/2"
                          style={{ left: `${pos}%` }}
                        />
                      </>
                    );
                  })()}
                </div>
                <p className="text-xs text-center text-muted-foreground">{t('rb.priceInRange')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent upgrades/downgrades */}
      {recentUpgrades && recentUpgrades.length > 0 && (
        <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('fv.recentReviews')}</h4>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left text-xs text-muted-foreground font-medium pb-2 pr-3">{t('fv.date')}</th>
                  <th className="text-left text-xs text-muted-foreground font-medium pb-2 pr-3">{t('fv.firm')}</th>
                  <th className="text-left text-xs text-muted-foreground font-medium pb-2 pr-3">{t('fv.from')}</th>
                  <th className="text-left text-xs text-muted-foreground font-medium pb-2 pr-3">{t('fv.to')}</th>
                  <th className="text-right text-xs text-muted-foreground font-medium pb-2">{t('fv.targetPrice')}</th>
                </tr>
              </thead>
              <tbody>
                {recentUpgrades.map((u: RecentUpgrade, i: number) => (
                  <tr key={i} className="border-b border-border/20 last:border-0">
                    <td className="py-2 pr-3 text-xs text-muted-foreground tabular-nums whitespace-nowrap">{u.date ?? '—'}</td>
                    <td className="py-2 pr-3 text-xs font-medium">{u.firm ?? '—'}</td>
                    <td className="py-2 pr-3">{gradeBadge(u.fromGrade) ?? <span className="text-xs text-muted-foreground">—</span>}</td>
                    <td className="py-2 pr-3">{gradeBadge(u.toGrade) ?? <span className="text-xs text-muted-foreground">—</span>}</td>
                    <td className="py-2 text-right text-xs tabular-nums">{u.targetPrice != null ? fmtCurrency(u.targetPrice, currency, numLocale) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Expanded fundamentals content ────────────────────────────────────────── */

function FundamentalsContent({ data }: { data: FundamentalsResult }) {
  const { t, locale } = useI18n();
  const numLocale = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
  const isEtf = data.instrumentType === 'ETF' || data.instrumentType === 'MUTUALFUND';
  const { signal } = overallSignal(data);
  const OverallIcon = signal === 'cheap' ? TrendingUp : signal === 'expensive' ? TrendingDown : Minus;

  return (
    <div className="border-t border-border/50 px-4 pb-4 pt-4 space-y-4">
      {/* Overall verdict */}
      <div className={cn('flex items-center gap-3 rounded-lg px-4 py-3', signalBg(signal))}>
        <OverallIcon className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold text-sm">
            {signal === 'cheap' ? t('sig.cheapVerdict') :
              signal === 'expensive' ? t('sig.expensiveVerdict') :
              t('sig.fairVerdict')}
          </p>
          <p className="text-xs opacity-80 mt-0.5">
            {t('sig.verdictSub')}
          </p>
        </div>
      </div>

      {/* 52-week range */}
      <RangeBar
        current={data.currentPrice}
        low={data.fiftyTwoWeekLow}
        high={data.fiftyTwoWeekHigh}
        currency={data.currency}
      />

      {/* ETF-specific content */}
      {isEtf && data.etf && <EtfPanel etf={data.etf} currency={data.currency} />}

      {/* Stock metrics grid */}
      {!isEtf && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('fund.valuation')}</h4>
            <MetricRow label="P/E (trailing)" value={fmt(data.trailingPE, { dec: 1 }, numLocale)} signal={peSignal(data.trailingPE, data.market)}
              tooltip="Price / Earnings. Below historical average = cheap." />
            <MetricRow label="P/E (forward)" value={fmt(data.forwardPE, { dec: 1 }, numLocale)} signal={peSignal(data.forwardPE, data.market)}
              tooltip="Forward P/E using analyst projected earnings." />
            <MetricRow label="P/B" value={fmt(data.priceToBook, { dec: 2 }, numLocale)} signal={pbSignal(data.priceToBook)}
              tooltip="Price / Book Value. Below 1 = below book value." />
            <MetricRow label="EV/EBITDA" value={fmt(data.enterpriseToEbitda, { dec: 1 }, numLocale)} signal={evEbitdaSignal(data.enterpriseToEbitda, data.market)}
              tooltip="Enterprise value relative to EBITDA." />
            <MetricRow label="P/S" value={fmt(data.priceToSales, { dec: 2 }, numLocale)}
              tooltip="Price / Revenue. Useful for companies without profit yet." />
            <MetricRow label="PEG" value={fmt(data.pegRatio, { dec: 2 }, numLocale)}
              tooltip="P/E divided by earnings growth. Below 1 = cheap relative to growth." />
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('fund.dividends')}</h4>
            <MetricRow label="Dividend Yield" value={fmtDy(data.dividendYield)} signal={dySignal(data.dividendYield)}
              tooltip="Dividend / price. Above 5% generally attractive." />
            <MetricRow label="Payout Ratio" value={fmt(data.payoutRatio, { mult100: true, pct: true }, numLocale)}
              tooltip="% of profit distributed as dividend." />
            <MetricRow label="ROE" value={fmt(data.returnOnEquity, { mult100: true, pct: true }, numLocale)} signal={roeSignal(data.returnOnEquity)}
              tooltip="Return on equity. Above 15% = good management." />
            <MetricRow label="ROA" value={fmt(data.returnOnAssets, { mult100: true, pct: true }, numLocale)}
              tooltip="Return on total assets." />
            <MetricRow label="Net margin" value={fmt(data.profitMargins, { mult100: true, pct: true }, numLocale)}
              tooltip="Net profit / Revenue." />
            <MetricRow label="EBITDA margin" value={fmt(data.ebitdaMargins, { mult100: true, pct: true }, numLocale)}
              tooltip="EBITDA / Revenue." />
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('fund.health')}</h4>
            <MetricRow label="Debt/Equity" value={fmt(data.debtToEquity, { dec: 1 }, numLocale)} signal={debtSignal(data.debtToEquity)}
              tooltip="Debt relative to equity. Below 100% is conservative." />
            <MetricRow label="Current ratio" value={fmt(data.currentRatio, { dec: 2 }, numLocale)}
              tooltip="Current assets / current liabilities. Above 1.5 = healthy." />
            <MetricRow label="Beta" value={fmt(data.beta, { dec: 2 }, numLocale)}
              tooltip="Volatility relative to market. Beta > 1 = more volatile." />
            <MetricRow label="50-day avg" value={fmtCurrency(data.fiftyDayAverage, data.currency, numLocale)}
              tooltip="50-day moving average." />
            <MetricRow label="200-day avg" value={fmtCurrency(data.twoHundredDayAverage, data.currency, numLocale)}
              tooltip="200-day moving average. Price above = uptrend." />
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{t('fund.growth')}</h4>
            <MetricRow label="Earnings growth" value={fmt(data.earningsGrowth, { mult100: true, pct: true }, numLocale)}
              tooltip="Recent earnings growth." />
            <MetricRow label="Revenue growth" value={fmt(data.revenueGrowth, { mult100: true, pct: true }, numLocale)}
              tooltip="Recent revenue growth." />
            <MetricRow label="Gross margin" value={fmt(data.grossMargins, { mult100: true, pct: true }, numLocale)}
              tooltip="(Revenue − COGS) / Revenue." />
            <MetricRow label="Market Cap" value={fmtMarketCap(data.marketCap, numLocale)} />
          </div>
        </div>
      )}

      {/* Fair value section (stocks only) */}
      {!isEtf && <FairValuePanel data={data} />}
    </div>
  );
}

/* ─── Single ticker row (collapsed/expanded) ────────────────────────────────── */

function TickerRow({
  ticker,
  forceOpen,
  onRemove,
}: {
  ticker: string;
  forceOpen?: boolean;
  onRemove: (t: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { t, locale } = useI18n();
  const numLocale = locale === 'pt-BR' ? 'pt-BR' : 'en-US';

  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);

  const { data, isLoading, isError, error } = useFundamentals(ticker);

  const { signal } = data ? overallSignal(data) : { signal: 'neutral' as Signal };
  const OverallIcon = signal === 'cheap' ? TrendingUp : signal === 'expensive' ? TrendingDown : Minus;
  const marketLabel = data?.market === 'BR' ? '🇧🇷 B3' : data?.market === 'US' ? '🇺🇸 US' : '';

  return (
    <div className={cn(
      'rounded-xl border border-border/60 bg-card overflow-hidden transition-all duration-200 hover:border-primary/20 hover:shadow-sm',
    )}>
      <div className="h-0.5 bg-primary/30" />

      {/* Header */}
      <div className="flex items-center gap-2 pr-3">
        {/* Expand button */}
        <button
          type="button"
          className="flex flex-1 items-center gap-4 px-4 py-4 text-left min-w-0"
          onClick={() => setOpen((v) => !v)}
        >
          {/* Ticker + name */}
          <div className="flex flex-1 items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold font-mono uppercase">
              {ticker.slice(0, 4)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-base leading-tight">{ticker}</p>
                {marketLabel && !isLoading && (
                  <span className="text-xs text-muted-foreground">{marketLabel}</span>
                )}
              </div>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">{t('att.loading')}</p>
              ) : isError ? (
                <p className="text-sm text-destructive">{(error as Error)?.message ?? 'Error'}</p>
              ) : data?.name ? (
                <p className="text-sm text-muted-foreground truncate">{data.name}</p>
              ) : null}
            </div>
          </div>

          {/* Price + signal */}
          <div className="shrink-0 text-right flex items-center gap-3">
            {!isLoading && data && (
              <>
                <div>
                  <p className="font-bold text-base tabular-nums">{fmtCurrency(data.currentPrice, data.currency, numLocale)}</p>
                  {data.analystTarget?.targetMean && data.currentPrice && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {t('fv.alvo')} {fmtCurrency(data.analystTarget.targetMean, data.currency, numLocale)}
                    </p>
                  )}
                </div>
                {signal !== 'neutral' && (
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0', signalBg(signal))}>
                    <OverallIcon className="h-3 w-3" />
                    {signalLabel(signal, t)}
                  </span>
                )}
              </>
            )}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <ChevronDown className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )} />
        </button>

        {/* Remove button */}
        <button
          type="button"
          onClick={() => onRemove(ticker)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 hover:bg-muted hover:text-destructive transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded content */}
      {open && data && !isLoading && (
        <FundamentalsContent data={data} />
      )}
      {open && isLoading && (
        <div className="border-t border-border/50 px-4 py-8 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('att.loading')}
        </div>
      )}
      {open && isError && (
        <div className="border-t border-border/50 px-4 py-4 text-sm text-destructive">
          {(error as Error)?.message ?? 'Failed to load data.'}
        </div>
      )}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────────── */

export function AnalysisTickerTab() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [allOpen, setAllOpen] = useState<boolean | undefined>(undefined);
  const [loadingList, setLoadingList] = useState(true);
  const { t } = useI18n();

  // Load from API on mount
  useEffect(() => {
    watchlistService.getTickers()
      .then(setTickers)
      .catch(() => {/* silent — list stays empty */})
      .finally(() => setLoadingList(false));
  }, []);

  const persist = useCallback((next: string[]) => {
    watchlistService.saveTickers(next).catch(() => {/* silent */});
  }, []);

  const addTicker = (raw: string) => {
    const t = raw.trim().toUpperCase();
    if (!t || tickers.includes(t)) { setInputValue(''); return; }
    const next = [t, ...tickers];
    setTickers(next);
    persist(next);
    setInputValue('');
  };

  const removeTicker = (t: string) => {
    const next = tickers.filter((x) => x !== t);
    setTickers(next);
    persist(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addTicker(inputValue);
  };

  return (
    <div className="space-y-4">
      {/* Add ticker input */}
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <h3 className="text-base font-semibold mb-1">{t('att.title')}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('att.subtitle', { br: 'PETR4, IVVB11', us: 'AAPL, VOO', eu: 'SAP.DE' })}
        </p>
        <div className="flex gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder={t('att.placeholder')}
            className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono uppercase shadow-sm placeholder:text-muted-foreground placeholder:normal-case focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => addTicker(inputValue)}
            disabled={!inputValue.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('att.add')}
          </button>
        </div>

        {/* Quick add examples */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground">{t('att.suggestions')}</span>
          {['PETR4', 'VALE3', 'ITUB4', 'IVVB11', 'BOVA11', 'AAPL', 'MSFT', 'NVDA', 'VOO', 'SAP.DE'].map((t) => (
            <button
              key={t}
              type="button"
              disabled={tickers.includes(t)}
              onClick={() => addTicker(t)}
              className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-mono hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-default"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!loadingList && tickers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Search className="h-8 w-8 mb-3 opacity-30" />
          <p className="text-sm font-medium">{t('att.emptyTitle')}</p>
          <p className="text-xs mt-1">{t('att.emptyMsg')}</p>
        </div>
      )}

      {/* List loading skeleton */}
      {loadingList && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card overflow-hidden animate-pulse">
              <div className="h-0.5 bg-muted" />
              <div className="flex items-center gap-4 px-4 py-4">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-3 w-40 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List controls + rows */}
      {!loadingList && tickers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {tickers.length === 1 ? t('att.inList', { n: String(tickers.length) }) : t('att.inListPlural', { n: String(tickers.length) })}
            </p>
            <button
              type="button"
              onClick={() => setAllOpen((prev) => prev === true ? false : true)}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {allOpen === true
                ? <><ChevronsDownUp className="h-4 w-4" />{t('att.collapseAll')}</>
                : <><ChevronsUpDown className="h-4 w-4" />{t('att.expandAll')}</>
              }
            </button>
          </div>

          {tickers.map((t) => (
            <TickerRow
              key={t}
              ticker={t}
              forceOpen={allOpen}
              onRemove={removeTicker}
            />
          ))}
        </div>
      )}

      {!loadingList && tickers.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pb-2">
          {t('att.disclaimer')}
        </p>
      )}
    </div>
  );
}
