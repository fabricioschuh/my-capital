import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CategoriesModule } from './modules/categories/categories.module';
import { AssetsModule } from './modules/assets/assets.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { ExchangeModule } from './modules/exchange/exchange.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { DynamoDBModule } from './shared/infrastructure/dynamodb/dynamodb.module';
import appConfig from './shared/config/app.config';
import awsConfig from './shared/config/aws.config';
import exchangeConfig from './shared/config/exchange.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, awsConfig, exchangeConfig],
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DynamoDBModule,
    CategoriesModule,
    AssetsModule,
    PortfolioModule,
    ExchangeModule,
    WatchlistModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
