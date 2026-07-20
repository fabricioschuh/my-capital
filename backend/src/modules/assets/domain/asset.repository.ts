import { Asset } from './asset.entity';
import { Repository } from '../../../shared/domain/repository.interface';

export interface AssetRepository extends Repository<Asset> {
  findByCategoryId(categoryId: string): Promise<Asset[]>;
  findAllActive(): Promise<Asset[]>;
}

export const ASSET_REPOSITORY = 'ASSET_REPOSITORY';
