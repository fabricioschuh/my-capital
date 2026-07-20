export interface ExchangeRates {
  USD: number;
  EUR: number;
  updatedAt: string;
}

export interface ExchangeRateProvider {
  fetchRates(baseCurrency: string): Promise<ExchangeRates>;
}

export const EXCHANGE_RATE_PROVIDER = 'EXCHANGE_RATE_PROVIDER';
