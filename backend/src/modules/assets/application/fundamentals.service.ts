import { Injectable, Logger } from '@nestjs/common';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface AnalystTarget {
  targetHigh?: number;
  targetLow?: number;
  targetMean?: number;
  targetMedian?: number;
  recommendationKey?: string;
  numberOfAnalysts?: number;
  /** Upside % from current price to mean target */
  upsideMean?: number;
}

export interface GrahamValue {
  /** Intrinsic value per Graham: √(22.5 × EPS × BookValuePerShare) */
  grahamNumber?: number;
  eps?: number;
  bookValuePerShare?: number;
  /** % margin of safety vs Graham number (positive = cheap) */
  marginOfSafety?: number;
}

export interface BazinValue {
  /** Bazin ceiling price: DPA / 0.06 */
  ceilingPrice?: number;
  /** Annual dividend per share used in the calculation */
  dividendPerShare?: number;
  /** % margin of safety vs Bazin ceiling (positive = cheap) */
  marginOfSafety?: number;
}

export interface EtfData {
  /** Quote type: ETF, MUTUALFUND, etc. */
  quoteType?: string;
  expenseRatio?: number;
  totalAssets?: number;
  /** YTD return as decimal (0.12 = 12%) */
  ytdReturn?: number;
  /** 1-year trailing return */
  oneYearReturn?: number;
  threeYearReturn?: number;
  fiveYearReturn?: number;
  /** Annualised std deviation */
  standardDeviation?: number;
  sharpeRatio?: number;
  alpha?: number;
  beta3Year?: number;
  /** Aggregate P/E of underlying holdings */
  holdingsPE?: number;
  holdingsPB?: number;
  holdingsPS?: number;
  /** Top 5 holdings */
  topHoldings?: Array<{ symbol?: string; name?: string; pct?: number }>;
  /** Sector weightings */
  sectorWeightings?: Array<{ sector: string; pct: number }>;
  fundFamily?: string;
  categoryName?: string;
  morningStarRating?: number;
}

export interface RecentUpgrade {
  date?: string;
  firm?: string;
  toGrade?: string;
  fromGrade?: string;
  action?: string;
  targetPrice?: number;
}

export interface FundamentalsResult {
  ticker: string;
  market: 'BR' | 'US';
  name?: string;
  currency: string;
  /** EQUITY, ETF, MUTUALFUND, etc. */
  instrumentType?: string;

  // Price
  currentPrice?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;

  // Valuation multiples (stocks)
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  enterpriseToEbitda?: number;
  pegRatio?: number;
  priceToSales?: number;

  // Yield & dividends
  dividendYield?: number;
  payoutRatio?: number;

  // Profitability
  returnOnEquity?: number;
  returnOnAssets?: number;
  profitMargins?: number;
  grossMargins?: number;
  ebitdaMargins?: number;

  // Health
  debtToEquity?: number;
  currentRatio?: number;
  beta?: number;

  // Growth
  earningsGrowth?: number;
  revenueGrowth?: number;

  // Market cap
  marketCap?: number;

  // Fair value — stocks
  analystTarget?: AnalystTarget;
  grahamValue?: GrahamValue;
  bazinValue?: BazinValue;
  recentUpgrades?: RecentUpgrade[];

  // ETF-specific
  etf?: EtfData;
}

/* ─── Service ───────────────────────────────────────────────────────────────── */

@Injectable()
export class FundamentalsService {
  private readonly logger = new Logger(FundamentalsService.name);

  async analyze(ticker: string): Promise<FundamentalsResult> {
    const upper = ticker.toUpperCase().trim();

    // BR tickers: 4-6 alphanumeric chars ending in 1-2 digits, no dot
    // Covers: PETR4, VALE3, HGRE11, IVVB11, B5P211, etc.
    const isBR = /^[A-Z0-9]{4,6}\d{1,2}$/.test(upper) && !upper.includes('.');

    if (isBR) {
      return this.analyzeBR(upper);
    } else {
      return this.analyzeYahoo(upper, 'US');
    }
  }

