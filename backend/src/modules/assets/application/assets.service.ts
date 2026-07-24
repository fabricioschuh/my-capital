import { Injectable, Inject } from '@nestjs/common';
import { ASSET_REPOSITORY, AssetRepository } from '../domain/asset.repository';
import { CreateAssetDto, UpdateAssetDto, TransactionDto, AssetResponseDto } from './dtos/asset.dto';
import { Asset } from '../domain/asset.entity';
import { NotFoundError, ValidationError } from '../../../shared/domain/errors';

@Injectable()
export class AssetsService {
  constructor(
    @Inject(ASSET_REPOSITORY)
    private readonly assetRepository: AssetRepository,
  ) {}

  async findAll(): Promise<AssetResponseDto[]> {
    const assets = await this.assetRepository.findAllActive();
    return assets.map(this.toResponseDto);
  }

  async findById(id: string): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findById(id);
    if (!asset) throw new NotFoundError('Asset', id);
    return this.toResponseDto(asset);
  }

  async findByCategoryId(categoryId: string): Promise<AssetResponseDto[]> {
    const assets = await this.assetRepository.findByCategoryId(categoryId);
    return assets.map(this.toResponseDto);
  }

  async create(dto: CreateAssetDto): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.create({
      ...dto,
      isActive: true,
    });
    return this.toResponseDto(asset);
  }

  async update(id: string, dto: UpdateAssetDto): Promise<AssetResponseDto> {
    const existing = await this.assetRepository.findById(id);
    if (!existing) throw new NotFoundError('Asset', id);

    const updated = await this.assetRepository.update(id, dto);
    return this.toResponseDto(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.assetRepository.findById(id);
    if (!existing) throw new NotFoundError('Asset', id);
    await this.assetRepository.delete(id);
  }

  async transact(id: string, dto: TransactionDto): Promise<AssetResponseDto> {
    const existing = await this.assetRepository.findById(id);
    if (!existing) throw new NotFoundError('Asset', id);

    // Consolidated model: quantity=1, unitPrice=total value
    // BUY adds to the total, SELL subtracts from the total
    const currentTotal = existing.quantity * existing.unitPrice;
    const delta = dto.quantity * dto.pricePerUnit;

    let newTotal: number;
    if (dto.type === 'BUY') {
      newTotal = currentTotal + delta;
    } else {
      if (delta > currentTotal) {
        throw new ValidationError(
          `Cannot sell ${delta} — current balance is ${currentTotal}`,
        );
      }
      newTotal = currentTotal - delta;
    }

    const updated = await this.assetRepository.update(id, {
      quantity: 1,
      unitPrice: parseFloat(newTotal.toFixed(2)),
    });

    return this.toResponseDto(updated);
  }

  private toResponseDto(asset: Asset): AssetResponseDto {
    return {
      id: asset.id,
      categoryId: asset.categoryId,
      name: asset.name,
      ticker: asset.ticker,
      quantity: asset.quantity,
      unitPrice: asset.unitPrice,
      marketPrice: asset.marketPrice,
      marketPriceUpdatedAt: asset.marketPriceUpdatedAt,
      currency: asset.currency,
      broker: asset.broker,
      notes: asset.notes,
      isActive: asset.isActive,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
