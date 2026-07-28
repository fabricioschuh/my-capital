import { Injectable, Inject } from '@nestjs/common';
import { ASSET_REPOSITORY, AssetRepository } from '../assets/domain/asset.repository';
import { CATEGORY_REPOSITORY, CategoryRepository } from '../categories/domain/category.repository';

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

type Currency = 'BRL' | 'USD' | 'EUR';
type Indexer = 'CDI' | 'IPCA' | 'Prefixado';

interface ParsedAsset {
  categorySlug: string;
  name: string;
  ticker?: string;
  quantity: number;
  unitPrice: number;
  currency: Currency;
  fiIndexer?: Indexer;
  broker?: string;
  maturityDate?: string;
}

@Injectable()
export class ImportService {
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assetRepo: AssetRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: CategoryRepository,
  ) {}

  async importInvestidor10Csv(csvContent: string): Promise<ImportResult> {
    const result: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };

    const lines = csvContent.split('\n').slice(1).filter((l) => l.trim());
    const parsedAssets: ParsedAsset[] = [];

    for (const line of lines) {
      try {
        const asset = this.parseLine(line);
        if (asset) parsedAssets.push(asset);
        else result.skipped++;
      } catch (e: any) {
        result.errors.push(e.message);
        result.skipped++;
      }
    }

    // Load categories
    const categories = await this.categoryRepo.findAllActive();
    const slugToId = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

    // Load existing assets to detect duplicates by name+categoryId
    const existingAssets = await this.assetRepo.findAllActive();
    const existingMap = new Map(existingAssets.map((a) => [`${a.categoryId}::${a.name}`, a]));

    const now = new Date().toISOString();

    for (const parsed of parsedAssets) {
      const categoryId = slugToId[parsed.categorySlug];
      if (!categoryId) {
        result.errors.push(`Category not found: ${parsed.categorySlug}`);
        result.skipped++;
        continue;
      }

      const key = `${categoryId}::${parsed.name}`;
      const existing = existingMap.get(key);

      if (existing) {
        // Update quantity and price
        await this.assetRepo.update(existing.id, {
          quantity: parsed.quantity,
          unitPrice: parsed.unitPrice,
          ...(parsed.fiIndexer && { fiIndexer: parsed.fiIndexer }),
          ...(parsed.broker && { broker: parsed.broker }),
          ...(parsed.maturityDate && { maturityDate: parsed.maturityDate }),
        });
        result.updated++;
      } else {
        await this.assetRepo.create({
          categoryId,
          name: parsed.name,
          ticker: parsed.ticker,
          quantity: parsed.quantity,
          unitPrice: parsed.unitPrice,
          currency: parsed.currency,
          fiIndexer: parsed.fiIndexer,
          broker: parsed.broker,
          isActive: true,
        });
        result.inserted++;
      }
    }

    return result;
  }

  private parseLine(line: string): ParsedAsset | null {
    const cols = line.split(';');
    const tipo   = cols[0]?.trim();
    const ativo  = cols[1]?.trim();
    const quantRaw = cols[2]?.trim().replace(/\./g, '').replace(',', '.'); // fix milhar separator
    const precoAtualRaw = cols[4]?.trim();
    const saldoRaw = cols[7]?.trim();
    const venc   = cols[9]?.trim() ?? '';

    if (!tipo || !ativo || !saldoRaw) return null;

    const quant = parseFloat(quantRaw ?? '0') || 1;
    const saldo = this.parseBRL(saldoRaw);

    let maturityDate: string | undefined;
    if (venc && venc.toLowerCase() !== 'liquidez diária' && /\d{2}\/\d{2}\/\d{4}/.test(venc)) {
      maturityDate = venc;
    }

    switch (tipo) {
      case 'Ações':
        return { categorySlug: 'brazilian-stocks', name: ativo, ticker: ativo, quantity: quant, unitPrice: this.parseBRL(precoAtualRaw), currency: 'BRL' };

      case 'FIIs':
        if (ativo === 'JURO11') {
          return { categorySlug: 'fixed-income', name: ativo, ticker: ativo, quantity: quant, unitPrice: this.parseBRL(precoAtualRaw), currency: 'BRL', fiIndexer: 'IPCA' };
        }
        return { categorySlug: 'real-estate', name: ativo, ticker: ativo, quantity: quant, unitPrice: this.parseBRL(precoAtualRaw), currency: 'BRL' };

      case 'Stocks': {
        if (ativo === 'SAP') {
          return { categorySlug: 'sap-stocks', name: 'SAP', ticker: 'SAP', quantity: quant, unitPrice: this.parseUSD(precoAtualRaw), currency: 'EUR' };
        }
        return { categorySlug: 'international-stocks', name: ativo, ticker: ativo, quantity: quant, unitPrice: this.parseUSD(precoAtualRaw), currency: 'USD' };
      }

      case 'Reits':
        return { categorySlug: 'international-stocks', name: ativo, ticker: ativo, quantity: quant, unitPrice: this.parseUSD(precoAtualRaw), currency: 'USD' };

      case 'Renda Fixa': {
        const isLiquidez = venc.toLowerCase() === 'liquidez diária' || venc === '';
        const fiIndexer = this.detectIndexer(ativo);
        const parts = ativo.split(' - ');
        const broker = parts.length >= 2 ? parts[1].trim() : undefined;
        return { categorySlug: isLiquidez ? 'daily-liquidity' : 'fixed-income', name: ativo, quantity: 1, unitPrice: saldo, currency: 'BRL', fiIndexer, broker, maturityDate };
      }

      case 'Tesouro Direto': {
        const isSelic = ativo.toUpperCase().includes('SELIC');
        const fiIndexer = isSelic ? 'CDI' : this.detectIndexer(ativo);
        return { categorySlug: isSelic ? 'daily-liquidity' : 'fixed-income', name: ativo, quantity: quant, unitPrice: this.parseBRL(precoAtualRaw) || saldo / quant, currency: 'BRL', fiIndexer, broker: 'Tesouro Direto', maturityDate };
      }

      case 'ETFs Intern.':
        return { categorySlug: 'international-etfs', name: ativo, ticker: ativo, quantity: quant, unitPrice: this.parseUSD(precoAtualRaw), currency: 'USD' };

      case 'Fundos de Invest.':
        return { categorySlug: 'private-pension', name: ativo, quantity: 1, unitPrice: saldo, currency: 'BRL' };

      case 'ETFs': {
        if (ativo === 'HASH11' || ativo === 'BITH11') {
          return { categorySlug: 'cryptocurrencies', name: ativo, ticker: ativo, quantity: quant, unitPrice: this.parseBRL(precoAtualRaw), currency: 'BRL' };
        }
        if (ativo === 'B5P211') {
          return { categorySlug: 'fixed-income', name: ativo, ticker: ativo, quantity: quant, unitPrice: this.parseBRL(precoAtualRaw), currency: 'BRL', fiIndexer: 'IPCA' };
        }
        return { categorySlug: 'brazilian-etfs', name: ativo, ticker: ativo, quantity: quant, unitPrice: this.parseBRL(precoAtualRaw), currency: 'BRL' };
      }

      case 'Outros': {
        const nameUpper = ativo.toUpperCase();
        const currency: Currency = nameUpper.includes('EURO') || ativo === 'Euro - Wise' ? 'EUR' : 'USD';
        // Store saldo in BRL directly (quantity=1, unitPrice=saldo BRL) — avoids double conversion
        return { categorySlug: 'fixed-income-international', name: ativo, quantity: 1, unitPrice: saldo, currency: 'BRL' };
      }

      default:
        throw new Error(`Unknown asset type: "${tipo}" for "${ativo}"`);
    }
  }

  private parseBRL(value: string): number {
    if (!value) return 0;
    return parseFloat(value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
  }

  private parseUSD(value: string): number {
    if (!value) return 0;
    return parseFloat(value.replace('US$', '').replace(/,/g, '').trim()) || 0;
  }

  private detectIndexer(name: string): Indexer {
    const u = name.toUpperCase();
    if (u.includes('IPCA')) return 'IPCA';
    if (u.includes('CDI') || u.includes('PÓS') || u.includes('POS')) return 'CDI';
    return 'Prefixado';
  }
}
