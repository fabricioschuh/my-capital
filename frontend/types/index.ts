export type Currency = 'BRL' | 'USD' | 'EUR';

export interface Category {
  id: string;
  name: string;
  slug: string;
  targetPercentage: number;
  order: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  categoryId: string;
  name: string;
  ticker?: string;
  quantity: number;
  unitPrice: number;
  marketPrice?: number;
  marketPriceUpdatedAt?: string;
  currency: Currency;
  broker?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  assets: number;
  total: number;
  currentPercentage: number;
  targetPercentage: number;
  difference: number;
  order: number;
}

export interface ExchangeRates {
  USD: number;
  EUR: number;
  updatedAt: string;
}

export interface CurrencyBreakdown {
  totalBRL: number;
  totalUSD: number;
  totalEUR: number;
}

export interface PortfolioSummary {
  totalValue: number;
  currencyBreakdown: CurrencyBreakdown;
  categories: CategorySummary[];
  exchangeRates: ExchangeRates;
  calculatedAt: string;
}

export interface CreateAssetForm {
  categoryId: string;
  name: string;
  ticker?: string;
  quantity: number;
  unitPrice: number;
  currency: Currency;
  broker?: string;
  notes?: string;
}

export interface UpdateAssetForm {
  name?: string;
  ticker?: string;
  quantity?: number;
  unitPrice?: number;
  currency?: Currency;
  broker?: string;
  notes?: string;
  categoryId?: string;
}

export interface TransactionForm {
  assetId: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  pricePerUnit: number;
}

export interface AnalystTarget {
  targetHigh?: number;
  targetLow?: number;
  targetMean?: number;
  targetMedian?: number;
  recommendationKey?: string;
  numberOfAnalysts?: number;
  upsideMean?: number;
}

export interface GrahamValue {
  grahamNumber?: number;
  eps?: number;
  bookValuePerShare?: number;
  marginOfSafety?: number;
}

export interface EtfData {
  quoteType?: string;
  expenseRatio?: number;
  totalAssets?: number;
  ytdReturn?: number;
  oneYearReturn?: number;
  threeYearReturn?: number;
  fiveYearReturn?: number;
  standardDeviation?: number;
  sharpeRatio?: number;
  alpha?: number;
  beta3Year?: number;
  holdingsPE?: number;
  holdingsPB?: number;
  holdingsPS?: number;
  topHoldings?: Array<{ symbol?: string; name?: string; pct?: number }>;
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
  instrumentType?: string;

  currentPrice?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;

  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  enterpriseToEbitda?: number;
  pegRatio?: number;
  priceToSales?: number;

  dividendYield?: number;
  payoutRatio?: number;

  returnOnEquity?: number;
  returnOnAssets?: number;
  profitMargins?: number;
  grossMargins?: number;
  ebitdaMargins?: number;

  debtToEquity?: number;
  currentRatio?: number;
  beta?: number;

  earningsGrowth?: number;
  revenueGrowth?: number;

  marketCap?: number;

  analystTarget?: AnalystTarget;
  grahamValue?: GrahamValue;
  recentUpgrades?: RecentUpgrade[];
  etf?: EtfData;
}

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
  path: string;
}
