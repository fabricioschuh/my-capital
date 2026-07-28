import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ASSET_REPOSITORY } from '../assets/domain/asset.repository';
import { DynamoDBAssetRepository } from '../assets/infrastructure/dynamodb-asset.repository';
import { CATEGORY_REPOSITORY } from '../categories/domain/category.repository';
import { DynamoDBCategoryRepository } from '../categories/infrastructure/dynamodb-category.repository';

@Module({
  controllers: [ImportController],
  providers: [
    ImportService,
    { provide: ASSET_REPOSITORY, useClass: DynamoDBAssetRepository },
    { provide: CATEGORY_REPOSITORY, useClass: DynamoDBCategoryRepository },
  ],
})
export class ImportModule {}
