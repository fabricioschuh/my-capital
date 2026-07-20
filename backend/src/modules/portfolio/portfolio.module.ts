import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './application/portfolio.service';
import { CategoriesModule } from '../categories/categories.module';
import { AssetsModule } from '../assets/assets.module';
import { ExchangeModule } from '../exchange/exchange.module';

@Module({
  imports: [CategoriesModule, AssetsModule, ExchangeModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}
