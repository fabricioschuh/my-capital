import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { DYNAMODB_DOC_CLIENT } from '../../shared/infrastructure/dynamodb/dynamodb.module';

const TABLE_NAME = 'my-capital-preferences';
const WATCHLIST_KEY = 'watchlist';

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name);

  constructor(
    @Inject(DYNAMODB_DOC_CLIENT)
    private readonly docClient: DynamoDBDocumentClient,
  ) {}

  async getTickers(): Promise<string[]> {
    try {
      const result = await this.docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { id: WATCHLIST_KEY },
        }),
      );
      return (result.Item?.tickers as string[]) ?? [];
    } catch (err) {
      this.logger.warn(`Failed to get watchlist: ${(err as Error).message}`);
      return [];
    }
  }

  async saveTickers(tickers: string[]): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          id: WATCHLIST_KEY,
          tickers,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
  }
}
