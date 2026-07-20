import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from '../src/modules/portfolio/application/portfolio.service';
import { CategoriesService } from '../src/modules/categories/application/categories.service';
import { AssetsService } from '../src/modules/assets/application/assets.service';
import { ExchangeService } from '../src/modules/exchange/application/exchange.service';

describe('PortfolioService', () => {
  let service: PortfolioService;

  const mockCategoriesService = {
    findAll: jest.fn(),
  };

  const mockAssetsService = {
    findAll: jest.fn(),
  };

  const mockExchangeService = {
    getRates: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: AssetsService, useValue: mockAssetsService },
        { provide: ExchangeService, useValue: mockExchangeService },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
  });

  it('should calculate portfolio summary correctly', async () => {
    const categoryId = 'cat-1';
    mockCategoriesService.findAll.mockResolvedValue([
      {
        id: categoryId,
        name: 'Brazilian Stocks',
        slug: 'brazilian-stocks',
        targetPercentage: 15,
        order: 1,
        isActive: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ]);

    mockAssetsService.findAll.mockResolvedValue([
      {
        id: 'asset-1',
        categoryId,
        name: 'ITUB3',
        quantity: 100,
        unitPrice: 900,
        currency: 'BRL',
        isActive: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ]);

    mockExchangeService.getRates.mockResolvedValue({
      USD: 5.42,
      EUR: 6.31,
      updatedAt: new Date().toISOString(),
    });

    const summary = await service.getSummary();

    expect(summary.totalValue).toBe(90000);
    expect(summary.categories).toHaveLength(1);
    expect(summary.categories[0].currentPercentage).toBe(100);
    expect(summary.categories[0].targetPercentage).toBe(15);
    expect(summary.categories[0].difference).toBe(85);
  });

  it('should convert USD assets to BRL', async () => {
    const categoryId = 'cat-2';
    mockCategoriesService.findAll.mockResolvedValue([
      {
        id: categoryId,
        name: 'International Stocks',
        slug: 'international-stocks',
        targetPercentage: 15,
        order: 2,
        isActive: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ]);

    mockAssetsService.findAll.mockResolvedValue([
      {
        id: 'asset-2',
        categoryId,
        name: 'AAPL',
        quantity: 10,
        unitPrice: 100,
        currency: 'USD',
        isActive: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ]);

    mockExchangeService.getRates.mockResolvedValue({
      USD: 5.0,
      EUR: 6.0,
      updatedAt: new Date().toISOString(),
    });

    const summary = await service.getSummary();

    // 10 shares * $100 * R$5 = R$5,000
    expect(summary.totalValue).toBe(5000);
    expect(summary.categories[0].total).toBe(5000);
  });

  it('should return empty categories for zero portfolio', async () => {
    mockCategoriesService.findAll.mockResolvedValue([]);
    mockAssetsService.findAll.mockResolvedValue([]);
    mockExchangeService.getRates.mockResolvedValue({
      USD: 5.42,
      EUR: 6.31,
      updatedAt: new Date().toISOString(),
    });

    const summary = await service.getSummary();
    expect(summary.totalValue).toBe(0);
    expect(summary.categories).toHaveLength(0);
  });
});