  // ── brapi.dev — BR tickers (primary source) ──────────────────────────────────
  private async analyzeBR(ticker: string): Promise<FundamentalsResult> {
    try {
      const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?modules=summaryProfile,defaultKeyStatistics,financialData&token=anonymous`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) throw new Error(`brapi status ${res.status}`);

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const body = await res.json() as any;
      const r = body?.results?.[0];
      if (!r) throw new Error(`No brapi data for ${ticker}`);

      const ks = r.defaultKeyStatistics ?? {};
      const fd = r.financialData ?? {};

      const currentPrice: number | undefined = r.regularMarketPrice ?? undefined;
      const eps: number | undefined = ks.trailingEps ?? undefined;
      const bvps: number | undefined = ks.bookValue ?? undefined;

      // Graham number
      let grahamValue: GrahamValue | undefined;
      if (eps != null && bvps != null && eps > 0 && bvps > 0) {
        const grahamNumber = Math.sqrt(22.5 * eps * bvps);
        const marginOfSafety = currentPrice
          ? ((grahamNumber - currentPrice) / currentPrice) * 100
          : undefined;
        grahamValue = { grahamNumber, eps, bookValuePerShare: bvps, marginOfSafety };
      }

      // Bazin ceiling: DPA / 0.06
      const dividendRate: number | undefined = ks.trailingAnnualDividendRate ?? undefined;
      let bazinValue: BazinValue | undefined;
      if (dividendRate != null && dividendRate > 0) {
        const ceilingPrice = dividendRate / 0.06;
        const marginOfSafety = currentPrice
          ? ((ceilingPrice - currentPrice) / currentPrice) * 100
          : undefined;
        bazinValue = { ceilingPrice, dividendPerShare: dividendRate, marginOfSafety };
      }

      return {
        ticker,
        market: 'BR',
        name: r.longName ?? r.shortName ?? undefined,
        currency: 'BRL',
        instrumentType: 'EQUITY',

        currentPrice,
        fiftyTwoWeekLow: r.fiftyTwoWeekLow ?? undefined,
        fiftyTwoWeekHigh: r.fiftyTwoWeekHigh ?? undefined,
        fiftyDayAverage: undefined,   // brapi doesn't return moving averages
        twoHundredDayAverage: undefined,

        trailingPE: r.priceEarnings ?? ks.trailingPE ?? undefined,
        forwardPE: ks.forwardPE ?? undefined,
        priceToBook: ks.priceToBook ?? undefined,
        enterpriseToEbitda: ks.enterpriseToEbitda ?? undefined,
        pegRatio: ks.pegRatio ?? undefined,
        priceToSales: undefined,

        dividendYield: ks.dividendYield ?? ks.yield ?? undefined,
        payoutRatio: undefined,

        returnOnEquity: fd.returnOnEquity ?? undefined,
        returnOnAssets: fd.returnOnAssets ?? undefined,
        profitMargins: fd.profitMargins ?? ks.profitMargins ?? undefined,
        grossMargins: fd.grossMargins ?? undefined,
        ebitdaMargins: fd.ebitdaMargins ?? undefined,

        debtToEquity: fd.debtToEquity != null ? fd.debtToEquity * 100 : undefined,
        currentRatio: fd.currentRatio ?? undefined,
        beta: ks.beta ?? undefined,

        earningsGrowth: fd.earningsGrowth ?? undefined,
        revenueGrowth: fd.revenueGrowth ?? undefined,

        marketCap: r.marketCap ?? ks.marketCap ?? undefined,

        analystTarget: undefined,  // brapi doesn't provide analyst targets for BR
        grahamValue,
        bazinValue,
        recentUpgrades: undefined,
        etf: undefined,
      };
    } catch (err) {
      this.logger.warn(`brapi.dev failed for ${ticker}: ${(err as Error).message} — falling back to Yahoo`);
      // Fallback to Yahoo Finance with .SA suffix
      return this.analyzeYahoo(ticker + '.SA', 'BR', 'BRL');
    }
  }

  // ── Yahoo Finance quoteSummary ─────────────────────────────────────────────
  private async analyzeYahoo(
    yahooTicker: string,
    market: 'BR' | 'US',
    forceCurrency?: string,
  ): Promise<FundamentalsResult> {
    const crumb = await this.getYahooCrumb();
    // Include ETF-specific modules + upgradeDowngradeHistory for stocks
    const modules = [
      'defaultKeyStatistics',
      'financialData',
      'summaryDetail',
      'quoteType',
      'price',
      'topHoldings',
      'fundProfile',
      'fundPerformance',
      'upgradeDowngradeHistory',
    ].join(',');

    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooTicker)}?modules=${modules}${crumb ? `&crumb=${encodeURIComponent(crumb.crumb)}` : ''}`;
    const cookieHeader = crumb ? { Cookie: crumb.cookie } : {};

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', ...cookieHeader },
      signal: AbortSignal.timeout(14000),
    });

