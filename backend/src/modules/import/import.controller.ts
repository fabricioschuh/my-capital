import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ImportService, ImportResult } from './import.service';

@ApiTags('import')
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('investidor10')
  @ApiOperation({ summary: 'Import portfolio positions from Investidor10 CSV export' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@UploadedFile() file: Express.Multer.File): Promise<ImportResult> {
    if (!file) throw new BadRequestException('CSV file is required');
    const csvContent = file.buffer.toString('utf-8');
    return this.importService.importInvestidor10Csv(csvContent);
  }
}
