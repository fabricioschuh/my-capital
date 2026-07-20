import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './application/exchange.service';
import { FrankfurterProvider } from './infrastructure/frankfurter.provider';
import { MockExchangeProvider } from './infrastructure/mock-exchange.provider';
import { EXCHANGE_RATE_PROVIDER } from './domain/exchange.interface';

@Module({
  controllers: [ExchangeController],
  providers: [
    ExchangeService,
    FrankfurterProvider,
    MockExchangeProvider,
    {
      provide: EXCHANGE_RATE_PROVIDER,
      useFactory: (configService: ConfigService, frankfurter: FrankfurterProvider, mock: MockExchangeProvider) => {
        const provider = configService.get<string>('exchange.provider') ?? 'frankfurter';
        return provider === 'mock' ? mock : frankfurter;
      },
      inject: [ConfigService, FrankfurterProvider, MockExchangeProvider],
    },
  ],
  exports: [ExchangeService],
})
export class ExchangeModule {}
