import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ExchangeRateProvider, ExchangeRates } from '../domain/exchange.interface';

/**
 * Frankfurter API (ECB data) - free, no API key required
 * https://www.frankfurter.app/
 */
@Injectable()
export class FrankfurterProvider implements ExchangeRateProvider {
  private readonly logger = new Logger(FrankfurterProvider.name);
  private readonly baseUrl = 'https://api.frankfurter.app';

  async fetchRates(baseCurrency = 'BRL'): Promise<ExchangeRates> {
    this.logger.log(`Fetching exchange rates from Frankfurter API (base: ${baseCurrency})`);

    // Frankfurter doesn't support BRL as base directly for all pairs
    // Fetch BRL/USD and BRL/EUR via indirect cross rates
    const response = await axios.get(`${this.baseUrl}/latest`, {
      params: {
        from: 'USD',
        to: 'BRL,EUR',
      },
      timeout: 10000,
    });

    const usdToBrl: number = response.data.rates['BRL'];
    const usdToEur: number = response.data.rates['EUR'];

    // EUR/BRL = (USD/BRL) / (USD/EUR)
    const eurToBrl = usdToBrl / usdToEur;

    return {
      USD: parseFloat(usdToBrl.toFixed(4)),
      EUR: parseFloat(eurToBrl.toFixed(4)),
      updatedAt: new Date().toISOString(),
    };
  }
}
