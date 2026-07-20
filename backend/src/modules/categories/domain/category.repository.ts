import { Category } from './category.entity';
import { Repository } from '../../../shared/domain/repository.interface';

export interface CategoryRepository extends Repository<Category> {
  findBySlug(slug: string): Promise<Category | null>;
  findAllActive(): Promise<Category[]>;
}

export const CATEGORY_REPOSITORY = 'CATEGORY_REPOSITORY';
