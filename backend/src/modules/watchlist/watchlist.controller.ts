import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { WatchlistService } from './watchlist.service';

class SaveWatchlistDto {
  @IsArray()
  @IsString({ each: true })
  tickers: string[];
}

@ApiTags('watchlist')
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get watchlist tickers' })
  async get(): Promise<{ tickers: string[] }> {
    const tickers = await this.watchlistService.getTickers();
    return { tickers };
  }

  @Put()
  @ApiOperation({ summary: 'Save watchlist tickers' })
  async save(@Body() dto: SaveWatchlistDto): Promise<{ tickers: string[] }> {
    await this.watchlistService.saveTickers(dto.tickers);
    return { tickers: dto.tickers };
  }
}
