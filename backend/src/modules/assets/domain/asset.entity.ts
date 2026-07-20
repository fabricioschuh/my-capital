import { Entity } from '../../../shared/domain/entity.interface';

export type Currency = 'BRL' | 'USD' | 'EUR';

export interface Asset extends Entity {
  categoryId: string;
  name: string;
  ticker?: string;
  quantity: number;
  unitPrice: number;
  marketPrice?: number;        // Current market price (auto-updated via quotes)
  marketPriceUpdatedAt?: string;
  currency: Currency;
  broker?: string;
  notes?: string;
  isActive: boolean;
}
