import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AssetsService } from './application/assets.service';
import { QuotesService } from './application/quotes.service';
import { FundamentalsService, FundamentalsResult } from './application/fundamentals.service';
import { CreateAssetDto, UpdateAssetDto, TransactionDto, AssetResponseDto } from './application/dtos/asset.dto';

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly quotesService: QuotesService,
    private readonly fundamentalsService: FundamentalsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all assets' })
  @ApiQuery({ name: 'categoryId', required: false })
  async findAll(@Query('categoryId') categoryId?: string): Promise<AssetResponseDto[]> {
    if (categoryId) {
      return this.assetsService.findByCategoryId(categoryId);
    }
    return this.assetsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  async findById(@Param('id') id: string): Promise<AssetResponseDto> {
    return this.assetsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new asset' })
  async create(@Body() dto: CreateAssetDto): Promise<AssetResponseDto> {
    return this.assetsService.create(dto);
  }

  @Post('refresh-prices')
  @ApiOperation({ summary: 'Refresh market prices for all assets with a ticker' })
  async refreshPrices(): Promise<{ updated: number; failed: number; skipped: number }> {
    return this.quotesService.refreshAll();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an asset' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.assetsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an asset' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.assetsService.delete(id);
  }

  @Patch(':id/transactions')
  @ApiOperation({ summary: 'Record a buy or sell transaction — updates quantity and weighted average price' })
  async transact(
    @Param('id') id: string,
    @Body() dto: TransactionDto,
  ): Promise<AssetResponseDto> {
    return this.assetsService.transact(id, dto);
  }

  @Get('fundamentals/:ticker')
  @ApiOperation({ summary: 'Fetch fundamental data and valuation metrics for a ticker (BR or US)' })
  async fundamentals(@Param('ticker') ticker: string): Promise<FundamentalsResult> {
    return this.fundamentalsService.analyze(ticker);
  }
}
