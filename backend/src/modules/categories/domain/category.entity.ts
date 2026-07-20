import { Entity } from '../../../shared/domain/entity.interface';

export interface Category extends Entity {
  name: string;
  slug: string;
  targetPercentage: number;
  order: number;
  isActive: boolean;
  description?: string;
}
