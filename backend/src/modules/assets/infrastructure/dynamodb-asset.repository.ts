import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { AssetRepository } from '../domain/asset.repository';
import { Asset } from '../domain/asset.entity';
import { DYNAMODB_DOC_CLIENT } from '../../../shared/infrastructure/dynamodb/dynamodb.module';

const TABLE_NAME = 'my-capital-assets';

@Injectable()
export class DynamoDBAssetRepository implements AssetRepository {
  private readonly logger = new Logger(DynamoDBAssetRepository.name);

  constructor(
    @Inject(DYNAMODB_DOC_CLIENT)
    private readonly docClient: DynamoDBDocumentClient,
  ) {}

  async findAll(): Promise<Asset[]> {
    const result = await this.docClient.send(
      new ScanCommand({ TableName: TABLE_NAME }),
    );
    return (result.Items ?? []) as Asset[];
  }

  async findAllActive(): Promise<Asset[]> {
    const all = await this.findAll();
    return all.filter((a) => a.isActive);
  }

  async findById(id: string): Promise<Asset | null> {
    const result = await this.docClient.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { id } }),
    );
    return (result.Item as Asset) ?? null;
  }

  async findByCategoryId(categoryId: string): Promise<Asset[]> {
    // Using scan with filter - in production, use GSI on categoryId
    const result = await this.docClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'categoryId = :categoryId AND isActive = :isActive',
        ExpressionAttributeValues: {
          ':categoryId': categoryId,
          ':isActive': true,
        },
      }),
    );
    return (result.Items ?? []) as Asset[];
  }

  async create(entity: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    const now = new Date().toISOString();
    const item: Asset = {
      id: uuidv4(),
      ...entity,
      createdAt: now,
      updatedAt: now,
    };
    await this.docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return item;
  }

  async update(id: string, updates: Partial<Asset>): Promise<Asset> {
    const now = new Date().toISOString();
    const allUpdates = { ...updates, updatedAt: now };

    const parts: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    Object.entries(allUpdates).forEach(([key, value]) => {
      parts.push(`#${key} = :${key}`);
      names[`#${key}`] = key;
      values[`:${key}`] = value;
    });

    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: `SET ${parts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    return result.Attributes as Asset;
  }

  async delete(id: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }),
    );
  }
}
