import { Injectable, Logger } from '@nestjs/common';
import { ASSET_REPOSITORY, AssetRepository } from '../domain/asset.repository';
import { Inject } from '@nestjs/common';

interface QuoteResult {
  ticker: string;
  price: number | null;
  currency: string;
}

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,
  ) {}

  // ── brapi.dev — Brazilian tickers (B3) ──────────────────────────────────────
  private async fetchBRQuotes(tickers: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (tickers.length === 0) return result;

    try {
      const joined = tickers.join(',');
      const url = `https://brapi.dev/api/quote/${joined}?token=anonymous`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`brapi status ${res.status}`);

      const data = await res.json() as {
        results?: Array<{ symbol: string; regularMarketPrice: number }>;
        error?: string;
      };

      for (const item of data.results ?? []) {
        if (item.regularMarketPrice != null) {
          result.set(item.symbol.toUpperCase(), item.regularMarketPrice);
        }
      }
    } catch (err) {
      this.logger.warn(`brapi.dev fetch failed: ${(err as Error).message}`);
    }

    return result;
  }

  // ── Yahoo Finance (unofficial) — international tickers ─────────────────────
  private async fetchIntlQuote(ticker: string): Promise<number | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) return null;

      const data = await res.json() as {
        chart?: {
          result?: Array<{
            meta?: { regularMarketPrice?: number };
          }>;
        };
      };

      return data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
    } catch {
      return null;
    }
  }

  // ── Main: refresh all assets with a ticker ──────────────────────────────────
  async refreshAll(): Promise<{ updated: number; failed: number; skipped: number }> {
    const assets = await this.assetRepository.findAllActive();
    const withTicker = assets.filter((a) => a.ticker && a.ticker.trim() !== '');

    if (withTicker.length === 0) return { updated: 0, failed: 0, skipped: assets.length };

    // Separate BR (BRL) vs international
    const brAssets = withTicker.filter((a) => a.currency === 'BRL');
    const intlAssets = withTicker.filter((a) => a.currency !== 'BRL');

    const brTickers = [...new Set(brAssets.map((a) => a.ticker!.toUpperCase()))];
    const brPrices = await this.fetchBRQuotes(brTickers);

    // Fetch intl quotes with concurrency limit (3 at a time)
    const intlQuotes = new Map<string, number | null>();
    for (let i = 0; i < intlAssets.length; i += 3) {
      const batch = intlAssets.slice(i, i + 3);
      const results = await Promise.all(
        batch.map(async (a) => ({
          ticker: a.ticker!.toUpperCase(),
          price: await this.fetchIntlQuote(a.ticker!),
        })),
      );
      for (const r of results) intlQuotes.set(r.ticker, r.price);
    }

    let updated = 0;
    let failed = 0;
    const skipped = assets.length - withTicker.length;
    const now = new Date().toISOString();

    for (const asset of withTicker) {
      const ticker = asset.ticker!.toUpperCase();
      const price = asset.currency === 'BRL'
        ? (brPrices.get(ticker) ?? null)
        : (intlQuotes.get(ticker) ?? null);

      if (price == null) {
        this.logger.warn(`No quote found for ${ticker}`);
        failed++;
        continue;
      }

      try {
        await this.assetRepository.update(asset.id, {
          marketPrice: parseFloat(price.toFixed(8)),
          marketPriceUpdatedAt: now,
        });
        updated++;
        this.logger.log(`Updated ${ticker}: ${price}`);
      } catch (err) {
        this.logger.error(`Failed to update ${ticker}: ${(err as Error).message}`);
        failed++;
      }
    }

    return { updated, failed, skipped };
  }
}
