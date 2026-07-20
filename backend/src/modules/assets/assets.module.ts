import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './application/assets.service';
import { QuotesService } from './application/quotes.service';
import { FundamentalsService } from './application/fundamentals.service';
import { DynamoDBAssetRepository } from './infrastructure/dynamodb-asset.repository';
import { ASSET_REPOSITORY } from './domain/asset.repository';

@Module({
  controllers: [AssetsController],
  providers: [
    AssetsService,
    QuotesService,
    FundamentalsService,
    {
      provide: ASSET_REPOSITORY,
      useClass: DynamoDBAssetRepository,
    },
  ],
  exports: [AssetsService],
})
export class AssetsModule {}