    if (!res.ok) {
      this.logger.warn(`Yahoo Finance returned ${res.status} for ${yahooTicker}`);
      throw new Error(`Ticker "${yahooTicker.replace('.SA', '')}" não encontrado ou indisponível`);
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const body = await res.json() as any;
    const result = body?.quoteSummary?.result?.[0];
    if (!result) throw new Error(`Sem dados para o ticker "${yahooTicker.replace('.SA', '')}"`);

    const sd  = result.summaryDetail ?? {};
    const ks  = result.defaultKeyStatistics ?? {};
    const fd  = result.financialData ?? {};
    const qt  = result.quoteType ?? {};
    const pr  = result.price ?? {};
    const th  = result.topHoldings ?? {};
    const fp  = result.fundProfile ?? {};
    const fpe = result.fundPerformance ?? {};
    const udh = result.upgradeDowngradeHistory ?? {};

    // Helper: extract raw number from Yahoo's {raw, fmt} wrapper or plain number
    const v = (obj: any, key: string): number | undefined => {
      const raw = obj[key];
      if (raw == null) return undefined;
      if (typeof raw === 'number') return raw;
      if (typeof raw === 'object' && raw.raw != null) return raw.raw;
      return undefined;
    };

    const displayTicker = yahooTicker.replace(/\.SA$/, '');
    const currency = forceCurrency ?? (pr.currency ?? fd.financialCurrency ?? 'USD');
    const instrumentType: string = qt.quoteType ?? 'EQUITY';
    const isEtf = instrumentType === 'ETF' || instrumentType === 'MUTUALFUND';

    // 52w low: Yahoo sometimes returns 0 for BR tickers
    const raw52wLow = v(sd, 'fiftyTwoWeekLow');
    const fiftyTwoWeekLow = raw52wLow != null && raw52wLow > 0 ? raw52wLow : undefined;

    const currentPrice = v(pr, 'regularMarketPrice') ?? v(fd, 'currentPrice') ?? v(sd, 'previousClose');

    // ── Analyst targets (stocks only) ──────────────────────────────────────
    const targetMean   = v(fd, 'targetMeanPrice');
    const targetMedian = v(fd, 'targetMedianPrice');
    const targetHigh   = v(fd, 'targetHighPrice');
    const targetLow    = v(fd, 'targetLowPrice');
    const nAnalysts    = v(fd, 'numberOfAnalystOpinions');

    let analystTarget: AnalystTarget | undefined;
    if (!isEtf && (targetMean != null || targetHigh != null)) {
      const upsideMean = targetMean != null && currentPrice
        ? ((targetMean - currentPrice) / currentPrice) * 100
        : undefined;
      analystTarget = {
        targetHigh, targetLow, targetMean, targetMedian,
        recommendationKey: fd.recommendationKey ?? undefined,
        numberOfAnalysts: nAnalysts,
        upsideMean,
      };
    }

    // ── Graham number (stocks only) ────────────────────────────────────────
    let grahamValue: GrahamValue | undefined;
    if (!isEtf) {
      const eps  = v(ks, 'trailingEps');
      const bvps = v(ks, 'bookValue');
      if (eps != null && bvps != null && eps > 0 && bvps > 0) {
        const grahamNumber = Math.sqrt(22.5 * eps * bvps);
        const marginOfSafety = currentPrice
          ? ((grahamNumber - currentPrice) / currentPrice) * 100
          : undefined;
        grahamValue = { grahamNumber, eps, bookValuePerShare: bvps, marginOfSafety };
      }
    }

    // ── Bazin ceiling (stocks only): DPA / 0.06 ───────────────────────────
    let bazinValue: BazinValue | undefined;
    if (!isEtf) {
      const dividendRate = v(sd, 'trailingAnnualDividendRate') ?? v(sd, 'dividendRate');
      if (dividendRate != null && dividendRate > 0) {
        const ceilingPrice = dividendRate / 0.06;
        const marginOfSafety = currentPrice
          ? ((ceilingPrice - currentPrice) / currentPrice) * 100
          : undefined;
        bazinValue = { ceilingPrice, dividendPerShare: dividendRate, marginOfSafety };
      }
    }

    // ── Recent analyst upgrades/downgrades (last 5) ────────────────────────
    let recentUpgrades: RecentUpgrade[] | undefined;
    if (!isEtf) {
      const history: any[] = udh.history ?? [];
      if (history.length > 0) {
        recentUpgrades = history.slice(0, 5).map((h: any) => ({
          date: h.epochGradeDate
            ? new Date(h.epochGradeDate * 1000).toISOString().slice(0, 10)
            : undefined,
          firm: h.firm ?? undefined,
          toGrade: h.toGrade ?? undefined,
          fromGrade: h.fromGrade ?? undefined,
          action: h.action ?? undefined,
          targetPrice: typeof h.priceTarget === 'number' ? h.priceTarget
            : (typeof h.currentPriceTarget === 'number' ? h.currentPriceTarget : undefined),
        }));
      }
    }

    // ── ETF data ───────────────────────────────────────────────────────────
    let etf: EtfData | undefined;
    if (isEtf) {
      // Fund performance trailing returns
      const tr = fpe.trailingReturns ?? {};
      const risk = fpe.riskOverviewStatisticsMap?.threeYear ?? fpe.riskOverviewStatistics ?? {};

      // Top holdings
      const holdings: any[] = th.holdings ?? [];
      const topHoldings = holdings.slice(0, 5).map((h: any) => ({
        symbol: h.symbol ?? undefined,
        name: h.holdingName ?? undefined,
        pct: v(h, 'holdingPercent'),
      }));

      // Sector weightings
      const rawSectors: any[] = th.sectorWeightings ?? [];
      const sectorWeightings = rawSectors.flatMap((s: any) =>
        Object.entries(s).map(([sector, val]: [string, any]) => ({
          sector,
          pct: typeof val === 'number' ? val : (val?.raw ?? 0),
        })),
      ).filter((s) => s.pct > 0);

      // Aggregate P/E, P/B, P/S of underlying equity holdings
      const eq = th.equityHoldings ?? {};

      etf = {
        quoteType: instrumentType,
        expenseRatio: v(fp, 'feesExpensesInvestment')
          ?? v(fp?.feesExpensesInvestment, 'annualReportExpenseRatio'),
        totalAssets: v(ks, 'totalAssets') ?? v(pr, 'regularMarketVolume'),
        ytdReturn: v(ks, 'ytdReturn') ?? v(tr, 'ytd'),
        oneYearReturn: v(tr, 'oneYear') ?? v(tr, 'tenYear'), // fallback
        threeYearReturn: v(tr, 'threeYear'),
        fiveYearReturn: v(tr, 'fiveYear'),
        standardDeviation: v(risk, 'standardDeviation') ?? v(risk, 'stdDev'),
        sharpeRatio: v(risk, 'sharpeRatio'),
        alpha: v(risk, 'alpha'),
        beta3Year: v(ks, 'beta3Year') ?? v(risk, 'beta'),
        holdingsPE: v(eq, 'priceToEarnings'),
        holdingsPB: v(eq, 'priceToBook'),
        holdingsPS: v(eq, 'priceToSales'),
        topHoldings,
        sectorWeightings,
        fundFamily: fp.family ?? undefined,
        categoryName: fp.categoryName ?? undefined,
        morningStarRating: v(ks, 'morningStarOverallRating'),
      };
    }

    return {
      ticker: displayTicker,
      market,
      name: qt.longName ?? qt.shortName ?? undefined,
      currency,
      instrumentType,

      currentPrice,
      fiftyTwoWeekLow,
      fiftyTwoWeekHigh: v(sd, 'fiftyTwoWeekHigh'),
      fiftyDayAverage: v(sd, 'fiftyDayAverage'),
      twoHundredDayAverage: v(sd, 'twoHundredDayAverage'),

      trailingPE: v(sd, 'trailingPE'),
      forwardPE: v(sd, 'forwardPE') ?? v(ks, 'forwardPE'),
      priceToBook: v(ks, 'priceToBook'),
      enterpriseToEbitda: v(ks, 'enterpriseToEbitda'),
      pegRatio: v(ks, 'pegRatio'),
      priceToSales: v(sd, 'priceToSalesTrailing12Months'),

      dividendYield: v(sd, 'dividendYield') ?? v(sd, 'trailingAnnualDividendYield') ?? v(ks, 'yield'),
      payoutRatio: v(sd, 'payoutRatio'),

      returnOnEquity: v(fd, 'returnOnEquity'),
      returnOnAssets: v(fd, 'returnOnAssets'),
      profitMargins: v(fd, 'profitMargins') ?? v(ks, 'profitMargins'),
      grossMargins: v(fd, 'grossMargins'),
      ebitdaMargins: v(fd, 'ebitdaMargins'),

      debtToEquity: v(fd, 'debtToEquity'),
      currentRatio: v(fd, 'currentRatio'),
      beta: v(sd, 'beta') ?? v(ks, 'beta'),

      earningsGrowth: v(fd, 'earningsGrowth'),
      revenueGrowth: v(fd, 'revenueGrowth'),

      marketCap: v(pr, 'marketCap') ?? v(sd, 'marketCap'),

      analystTarget,
      grahamValue,
      bazinValue,
      recentUpgrades,
      etf,
    };
  }

  // ── Yahoo crumb helper ─────────────────────────────────────────────────────
  private crumbCache: { crumb: string; cookie: string; fetchedAt: number } | null = null;

  private async getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
    if (this.crumbCache && Date.now() - this.crumbCache.fetchedAt < 30 * 60 * 1000) {
      return { crumb: this.crumbCache.crumb, cookie: this.crumbCache.cookie };
    }

    try {
      const consentRes = await fetch('https://fc.yahoo.com', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      });
      const setCookieHeader = consentRes.headers.get('set-cookie') ?? '';
      const cookieValue = setCookieHeader.split(';')[0] ?? '';

      const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
        headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookieValue },
        signal: AbortSignal.timeout(8000),
      });

      if (!crumbRes.ok) return null;
      const crumb = await crumbRes.text();
      if (!crumb || crumb.includes('<')) return null;

      this.crumbCache = { crumb, cookie: cookieValue, fetchedAt: Date.now() };
      return { crumb, cookie: cookieValue };
    } catch (err) {
      this.logger.warn(`Yahoo crumb fetch failed: ${(err as Error).message}`);
      return null;
    }
  }
}
