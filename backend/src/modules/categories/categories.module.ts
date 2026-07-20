import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './application/categories.service';
import { DynamoDBCategoryRepository } from './infrastructure/dynamodb-category.repository';
import { CATEGORY_REPOSITORY } from './domain/category.repository';

@Module({
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    {
      provide: CATEGORY_REPOSITORY,
      useClass: DynamoDBCategoryRepository,
    },
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
