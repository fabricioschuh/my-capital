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

export interface CurrencyBreakdown {
  totalBRL: number;
  totalUSD: number;
  totalEUR: number;
}

export interface PortfolioSummary {
  totalValue: number;
  currencyBreakdown: CurrencyBreakdown;
  categories: CategorySummary[];
  exchangeRates: {
    USD: number;
    EUR: number;
    updatedAt: string;
  };
  calculatedAt: string;
}
