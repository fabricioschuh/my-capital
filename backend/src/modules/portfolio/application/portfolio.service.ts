import { Injectable, Logger } from '@nestjs/common';
import { CategoriesService } from '../../categories/application/categories.service';
import { AssetsService } from '../../assets/application/assets.service';
import { ExchangeService } from '../../exchange/application/exchange.service';
import { PortfolioSummary, CategorySummary } from '../domain/portfolio.types';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly assetsService: AssetsService,
    private readonly exchangeService: ExchangeService,
  ) {}

  async getSummary(): Promise<PortfolioSummary> {
    this.logger.log('Calculating portfolio summary');

    const [categories, assets, exchangeRates] = await Promise.all([
      this.categoriesService.findAll(),
      this.assetsService.findAll(),
      this.exchangeService.getRates(),
    ]);

    // Calculate total value in BRL, grouped by category
    const categoryTotals = new Map<string, { total: number; count: number }>();

    let totalNativeBRL = 0;
    let totalNativeUSD = 0;
    let totalNativeEUR = 0;

    for (const asset of assets) {
      // Use market price when available, fall back to cost basis
      const priceToUse = asset.marketPrice ?? asset.unitPrice;
      const nativeValue = asset.quantity * priceToUse;

      if (asset.currency === 'USD') totalNativeUSD += nativeValue;
      else if (asset.currency === 'EUR') totalNativeEUR += nativeValue;
      else totalNativeBRL += nativeValue;

      let valueInBRL = nativeValue;
      if (asset.currency === 'USD') valueInBRL *= exchangeRates.USD;
      else if (asset.currency === 'EUR') valueInBRL *= exchangeRates.EUR;

      const existing = categoryTotals.get(asset.categoryId) ?? { total: 0, count: 0 };
      categoryTotals.set(asset.categoryId, {
        total: existing.total + valueInBRL,
        count: existing.count + 1,
      });
    }

    const totalValue = Array.from(categoryTotals.values()).reduce(
      (sum, { total }) => sum + total,
      0,
    );

    const categorySummaries: CategorySummary[] = categories
      .filter((c) => c.isActive)
      .map((category) => {
        const data = categoryTotals.get(category.id) ?? { total: 0, count: 0 };
        const currentPercentage =
          totalValue > 0 ? parseFloat(((data.total / totalValue) * 100).toFixed(2)) : 0;
        const difference = parseFloat(
          (currentPercentage - category.targetPercentage).toFixed(2),
        );

        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          assets: data.count,
          total: parseFloat(data.total.toFixed(2)),
          currentPercentage,
          targetPercentage: category.targetPercentage,
          difference,
          order: category.order,
        };
      })
      .sort((a, b) => a.order - b.order);

    return {
      totalValue: parseFloat(totalValue.toFixed(2)),
      currencyBreakdown: {
        totalBRL: parseFloat(totalNativeBRL.toFixed(2)),
        totalUSD: parseFloat(totalNativeUSD.toFixed(2)),
        totalEUR: parseFloat(totalNativeEUR.toFixed(2)),
      },
      categories: categorySummaries,
      exchangeRates,
      calculatedAt: new Date().toISOString(),
    };
  }
}
