import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExchangeService } from './application/exchange.service';
import { ExchangeRates } from './domain/exchange.interface';

@ApiTags('exchange')
@Controller('exchange-rates')
export class ExchangeController {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Get()
  @ApiOperation({ summary: 'Get current exchange rates (USD and EUR to BRL)' })
  async getRates(): Promise<ExchangeRates> {
    return this.exchangeService.getRates();
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force refresh exchange rates from provider' })
  async refresh(): Promise<ExchangeRates> {
    return this.exchangeService.getRates(true);
  }
}
