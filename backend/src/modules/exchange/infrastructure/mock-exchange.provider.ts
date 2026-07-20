import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ExchangeRateProvider, ExchangeRates } from '../domain/exchange.interface';

/**
 * Fallback mock provider for development/testing when external APIs are unavailable
 */
@Injectable()
export class MockExchangeProvider implements ExchangeRateProvider {
  private readonly logger = new Logger(MockExchangeProvider.name);

  async fetchRates(_baseCurrency = 'BRL'): Promise<ExchangeRates> {
    this.logger.warn('Using mock exchange rates - not for production use');
    return {
      USD: 5.42,
      EUR: 6.31,
      updatedAt: new Date().toISOString(),
    };
  }
}
