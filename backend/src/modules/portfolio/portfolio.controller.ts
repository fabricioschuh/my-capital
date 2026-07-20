import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PortfolioService } from './application/portfolio.service';
import { PortfolioSummary } from './domain/portfolio.types';

@ApiTags('portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get complete portfolio summary with allocation calculations' })
  async getSummary(): Promise<PortfolioSummary> {
    return this.portfolioService.getSummary();
  }
}
