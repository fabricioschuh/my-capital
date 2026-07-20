import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from '../src/modules/assets/application/assets.service';
import { ASSET_REPOSITORY } from '../src/modules/assets/domain/asset.repository';
import { ValidationError } from '../src/shared/domain/errors';

const baseAsset = {
  id: 'asset-1',
  categoryId: 'cat-1',
  name: 'ITUB3',
  ticker: 'ITUB3',
  quantity: 100,
  unitPrice: 10.0,
  currency: 'BRL' as const,
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('AssetsService.transact()', () => {
  let service: AssetsService;
  const mockRepo = {
    findById: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    findAllActive: jest.fn(),
    findByCategoryId: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: ASSET_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
    jest.clearAllMocks();
  });

  describe('BUY', () => {
    it('calculates weighted average price correctly', async () => {
      // 100 @ R$10 + 50 @ R$12 → 150 @ R$10.6667
      mockRepo.findById.mockResolvedValue(baseAsset);
      mockRepo.update.mockImplementation((id, updates) => ({ ...baseAsset, ...updates }));

      const result = await service.transact('asset-1', {
        type: 'BUY',
        quantity: 50,
        pricePerUnit: 12.0,
      });

      expect(result.quantity).toBe(150);
      // (100*10 + 50*12) / 150 = 10.6666...
      expect(result.unitPrice).toBeCloseTo(10.6667, 4);
      expect(mockRepo.update).toHaveBeenCalledWith('asset-1', {
        quantity: 150,
        unitPrice: expect.closeTo(10.6667, 4),
      });
    });

    it('sets price to buy price when buying into a zero-quantity position', async () => {
      mockRepo.findById.mockResolvedValue({ ...baseAsset, quantity: 0, unitPrice: 0 });
      mockRepo.update.mockImplementation((id, updates) => ({ ...baseAsset, ...updates }));

      const result = await service.transact('asset-1', {
        type: 'BUY',
        quantity: 10,
        pricePerUnit: 55.0,
      });

      expect(result.quantity).toBe(10);
      expect(result.unitPrice).toBe(55.0);
    });

    it('accumulates correctly across same-price buys', async () => {
      mockRepo.findById.mockResolvedValue(baseAsset);
      mockRepo.update.mockImplementation((id, updates) => ({ ...baseAsset, ...updates }));

      const result = await service.transact('asset-1', {
        type: 'BUY',
        quantity: 100,
        pricePerUnit: 10.0,
      });

      expect(result.quantity).toBe(200);
      expect(result.unitPrice).toBe(10.0); // average of same price is same price
    });
  });

  describe('SELL', () => {
    it('reduces quantity and keeps price unchanged', async () => {
      mockRepo.findById.mockResolvedValue(baseAsset);
      mockRepo.update.mockImplementation((id, updates) => ({ ...baseAsset, ...updates }));

      const result = await service.transact('asset-1', {
        type: 'SELL',
        quantity: 30,
        pricePerUnit: 15.0, // sell price is irrelevant to the stored unitPrice
      });

      expect(result.quantity).toBe(70);
      expect(result.unitPrice).toBe(10.0); // unchanged
    });

    it('allows selling the exact available quantity (position zeroed)', async () => {
      mockRepo.findById.mockResolvedValue(baseAsset);
      mockRepo.update.mockImplementation((id, updates) => ({ ...baseAsset, ...updates }));

      const result = await service.transact('asset-1', {
        type: 'SELL',
        quantity: 100,
        pricePerUnit: 12.0,
      });

      expect(result.quantity).toBe(0);
      expect(result.unitPrice).toBe(10.0);
    });

    it('throws ValidationError when selling more than available', async () => {
      mockRepo.findById.mockResolvedValue(baseAsset); // 100 units

      await expect(
        service.transact('asset-1', {
          type: 'SELL',
          quantity: 200,
          pricePerUnit: 12.0,
        }),
      ).rejects.toThrow(ValidationError);

      await expect(
        service.transact('asset-1', {
          type: 'SELL',
          quantity: 200,
          pricePerUnit: 12.0,
        }),
      ).rejects.toThrow('Cannot sell 200 units; only 100 available');
    });

    it('throws NotFoundError for unknown asset id', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.transact('non-existent', { type: 'BUY', quantity: 10, pricePerUnit: 10 }),
      ).rejects.toThrow("Asset with id 'non-existent' not found");
    });
  });
});
