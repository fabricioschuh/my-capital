import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Brazilian Stocks' })
  @IsString()
  name: string;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Min(0)
  @Max(100)
  targetPercentage: number;

  @ApiPropertyOptional({ example: 'Stocks listed on B3' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Brazilian Stocks' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  targetPercentage?: number;

  @ApiPropertyOptional({ example: 'Stocks listed on B3' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  targetPercentage: number;

  @ApiProperty()
  order: number;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
