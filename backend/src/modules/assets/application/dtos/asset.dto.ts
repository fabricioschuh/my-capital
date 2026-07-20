import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../domain/asset.entity';

export class CreateAssetDto {
  @ApiProperty({ example: 'uuid-of-category' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'Tesouro IPCA+ 2035' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'BCIMB350' })
  @IsOptional()
  @IsString()
  ticker?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 1234.56 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ enum: ['BRL', 'USD', 'EUR'], example: 'BRL' })
  @IsEnum(['BRL', 'USD', 'EUR'])
  currency: Currency;

  @ApiPropertyOptional({ example: 'XP Investimentos' })
  @IsOptional()
  @IsString()
  broker?: string;

  @ApiPropertyOptional({ example: 'Long-term holding' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAssetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ticker?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ enum: ['BRL', 'USD', 'EUR'] })
  @IsOptional()
  @IsEnum(['BRL', 'USD', 'EUR'])
  currency?: Currency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  broker?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  categoryId?: string;
}

export class TransactionDto {
  @ApiProperty({ enum: ['BUY', 'SELL'], example: 'BUY' })
  @IsEnum(['BUY', 'SELL'])
  type: 'BUY' | 'SELL';

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.000001, { message: 'Quantity must be greater than zero' })
  quantity: number;

  @ApiProperty({ example: 38.75 })
  @IsNumber()
  @Min(0, { message: 'Price per unit must be non-negative' })
  pricePerUnit: number;
}

export class AssetResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  ticker?: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiPropertyOptional()
  marketPrice?: number;

  @ApiPropertyOptional()
  marketPriceUpdatedAt?: string;

  @ApiProperty()
  currency: Currency;

  @ApiPropertyOptional()
  broker?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
