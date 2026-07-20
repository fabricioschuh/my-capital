import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExchangeRates, EXCHANGE_RATE_PROVIDER, ExchangeRateProvider } from '../domain/exchange.interface';

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name);
  private cachedRates: ExchangeRates | null = null;
  private cacheExpiry: Date | null = null;

  constructor(
    @Inject(EXCHANGE_RATE_PROVIDER)
    private readonly provider: ExchangeRateProvider,
    private readonly configService: ConfigService,
  ) {}

  async getRates(forceRefresh = false): Promise<ExchangeRates> {
    if (!forceRefresh && this.isCacheValid()) {
      this.logger.debug('Returning cached exchange rates');
      return this.cachedRates!;
    }

    try {
      this.logger.log('Fetching fresh exchange rates');
      const rates = await this.provider.fetchRates('BRL');
      this.setCache(rates);
      return rates;
    } catch (error) {
      this.logger.error('Failed to fetch exchange rates', error);
      if (this.cachedRates) {
        this.logger.warn('Returning stale cached rates due to fetch failure');
        return this.cachedRates;
      }
      // Last resort fallback
      return { USD: 5.42, EUR: 6.31, updatedAt: new Date().toISOString() };
    }
  }

  async convertToBRL(amount: number, currency: 'USD' | 'EUR' | 'BRL'): Promise<number> {
    if (currency === 'BRL') return amount;
    const rates = await this.getRates();
    return amount * rates[currency];
  }

  private isCacheValid(): boolean {
    return (
      this.cachedRates !== null &&
      this.cacheExpiry !== null &&
      new Date() < this.cacheExpiry
    );
  }

  private setCache(rates: ExchangeRates): void {
    const ttlSeconds = this.configService.get<number>('exchange.cacheTtl') ?? 3600;
    this.cachedRates = rates;
    this.cacheExpiry = new Date(Date.now() + ttlSeconds * 1000);
    this.logger.debug(`Exchange rates cached for ${ttlSeconds}s`);
  }
}
